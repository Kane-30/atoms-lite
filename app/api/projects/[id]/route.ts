import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getProjectForUser } from "@/lib/db/projects";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const project = await getProjectForUser(id, user.id);
    if (!project) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}
