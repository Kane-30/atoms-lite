import { and, eq } from "drizzle-orm";
import { streamSchema } from "@/lib/llm/stream-schema";
import { buildSpecPrompt } from "@/lib/prompts/spec";
import { SpecSchema, type SpecOutput } from "@/lib/schemas/spec";
import { getDb } from "@/lib/db/client";
import { messages, projects, rounds, steps } from "@/lib/db/schema";
import { dedupeText, specStreamText } from "@/lib/workbench/live-stream";

export async function runSpecForProject(
  projectId: string,
  userId: string,
  options?: { pause?: boolean; onText?: (text: string) => void },
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
    .where(and(eq(steps.roundId, project.currentRoundId), eq(steps.key, "spec")))
    .limit(1);
  if (existing[0]?.status === "waiting_approval" || existing[0]?.status === "done") {
    return { step: existing[0], created: false as const };
  }
  if (existing[0]?.status === "running") {
    return { step: existing[0], created: false as const };
  }

  const [round] = await db
    .select()
    .from(rounds)
    .where(eq(rounds.id, project.currentRoundId))
    .limit(1);
  if (!round) return null;

  const [step] = existing[0]
    ? [existing[0]]
    : await db
        .insert(steps)
        .values({
          roundId: round.id,
          seq: 1,
          key: "spec",
          agentRole: "产品经理",
          status: "running",
        })
        .returning();

  if (existing[0]) {
    await db.update(steps).set({ status: "running" }).where(eq(steps.id, step.id));
  }

  const started = Date.now();
  try {
    const push = dedupeText(options?.onText);
    const { object, usage } = await streamSchema({
      schema: SpecSchema,
      prompt: buildSpecPrompt(round.prompt),
      onPartial: (partial) => push(specStreamText(partial)),
    });

    const [saved] = await db
      .update(steps)
      .set({
        status: options?.pause === false ? "done" : "waiting_approval",
        output: object,
        tokensIn: usage.promptTokens ?? 0,
        tokensOut: usage.completionTokens ?? 0,
        durationMs: Date.now() - started,
      })
      .where(eq(steps.id, step.id))
      .returning();

    await db.insert(messages).values({
      projectId,
      roundId: round.id,
      role: "assistant",
      kind: "step",
      content: {
        stepId: saved.id,
        agentRole: "产品经理",
        summary: options?.pause === false
          ? `已拆出 ${object.features.length} 个功能`
          : `已拆出 ${object.features.length} 个功能，等待确认`,
      },
    });

    if (object.appName && project.title !== object.appName) {
      await db
        .update(projects)
        .set({ title: object.appName, updatedAt: new Date() })
        .where(eq(projects.id, projectId));
    }

    return { step: saved, created: true as const, spec: object satisfies SpecOutput };
  } catch (error) {
    await db
      .update(steps)
      .set({
        status: "failed",
        durationMs: Date.now() - started,
        verifyResult: error instanceof Error ? error.message.slice(0, 500) : "spec_failed",
      })
      .where(eq(steps.id, step.id));
    throw error;
  }
}
