import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getProjectForUser } from "@/lib/db/projects";

export default async function WorkbenchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let user: { id: string };
  try {
    user = await requireUser();
  } catch {
    redirect("/login");
  }

  const data = await getProjectForUser(id, user.id);
  if (!data) notFound();

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">{data.project.title}</h1>
      <p className="mt-2 text-sm text-neutral-500">Workbench {id}</p>
      <p className="mt-4 text-sm">轮次 {data.rounds.length} · 消息 {data.messages.length}</p>
    </main>
  );
}
