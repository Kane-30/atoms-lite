import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { appData, projects } from "@/lib/db/schema";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function withDocId(value: unknown, docId: string): Record<string, unknown> {
  const base = isRecord(value) ? value : {};
  return { ...base, id: docId };
}

function docWhere(projectId: string, collection: string, docId: string) {
  return and(
    eq(appData.projectId, projectId),
    eq(appData.collection, collection),
    eq(appData.docId, docId),
  );
}

export async function userOwnsProject(
  projectId: string,
  userId: string,
): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);
  return Boolean(row);
}

export async function listAppDocs(
  projectId: string,
  collection: string,
): Promise<Record<string, unknown>[]> {
  const db = getDb();
  const rows = await db
    .select({ docId: appData.docId, value: appData.value })
    .from(appData)
    .where(and(eq(appData.projectId, projectId), eq(appData.collection, collection)))
    .orderBy(asc(appData.createdAt));
  return rows.map((row) => withDocId(row.value, row.docId));
}

async function rowsForDoc(projectId: string, collection: string, docId: string) {
  const db = getDb();
  return db
    .select({ id: appData.id, value: appData.value })
    .from(appData)
    .where(docWhere(projectId, collection, docId))
    .orderBy(asc(appData.createdAt));
}

export async function upsertAppDoc(
  projectId: string,
  collection: string,
  docId: string,
  value: unknown,
): Promise<Record<string, unknown>> {
  const db = getDb();
  const stored = withDocId(value, docId);
  const rows = await rowsForDoc(projectId, collection, docId);
  if (rows.length === 0) {
    await db.insert(appData).values({
      projectId,
      collection,
      docId,
      value: stored,
    });
    return stored;
  }

  await db.update(appData).set({ value: stored }).where(eq(appData.id, rows[0].id));
  const extraIds = rows.slice(1).map((row) => row.id);
  if (extraIds.length > 0) {
    await db.delete(appData).where(inArray(appData.id, extraIds));
  }
  return stored;
}

export async function patchAppDoc(
  projectId: string,
  collection: string,
  docId: string,
  patch: unknown,
): Promise<Record<string, unknown> | null> {
  const db = getDb();
  const rows = await rowsForDoc(projectId, collection, docId);
  if (rows.length === 0) return null;

  const next = withDocId(
    { ...withDocId(rows[0].value, docId), ...(isRecord(patch) ? patch : {}) },
    docId,
  );
  await db.update(appData).set({ value: next }).where(eq(appData.id, rows[0].id));
  const extraIds = rows.slice(1).map((row) => row.id);
  if (extraIds.length > 0) {
    await db.delete(appData).where(inArray(appData.id, extraIds));
  }
  return next;
}

export async function removeAppDoc(
  projectId: string,
  collection: string,
  docId: string,
): Promise<void> {
  const db = getDb();
  await db.delete(appData).where(docWhere(projectId, collection, docId));
}
