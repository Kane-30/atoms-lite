import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  appData,
  files as projectFiles,
  messages,
  projects,
  publications,
  rounds,
  snapshots,
  steps,
} from "@/lib/db/schema";

export async function createProject(
  userId: string,
  title: string,
  initialPrompt: string,
): Promise<{ projectId: string; roundId: string }> {
  const db = getDb();
  const [project] = await db
    .insert(projects)
    .values({
      userId,
      title: title.trim() || initialPrompt.slice(0, 40) || "未命名项目",
      status: "active",
    })
    .returning({ id: projects.id });

  const [round] = await db
    .insert(rounds)
    .values({
      projectId: project.id,
      index: 1,
      prompt: initialPrompt,
      intentKind: "new_app",
      status: "created",
    })
    .returning({ id: rounds.id });

  await db
    .update(projects)
    .set({ currentRoundId: round.id, updatedAt: new Date() })
    .where(eq(projects.id, project.id));

  await db.insert(messages).values({
    projectId: project.id,
    roundId: round.id,
    role: "user",
    kind: "text",
    content: { text: initialPrompt },
  });

  return { projectId: project.id, roundId: round.id };
}

export async function listProjects(userId: string) {
  const db = getDb();
  return db
    .select({
      id: projects.id,
      title: projects.title,
      status: projects.status,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.updatedAt));
}

export async function getProjectForUser(projectId: string, userId: string) {
  const db = getDb();
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project || project.userId !== userId) return null;

  const projectRounds = await db
    .select()
    .from(rounds)
    .where(eq(rounds.projectId, projectId))
    .orderBy(rounds.index);
  const projectMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.projectId, projectId))
    .orderBy(messages.createdAt);

  const roundIds = projectRounds.map((round) => round.id);
  const projectSteps =
    roundIds.length === 0
      ? []
      : await db
          .select()
          .from(steps)
          .where(inArray(steps.roundId, roundIds))
          .orderBy(steps.seq);

  const projectFilesRows = await db
    .select()
    .from(projectFiles)
    .where(eq(projectFiles.projectId, projectId));

  return {
    project,
    rounds: projectRounds,
    messages: projectMessages,
    steps: projectSteps,
    files: projectFilesRows,
  };
}

export async function deleteProjectForUser(projectId: string, userId: string): Promise<boolean> {
  const db = getDb();
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);
  if (!project) return false;

  const projectRounds = await db
    .select({ id: rounds.id })
    .from(rounds)
    .where(eq(rounds.projectId, projectId));
  const roundIds = projectRounds.map((round) => round.id);

  await db.delete(messages).where(eq(messages.projectId, projectId));
  if (roundIds.length > 0) {
    await db.delete(steps).where(inArray(steps.roundId, roundIds));
  }
  await db.delete(snapshots).where(eq(snapshots.projectId, projectId));
  await db.delete(appData).where(eq(appData.projectId, projectId));
  await db.delete(projectFiles).where(eq(projectFiles.projectId, projectId));
  await db.delete(publications).where(eq(publications.projectId, projectId));
  await db.delete(rounds).where(eq(rounds.projectId, projectId));
  await db.delete(projects).where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  return true;
}
