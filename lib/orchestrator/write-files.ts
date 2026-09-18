import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { files as projectFiles } from "@/lib/db/schema";

export async function upsertProjectFiles(
  projectId: string,
  next: { path: string; content: string }[],
): Promise<void> {
  const db = getDb();
  for (const file of next) {
    const [existing] = await db
      .select()
      .from(projectFiles)
      .where(and(eq(projectFiles.projectId, projectId), eq(projectFiles.path, file.path)))
      .limit(1);
    if (existing) {
      await db
        .update(projectFiles)
        .set({ content: file.content, updatedAt: new Date() })
        .where(eq(projectFiles.id, existing.id));
    } else {
      await db.insert(projectFiles).values({
        projectId,
        path: file.path,
        content: file.content,
      });
    }
  }
}
