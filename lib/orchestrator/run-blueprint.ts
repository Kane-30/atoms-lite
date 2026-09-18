import { and, eq } from "drizzle-orm";
import { generateObject } from "ai";
import { getDb } from "@/lib/db/client";
import { messages, projects, steps } from "@/lib/db/schema";
import { flashModel } from "@/lib/llm/client";
import { buildBlueprintPrompt } from "@/lib/prompts/blueprint";
import {
  BlueprintSchema,
  normalizeBlueprintFiles,
  type BlueprintOutput,
} from "@/lib/schemas/blueprint";
import type { SpecOutput } from "@/lib/schemas/spec";

export async function runBlueprintForProject(
  projectId: string,
  userId: string,
  spec: SpecOutput,
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
    .where(and(eq(steps.roundId, project.currentRoundId), eq(steps.key, "blueprint")))
    .limit(1);
  if (existing[0]?.status === "done") {
    const parsed = BlueprintSchema.safeParse(existing[0].output);
    return parsed.success
      ? { step: existing[0], blueprint: { ...parsed.data, files: normalizeBlueprintFiles(parsed.data.files) } }
      : null;
  }

  const [step] = existing[0]
    ? [existing[0]]
    : await db
        .insert(steps)
        .values({
          roundId: project.currentRoundId,
          seq: 3,
          key: "blueprint",
          agentRole: "架构师",
          status: "running",
        })
        .returning();

  const started = Date.now();
  try {
    const { object, usage } = await generateObject({
      model: flashModel(),
      schema: BlueprintSchema,
      prompt: buildBlueprintPrompt(spec),
    });
    const blueprint: BlueprintOutput = {
      ...object,
      files: normalizeBlueprintFiles(object.files),
    };
    const [saved] = await db
      .update(steps)
      .set({
        status: "done",
        output: blueprint,
        tokensIn: usage.promptTokens ?? 0,
        tokensOut: usage.completionTokens ?? 0,
        durationMs: Date.now() - started,
      })
      .where(eq(steps.id, step.id))
      .returning();

    await db.insert(messages).values({
      projectId,
      roundId: project.currentRoundId,
      role: "assistant",
      kind: "step",
      content: {
        stepId: saved.id,
        agentRole: "架构师",
        summary: blueprint.summary,
      },
    });

    return { step: saved, blueprint };
  } catch (error) {
    await db
      .update(steps)
      .set({
        status: "failed",
        durationMs: Date.now() - started,
        verifyResult: error instanceof Error ? error.message.slice(0, 500) : "blueprint_failed",
      })
      .where(eq(steps.id, step.id));
    throw error;
  }
}
