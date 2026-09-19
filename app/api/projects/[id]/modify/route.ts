import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { runModifyForProject } from "@/lib/orchestrator/run-modify";
import { ModifyRequestSchema } from "@/lib/schemas/modify";

export const maxDuration = 300;

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
    const result = await runModifyForProject(id, user.id, parsed.data.prompt);
    if ("error" in result) {
      const status = result.error === "not_found" ? 404 : 409;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "modify_failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "modify_failed" }, { status: 500 });
  }
}
