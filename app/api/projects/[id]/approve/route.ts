import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { approveSpecAndGenerate } from "@/lib/orchestrator/approve-spec";
import { SpecSchema } from "@/lib/schemas/spec";

export const maxDuration = 300;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      features?: unknown;
    };
    const features = body.features
      ? SpecSchema.shape.features.parse(body.features)
      : undefined;
    const result = await approveSpecAndGenerate(id, user.id, features);
    if (!result) {
      return NextResponse.json({ error: "not_ready" }, { status: 409 });
    }
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "approve_failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "approve_failed" }, { status: 500 });
  }
}
