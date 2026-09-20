import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { runModifyForProject, streamingModifyGenerator } from "@/lib/orchestrator/run-modify";
import { ModifyRequestSchema } from "@/lib/schemas/modify";
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
    const body = await request.json().catch(() => null);
    const parsed = ModifyRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_prompt" }, { status: 400 });
    }
    return sseResponse(async (send) => {
      const result = await runModifyForProject(
        id,
        user.id,
        parsed.data.prompt,
        streamingModifyGenerator((text) => send({ type: "text", text })),
      );
      if ("error" in result) {
        send({ type: "error", message: result.error });
        return;
      }
      send({ type: "done" });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "modify_failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "modify_failed" }, { status: 500 });
  }
}
