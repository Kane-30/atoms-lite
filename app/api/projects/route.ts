import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createProject, listProjects } from "@/lib/db/projects";

const Body = z.object({
  title: z.string().optional(),
  prompt: z.string().min(1),
});

export async function GET() {
  try {
    const user = await requireUser();
    const items = await listProjects(user.id);
    return NextResponse.json({ projects: items });
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const parsed = Body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    const created = await createProject(
      user.id,
      parsed.data.title ?? "",
      parsed.data.prompt,
    );
    return NextResponse.json(created);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}
