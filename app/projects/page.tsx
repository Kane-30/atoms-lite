import { redirect } from "next/navigation";
import { ProjectCard } from "@/components/projects/project-card";
import { AppFrame } from "@/components/shell/app-frame";
import { avatarLabel, displayName } from "@/lib/auth/avatar";
import { requireUser } from "@/lib/auth/session";
import { listProjects } from "@/lib/db/projects";

export default async function ProjectsPage() {
  let user: { id: string; email: string; name: string };
  try {
    user = await requireUser();
  } catch {
    redirect("/login");
  }

  const items = await listProjects(user.id);
  const name = displayName(user.name, user.email);
  const mark = avatarLabel(name);

  return (
    <AppFrame active="projects" email={user.email} name={name} recent={items}>
      <main className="mx-auto max-w-4xl px-8 py-10">
        <div className="h-36 rounded-2xl bg-gradient-to-r from-violet-700 via-fuchsia-600 to-orange-400" />
        <div className="-mt-8 flex items-end gap-4 px-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-neutral-950 bg-violet-600 text-xl font-semibold">
            {mark}
          </div>
          <div className="pb-1">
            <h1 className="text-2xl font-semibold">{name}</h1>
            <p className="text-sm text-neutral-400">{user.email} · {items.length} 个项目</p>
          </div>
        </div>
        <h2 className="mt-10 text-sm text-neutral-300">我的项目</h2>
        {items.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">
            还没有项目。回到首页说一句话即可创建。
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {items.map((item) => (
              <li key={item.id}>
                <ProjectCard
                  id={item.id}
                  title={item.title}
                  meta={`${item.updatedAt.toLocaleDateString("zh-CN")} · 进入对话`}
                  cover
                />
              </li>
            ))}
          </ul>
        )}
      </main>
    </AppFrame>
  );
}
