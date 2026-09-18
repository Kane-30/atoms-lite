import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { files, publications } from "@/lib/db/schema";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const MAX_SLUG_ATTEMPTS = 8;

export function generateSlug(): string {
  const length = 8 + (randomBytes(1)[0] % 5);
  const bytes = randomBytes(length);
  let slug = "";
  for (let i = 0; i < length; i += 1) {
    slug += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return slug;
}

function hasIndexHtml(paths: string[]): boolean {
  return paths.some((path) => {
    const normalized = path.replace(/^\.\//, "");
    return normalized === "index.html" || normalized.endsWith("/index.html");
  });
}

function isUniqueViolation(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const record = current as {
      code?: string;
      message?: string;
      cause?: unknown;
    };
    if (record.code === "23505") return true;
    if (
      typeof record.message === "string" &&
      record.message.includes("duplicate key")
    ) {
      return true;
    }
    current = record.cause;
  }
  return false;
}

async function findSlugByProject(projectId: string): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select({ slug: publications.slug })
    .from(publications)
    .where(eq(publications.projectId, projectId))
    .limit(1);
  return row?.slug ?? null;
}

export async function publishProject(
  projectId: string,
): Promise<{ ok: true; slug: string } | { ok: false; reason: "no_index" }> {
  const existing = await findSlugByProject(projectId);
  if (existing) return { ok: true, slug: existing };

  const db = getDb();
  const rows = await db
    .select({ path: files.path })
    .from(files)
    .where(eq(files.projectId, projectId));
  if (!hasIndexHtml(rows.map((row) => row.path))) {
    return { ok: false, reason: "no_index" };
  }

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
    const again = await findSlugByProject(projectId);
    if (again) return { ok: true, slug: again };

    const slug = generateSlug();
    try {
      await db.insert(publications).values({
        projectId,
        slug,
        isPublic: true,
      });
      return { ok: true, slug };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }

  throw new Error("publish_slug_exhausted");
}

export async function getPublishedFiles(
  slug: string,
): Promise<{ projectId: string; files: { path: string; content: string }[] } | null> {
  const db = getDb();
  const [pub] = await db
    .select({
      projectId: publications.projectId,
      isPublic: publications.isPublic,
    })
    .from(publications)
    .where(eq(publications.slug, slug))
    .limit(1);
  if (!pub || !pub.isPublic) return null;

  const rows = await db
    .select({ path: files.path, content: files.content })
    .from(files)
    .where(eq(files.projectId, pub.projectId));
  return { projectId: pub.projectId, files: rows };
}
