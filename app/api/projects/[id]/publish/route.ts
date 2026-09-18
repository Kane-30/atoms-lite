import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getProjectForUser } from "@/lib/db/projects";
import { publishProject } from "@/lib/db/publications";

function publishedUrl(slug: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  return `${base}/published/${slug}`;
}

export async function POST(
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

    const result = await publishProject(id);
    if (!result.ok) {
      return NextResponse.json({ error: "no_index" }, { status: 409 });
    }

    return NextResponse.json({
      slug: result.slug,
      url: publishedUrl(result.slug),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "unauthorized") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "publish_failed" }, { status: 500 });
  }
}
