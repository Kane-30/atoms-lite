import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { approveSpecAndGenerate } from "@/lib/orchestrator/approve-spec";
import { SpecSchema } from "@/lib/schemas/spec";
import { sseResponse } from "@/lib/workbench/live-stream";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

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
    return sseResponse(async (send) => {
      const result = await approveSpecAndGenerate(
        id,
        user.id,
        features,
        (text) => send({ type: "text", text }),
      );
      if (!result) {
        send({ type: "error", message: "not_ready" });
        return;
      }
      send({ type: "done" });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "approve_failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "approve_failed" }, { status: 500 });
  }
}
