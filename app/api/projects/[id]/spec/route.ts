import { requireUser } from "@/lib/auth/session";
import { runPlanForProject } from "@/lib/orchestrator/run-plan";
import { sseResponse } from "@/lib/workbench/live-stream";
import { NextResponse } from "next/server";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    return sseResponse(async (send) => {
      const result = await runPlanForProject(id, user.id, {
        onText: (text) => send({ type: "text", text }),
      });
      if (!result) {
        send({ type: "error", message: "not_found" });
        return;
      }
      send({ type: "done" });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "spec_failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "spec_failed" }, { status: 500 });
  }
}
