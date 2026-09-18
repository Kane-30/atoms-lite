import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import {
  listAppDocs,
  patchAppDoc,
  removeAppDoc,
  upsertAppDoc,
  userOwnsProject,
} from "@/lib/db/app-data";
import { BRIDGE_METHODS } from "@/lib/sandbox/bridge-protocol";

const Body = z.object({
  method: z.enum(BRIDGE_METHODS),
  collection: z.string().min(1).max(200),
  docId: z.string().min(1).max(200).optional(),
  doc: z.unknown().optional(),
  patch: z.unknown().optional(),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

function isInvalidUuid(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("invalid input syntax for type uuid")
  );
}

async function authorize(projectId: string) {
  const user = await requireUser();
  const owned = await userOwnsProject(projectId, user.id);
  return owned;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const owned = await authorize(id);
    if (!owned) return fail("not_found", 404);

    const collection = new URL(request.url).searchParams.get("collection");
    if (!collection) return fail("missing_collection", 400);
    const data = await listAppDocs(id, collection);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return mapError(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const owned = await authorize(id);
    if (!owned) return fail("not_found", 404);

    const parsed = Body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail("invalid_body", 400);

    const { method, collection, docId, doc, patch } = parsed.data;

    if (method === "list") {
      const data = await listAppDocs(id, collection);
      return NextResponse.json({ ok: true, data });
    }

    if (method === "insert") {
      const raw = doc === undefined ? {} : doc;
      if (!isRecord(raw)) return fail("invalid_doc", 400);
      const fromDoc = typeof raw.id === "string" && raw.id ? raw.id : undefined;
      const docIdToUse = docId ?? fromDoc ?? randomUUID();
      const data = await upsertAppDoc(id, collection, docIdToUse, raw);
      return NextResponse.json({ ok: true, data });
    }

    if (method === "update") {
      if (!docId) return fail("missing_doc_id", 400);
      const raw = patch === undefined ? {} : patch;
      if (!isRecord(raw)) return fail("invalid_patch", 400);
      const data = await patchAppDoc(id, collection, docId, raw);
      return NextResponse.json({ ok: true, data });
    }

    if (!docId) return fail("missing_doc_id", 400);
    await removeAppDoc(id, collection, docId);
    return NextResponse.json({ ok: true, data: null });
  } catch (error) {
    return mapError(error);
  }
}

function mapError(error: unknown) {
  if (isInvalidUuid(error)) return fail("not_found", 404);
  if (error instanceof Error && error.message === "unauthorized") {
    return fail("unauthorized", 401);
  }
  return fail("db_error", 500);
}
