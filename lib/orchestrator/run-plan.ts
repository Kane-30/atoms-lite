import { and, eq } from "drizzle-orm";
import { generateObject } from "ai";
import { flashModel } from "@/lib/llm/client";
import { buildPlanPrompt } from "@/lib/prompts/plan";
import { PlanSchema, type PlanOutput } from "@/lib/schemas/plan";
import { getDb } from "@/lib/db/client";
import { messages, projects, rounds, steps } from "@/lib/db/schema";

export async function runPlanForProject(projectId: string, userId: string) {
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
    .where(and(eq(steps.roundId, project.currentRoundId), eq(steps.key, "plan")))
    .limit(1);
  if (
    existing[0]?.status === "waiting_approval" ||
    existing[0]?.status === "done" ||
    existing[0]?.status === "running"
  ) {
    return { step: existing[0], created: false as const, model: "deepseek-flash" };
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
          key: "plan",
          agentRole: "团队领导",
          status: "running",
        })
        .returning();

  if (existing[0]) {
    await db.update(steps).set({ status: "running" }).where(eq(steps.id, step.id));
  }

  const started = Date.now();
  try {
    const { object, usage } = await generateObject({
      model: flashModel(),
      schema: PlanSchema,
      prompt: buildPlanPrompt(round.prompt),
    });

    const [saved] = await db
      .update(steps)
      .set({
        status: "waiting_approval",
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
        agentRole: "团队领导",
        summary: object.approvalQuestion,
      },
    });

    return {
      step: saved,
      created: true as const,
      plan: object satisfies PlanOutput,
      model: process.env.LLM_MODEL_FLASH ?? "deepseek-flash",
    };
  } catch (error) {
    await db
      .update(steps)
      .set({
        status: "failed",
        durationMs: Date.now() - started,
        verifyResult: error instanceof Error ? error.message.slice(0, 500) : "plan_failed",
      })
      .where(eq(steps.id, step.id));
    throw error;
  }
}
