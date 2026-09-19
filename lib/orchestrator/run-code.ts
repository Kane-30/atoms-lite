import { and, eq } from "drizzle-orm";
import { generateObject } from "ai";
import { getDb } from "@/lib/db/client";
import { messages, projects, rounds, steps } from "@/lib/db/schema";
import { flashModel } from "@/lib/llm/client";
import { buildCodePrompt, CODE_PATHS } from "@/lib/prompts/code";
import { CodeFileSchema } from "@/lib/schemas/code";
import { SpecSchema, type SpecOutput } from "@/lib/schemas/spec";
import { assembleSrcdoc } from "@/lib/sandbox/assemble-srcdoc";
import { upsertProjectFiles } from "@/lib/orchestrator/write-files";

function usageTokens(usage: { promptTokens?: number; completionTokens?: number }) {
  return {
    in: usage.promptTokens ?? 0,
    out: usage.completionTokens ?? 0,
  };
}

const FORBIDDEN_CLIENT_STORAGE = /localStorage|sessionStorage|indexedDB/i;
const MAX_REPAIR_ROUNDS = 2;

function indexHtmlSource(files: { path: string; content: string }[]) {
  return files
    .filter((file) => /(^|\/)index\.html$/i.test(file.path.replace(/^\.\//, "")))
    .map((file) => file.content)
    .join("\n");
}

export function problemsOf(files: { path: string; content: string }[], spec: SpecOutput) {
  const assembled = assembleSrcdoc(files);
  const indexHtml = indexHtmlSource(files);
  const missingFeatures = spec.features
    .filter((feature) => !indexHtml.includes(`data-feature="${feature.id}"`))
    .map((feature) => `缺少 data-feature="${feature.id}"`);
  const scripts = files
    .filter((file) => file.path.endsWith(".js"))
    .map((file) => file.content)
    .join("\n");
  const persistence: string[] = [];
  if (scripts && !scripts.includes("atomslite.db")) {
    persistence.push("脚本必须调用 window.atomslite.db");
  }
  if (FORBIDDEN_CLIENT_STORAGE.test(scripts) || FORBIDDEN_CLIENT_STORAGE.test(indexHtml)) {
    persistence.push("禁止使用 localStorage、sessionStorage、indexedDB");
  }
  return {
    html: assembled.html,
    issues: [
      ...assembled.missing.map((path) => `缺少文件引用 ${path}`),
      ...assembled.blockedCdns.map((url) => `外链不在白名单 ${url}`),
      ...missingFeatures,
      ...persistence,
    ],
  };
}

export function outcomeOf(issues: string[]) {
  const ok = issues.length === 0;
  return {
    status: ok ? ("done" as const) : ("failed" as const),
    verifyResult: ok ? "ok" : issues.join("；").slice(0, 500),
  };
}

async function writeOne(
  spec: SpecOutput,
  path: string,
  written: { path: string; content: string }[],
  repair?: string,
) {
  const { object, usage } = await generateObject({
    model: flashModel(),
    schema: CodeFileSchema,
    prompt: buildCodePrompt({ spec, path, written, repair }),
  });
  return {
    file: { path, content: object.content },
    tokens: usageTokens(usage),
  };
}

export async function runCodeForProject(
  projectId: string,
  userId: string,
  spec: SpecOutput,
  paths?: string[],
) {
  const db = getDb();
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);
  if (!project?.currentRoundId) return null;

  const existing = await db
    .select()
    .from(steps)
    .where(and(eq(steps.roundId, project.currentRoundId), eq(steps.key, "code")))
    .limit(1);

  const age = existing[0] ? Date.now() - new Date(existing[0].createdAt).getTime() : 0;
  if (existing[0]?.status === "running" && age < 180_000) {
    return { status: "running" as const, files: [] as { path: string }[] };
  }
  if (existing[0]?.status === "done") {
    return { status: "done" as const, files: [] as { path: string }[] };
  }

  const [step] = existing[0]
    ? [existing[0]]
    : await db
        .insert(steps)
        .values({
          roundId: project.currentRoundId,
          seq: 2,
          key: "code",
          agentRole: "工程师",
          status: "running",
        })
        .returning();

  await db.update(steps).set({ status: "running", attempts: (step.attempts ?? 0) + 1 }).where(eq(steps.id, step.id));

  const started = Date.now();
  try {
    const written: { path: string; content: string }[] = [];
    let tokensIn = 0;
    let tokensOut = 0;
    for (const path of paths?.length ? paths : CODE_PATHS) {
      const result = await writeOne(spec, path, written);
      written.push(result.file);
      tokensIn += result.tokens.in;
      tokensOut += result.tokens.out;
    }

    let check = problemsOf(written, spec);
    for (let round = 0; round < MAX_REPAIR_ROUNDS && check.issues.length > 0; round += 1) {
      const reason = check.issues.join("；");
      const targets = written.filter((file) => /\.(html|js)$/.test(file.path));
      for (const target of targets) {
        const repair = await writeOne(
          spec,
          target.path,
          written.filter((file) => file.path !== target.path),
          reason,
        );
        const index = written.findIndex((file) => file.path === target.path);
        if (index >= 0) written[index] = repair.file;
        tokensIn += repair.tokens.in;
        tokensOut += repair.tokens.out;
      }
      check = problemsOf(written, spec);
    }

    await upsertProjectFiles(projectId, written);
    const outcome = outcomeOf(check.issues);
    const ok = outcome.status === "done";
    const [saved] = await db
      .update(steps)
      .set({
        status: outcome.status,
        output: { paths: written.map((file) => file.path) },
        changedFiles: written.map((file) => file.path),
        tokensIn,
        tokensOut,
        durationMs: Date.now() - started,
        verifyResult: outcome.verifyResult,
      })
      .where(eq(steps.id, step.id))
      .returning();

    await db.insert(steps).values({
      roundId: project.currentRoundId,
      seq: 3,
      key: "validate",
      agentRole: "校验",
      status: ok ? "done" : "failed",
      verifyResult: saved.verifyResult,
      durationMs: 0,
    });

    await db
      .update(rounds)
      .set({ status: ok ? "applied" : "failed" })
      .where(eq(rounds.id, project.currentRoundId));

    await db.insert(messages).values({
      projectId,
      roundId: project.currentRoundId,
      role: "assistant",
      kind: "step",
      content: {
        stepId: saved.id,
        agentRole: "工程师",
        summary: ok ? "三个文件已写完，可以预览" : `写完了，但校验没过：${saved.verifyResult}`,
      },
    });

    return {
      status: saved.status,
      files: written.map((file) => ({ path: file.path })),
      verifyResult: saved.verifyResult,
    };
  } catch (error) {
    await db
      .update(steps)
      .set({
        status: "failed",
        durationMs: Date.now() - started,
        verifyResult: error instanceof Error ? error.message.slice(0, 500) : "code_failed",
      })
      .where(eq(steps.id, step.id));
    throw error;
  }
}

export function parseSpecOutput(output: unknown): SpecOutput | null {
  const parsed = SpecSchema.safeParse(output);
  return parsed.success ? parsed.data : null;
}
