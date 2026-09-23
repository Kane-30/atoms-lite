import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { files as projectFiles, projects, steps } from "@/lib/db/schema";
import { parseSpecOutput, runCodeForProject } from "@/lib/orchestrator/run-code";
import { runBlueprintForProject } from "@/lib/orchestrator/run-blueprint";
import { runSpecForProject } from "@/lib/orchestrator/run-spec";
import {
  BlueprintSchema,
  normalizeBlueprintFiles,
} from "@/lib/schemas/blueprint";
import { SpecSchema, type SpecOutput } from "@/lib/schemas/spec";

export function pathsFromBlueprintStep(output: unknown): string[] | undefined {
  const parsed = BlueprintSchema.safeParse(output);
  if (!parsed.success) return undefined;
  const files = normalizeBlueprintFiles(parsed.data.files);
  const paths = files.map((file) => file.path).filter(Boolean);
  return paths.length > 0 ? paths : undefined;
}

export async function approveSpecAndGenerate(
  projectId: string,
  userId: string,
  features?: SpecOutput["features"],
  onText?: (text: string) => void,
) {
  const db = getDb();
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);
  if (!project?.currentRoundId) return null;

  const [planStep] = await db
    .select()
    .from(steps)
    .where(and(eq(steps.roundId, project.currentRoundId), eq(steps.key, "plan")))
    .limit(1);
  if (planStep?.status === "waiting_approval") {
    await db
      .update(steps)
      .set({ status: "done", approvedAt: new Date() })
      .where(eq(steps.id, planStep.id));
    const specResult = await runSpecForProject(projectId, userId, { pause: false, onText });
    const spec = specResult?.spec ?? parseSpecOutput(specResult?.step.output);
    if (!spec) return null;
    const blueprint = await runBlueprintForProject(projectId, userId, spec, { onText });
    return runCodeForProject(
      projectId,
      userId,
      spec,
      blueprint?.blueprint.files.map((file) => file.path),
      { onText },
    );
  }

  const [specStep] = await db
    .select()
    .from(steps)
    .where(and(eq(steps.roundId, project.currentRoundId), eq(steps.key, "spec")))
    .limit(1);
  if (!specStep) return null;
  if (specStep.status !== "waiting_approval" && specStep.status !== "done") return null;

  const current = parseSpecOutput(specStep.output);
  if (!current) return null;

  let spec = current;
  if (specStep.status === "waiting_approval") {
    spec = SpecSchema.parse({
      ...current,
      features: features ?? current.features,
    });
    await db
      .update(steps)
      .set({ status: "done", approvedAt: new Date(), output: spec })
      .where(eq(steps.id, specStep.id));
  }

  // Retrying code after a failed first pass: reuse the blueprint file list.
  // Only fall back to CODE_PATHS inside runCodeForProject when no blueprint exists.
  const [blueprintStep] = await db
    .select()
    .from(steps)
    .where(and(eq(steps.roundId, project.currentRoundId), eq(steps.key, "blueprint")))
    .limit(1);
  const paths =
    blueprintStep?.status === "done"
      ? pathsFromBlueprintStep(blueprintStep.output)
      : undefined;

  const result = await runCodeForProject(projectId, userId, spec, paths, { onText });
  if (!result) return null;
  if (result.status === "done" && result.files.length === 0) {
    const saved = await db
      .select({ path: projectFiles.path })
      .from(projectFiles)
      .where(eq(projectFiles.projectId, projectId));
    return { ...result, files: saved };
  }
  return result;
}
