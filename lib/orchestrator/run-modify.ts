import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { files as projectFiles, messages, projects, rounds, steps } from "@/lib/db/schema";
import { streamSchema } from "@/lib/llm/stream-schema";
import { buildModifyPrompt, type ModifyPromptInput } from "@/lib/prompts/modify";
import { ModifyFileSchema, type ModifyFileOutput } from "@/lib/schemas/modify";
import { upsertProjectFiles } from "@/lib/orchestrator/write-files";
import { verifyApplication, type VerifyResult } from "@/lib/verify/verify-application";
import { dedupeText, fileStreamText } from "@/lib/workbench/live-stream";
import { dbCallIssues } from "@/lib/orchestrator/db-call-issues";
import { scriptWiringIssues } from "@/lib/orchestrator/script-wiring";

export const MODIFY_RUNNING_WINDOW_MS = 180_000;
const MAX_MODEL_CALLS = 8;

type FileSnapshot = { path: string; content: string };

export type ModifyGenerateResult = {
  file: ModifyFileOutput;
  tokens: { in: number; out: number };
};

export type GenerateModifyFile = (input: ModifyPromptInput) => Promise<ModifyGenerateResult>;

export type ModifySettlement = {
  code: VerifyResult["code"];
  status: "done" | "failed";
  verifyResult: string;
  summary: string;
  changedFiles: string[];
  after: FileSnapshot[];
};

export type RunModifyResult =
  | { error: "not_found" }
  | { error: "not_ready" }
  | {
      roundId: string;
      roundIndex: number;
      status: "done" | "failed";
      verifyResult: string;
      changedFiles: string[];
    };

export function normalizeModifyPath(path: string): string | null {
  const trimmed = path.trim().replace(/\\/g, "/").replace(/^\.\//, "");
  if (!trimmed || trimmed.startsWith("/") || /[\s?#]/.test(trimmed)) return null;
  const parts = trimmed.split("/");
  if (parts.length < 1 || parts.length > 2) return null;
  if (parts.some((part) => part === "" || part === "." || part === "..")) return null;
  return parts.join("/");
}

export function modifyBlocked(
  currentSteps: { key: string; status: string; createdAt: Date | string }[],
  now = Date.now(),
): boolean {
  return currentSteps.some((step) => {
    if (step.key === "plan" && step.status === "waiting_approval") return true;
    if (step.status !== "running") return false;
    return now - new Date(step.createdAt).getTime() < MODIFY_RUNNING_WINDOW_MS;
  });
}

export function outcomeFromVerify(result: VerifyResult): Pick<
  ModifySettlement,
  "status" | "verifyResult" | "summary"
> {
  if (result.code === "OK") {
    return {
      status: "done",
      verifyResult: "ok",
      summary: `已按这句话改了 ${result.changed.join("、")}`,
    };
  }
  if (result.code === "NO_FILE_CHANGED") {
    return {
      status: "failed",
      verifyResult:
        "未改文件：修改前后无差异。常见原因：需求已实现，或模型未写出有效变更（NO_FILE_CHANGED）",
      summary:
        "这次没有改任何文件（不是系统崩溃）。对照修改前后没有路径或内容差异。常见原因：你的要求当前代码里已经有了，或者模型没写出有效变更。可以再说具体要改哪一块再试。",
    };
  }
  if (result.code === "IDENTICAL_CONTENT") {
    return {
      status: "failed",
      verifyResult:
        "写过文件但实质没变。常见原因：需求已实现，或改动被规范化掉（IDENTICAL_CONTENT）",
      summary:
        "这次写过文件，但规范化后和原来实质相同（不是系统崩溃）。常见原因：需求已实现，或改动只有空白差异。可以再说具体要改哪一块再试。",
    };
  }
  const missing = result.missingAnchors.join("、");
  return {
    status: "failed",
    verifyResult: `改坏了（REGRESSION），丢了 data-feature：${missing}`,
    summary: `改坏了，丢了 data-feature：${missing}`,
  };
}

export function applyWrites(before: FileSnapshot[], writes: FileSnapshot[]): FileSnapshot[] {
  const after = before.map((file) => ({ ...file }));
  for (const write of writes) {
    const key = normalizeModifyPath(write.path) ?? write.path;
    const index = after.findIndex((file) => (normalizeModifyPath(file.path) ?? file.path) === key);
    if (index >= 0) {
      after[index] = { path: after[index].path, content: write.content };
    } else {
      after.push({ path: key, content: write.content });
    }
  }
  return after;
}

export function settleModify(before: FileSnapshot[], writes: FileSnapshot[]): ModifySettlement {
  const after = applyWrites(before, writes);
  const verified = verifyApplication({ before, after, declaredRemovals: [] });
  return {
    code: verified.code,
    ...outcomeFromVerify(verified),
    changedFiles: verified.changed,
    after,
  };
}

function draftProblem(args: {
  path: string;
  content: string;
  stop: boolean;
  before: FileSnapshot[];
  written: FileSnapshot[];
}): string | null {
  const normalized = normalizeModifyPath(args.path);
  if (!normalized) {
    return `路径 ${args.path} 不合法。只能使用不超过两层的相对路径，入口仍是 index.html。`;
  }
  if (!args.content.trim()) {
    return "content 不能为空。请输出该文件改完后的全文。";
  }
  const calls = dbCallIssues(args.content);
  if (calls.length > 0) {
    return `${calls.join("；")}。数据只能走 window.atomslite.db，且第一个参数必须是集合名。`;
  }
  if (args.stop) {
    const after = applyWrites(args.before, [
      ...args.written,
      { path: normalized, content: args.content },
    ]);
    const wiring = scriptWiringIssues(after).filter((issue) => issue.startsWith("缺少文件引用"));
    if (wiring.length > 0) {
      return `${wiring.join("；")}。改 index 时新增的引用必须在同一轮写出来。`;
    }
  }
  return null;
}

export async function collectModifyWrites(
  userPrompt: string,
  before: FileSnapshot[],
  generate: GenerateModifyFile,
): Promise<{ writes: FileSnapshot[]; tokensIn: number; tokensOut: number }> {
  const files = before.map((file) => ({ ...file }));
  const writes: FileSnapshot[] = [];
  let tokensIn = 0;
  let tokensOut = 0;
  let repair: string | undefined;

  for (let call = 0; call < MAX_MODEL_CALLS; call += 1) {
    const result = await generate({
      userPrompt,
      files,
      written: writes.map((file) => ({ ...file })),
      repair,
    });
    tokensIn += result.tokens.in;
    tokensOut += result.tokens.out;
    const draft = result.file;
    if (draft.stop && !draft.path.trim()) break;

    const problem = draftProblem({
      path: draft.path,
      content: draft.content,
      stop: draft.stop,
      before,
      written: writes,
    });
    if (problem) {
      repair = problem;
      continue;
    }

    const normalized = normalizeModifyPath(draft.path);
    if (!normalized) continue;
    const index = files.findIndex((file) => (normalizeModifyPath(file.path) ?? file.path) === normalized);
    const stored =
      index >= 0
        ? { path: files[index].path, content: draft.content }
        : { path: normalized, content: draft.content };
    if (index >= 0) files[index] = stored;
    else files.push(stored);

    const writtenIndex = writes.findIndex(
      (file) => (normalizeModifyPath(file.path) ?? file.path) === normalized,
    );
    if (writtenIndex >= 0) writes[writtenIndex] = stored;
    else writes.push(stored);
    repair = undefined;
    if (draft.stop) break;
  }

  return { writes, tokensIn, tokensOut };
}

async function generateModifyFile(
  input: ModifyPromptInput,
  onText?: (text: string) => void,
): Promise<ModifyGenerateResult> {
  const push = dedupeText(onText);
  const { object, usage } = await streamSchema({
    schema: ModifyFileSchema,
    prompt: buildModifyPrompt(input),
    onPartial: (partial) => {
      const value = partial && typeof partial === "object" ? (partial as { path?: unknown; content?: unknown }) : {};
      const path = typeof value.path === "string" ? value.path : "";
      const content = typeof value.content === "string" ? value.content : "";
      push(fileStreamText("正在改", path, content));
    },
  });
  return {
    file: object,
    tokens: {
      in: usage.promptTokens ?? 0,
      out: usage.completionTokens ?? 0,
    },
  };
}

export function streamingModifyGenerator(onText?: (text: string) => void): GenerateModifyFile {
  return (input) => generateModifyFile(input, onText);
}

export async function runModifyForProject(
  projectId: string,
  userId: string,
  userPrompt: string,
  generate: GenerateModifyFile = generateModifyFile,
): Promise<RunModifyResult> {
  const db = getDb();
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);
  if (!project) return { error: "not_found" };

  const currentSteps = project.currentRoundId
    ? await db.select().from(steps).where(eq(steps.roundId, project.currentRoundId))
    : [];
  if (modifyBlocked(currentSteps)) return { error: "not_ready" };

  const [latest] = await db
    .select({ index: rounds.index })
    .from(rounds)
    .where(eq(rounds.projectId, projectId))
    .orderBy(desc(rounds.index))
    .limit(1);
  const roundIndex = (latest?.index ?? 0) + 1;

  const [round] = await db
    .insert(rounds)
    .values({
      projectId,
      index: roundIndex,
      prompt: userPrompt,
      intentKind: "modify",
      status: "created",
    })
    .returning({ id: rounds.id, index: rounds.index });

  await db
    .update(projects)
    .set({ currentRoundId: round.id, updatedAt: new Date() })
    .where(eq(projects.id, projectId));

  await db.insert(messages).values({
    projectId,
    roundId: round.id,
    role: "user",
    kind: "text",
    content: { text: userPrompt },
  });

  const [step] = await db
    .insert(steps)
    .values({
      roundId: round.id,
      seq: 1,
      key: "modify",
      agentRole: "工程师",
      status: "running",
      attempts: 1,
    })
    .returning();

  const started = Date.now();
  try {
    const before = await db
      .select({ path: projectFiles.path, content: projectFiles.content })
      .from(projectFiles)
      .where(eq(projectFiles.projectId, projectId));

    const collected = await collectModifyWrites(userPrompt, before, generate);
    if (collected.writes.length > 0) {
      await upsertProjectFiles(projectId, collected.writes);
    }
    const settled = settleModify(before, collected.writes);
    const verifyResult = settled.verifyResult.slice(0, 500);

    await db
      .update(steps)
      .set({
        status: settled.status,
        output: { paths: settled.changedFiles },
        changedFiles: settled.changedFiles,
        tokensIn: collected.tokensIn,
        tokensOut: collected.tokensOut,
        durationMs: Date.now() - started,
        verifyResult,
      })
      .where(eq(steps.id, step.id));

    await db
      .update(rounds)
      .set({ status: settled.status === "done" ? "applied" : "failed" })
      .where(eq(rounds.id, round.id));

    await db.insert(messages).values({
      projectId,
      roundId: round.id,
      role: "assistant",
      kind: "step",
      content: {
        stepId: step.id,
        agentRole: "工程师",
        summary: settled.summary,
      },
    });

    return {
      roundId: round.id,
      roundIndex: round.index,
      status: settled.status,
      verifyResult,
      changedFiles: settled.changedFiles,
    };
  } catch (error) {
    await db
      .update(steps)
      .set({
        status: "failed",
        durationMs: Date.now() - started,
        verifyResult: error instanceof Error ? error.message.slice(0, 500) : "modify_failed",
      })
      .where(eq(steps.id, step.id));
    await db.update(rounds).set({ status: "failed" }).where(eq(rounds.id, round.id));
    throw error;
  }
}
