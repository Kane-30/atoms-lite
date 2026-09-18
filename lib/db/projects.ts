import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { messages, projects, rounds } from "@/lib/db/schema";

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

  return { project, rounds: projectRounds, messages: projectMessages };
}
