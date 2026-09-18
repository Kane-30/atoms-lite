import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { runPlanForProject } from "@/lib/orchestrator/run-plan";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const result = await runPlanForProject(id, user.id);
    if (!result) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({
      stepId: result.step.id,
      status: result.step.status,
      output: result.step.output,
      created: result.created,
      model: result.model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "spec_failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "spec_failed" }, { status: 500 });
  }
}
