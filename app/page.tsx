import Link from "next/link";
import { PromptBox } from "@/components/landing/prompt-box";
import { ProjectCard } from "@/components/projects/project-card";
import { AppFrame } from "@/components/shell/app-frame";
import { requireUser } from "@/lib/auth/session";
import { listProjects } from "@/lib/db/projects";
import { displayName } from "@/lib/auth/avatar";

export default async function HomePage() {
  let email: string | null = null;
  let name: string | null = null;
  let recent: { id: string; title: string }[] = [];
  try {
    const user = await requireUser();
    email = user.email;
    name = displayName(user.name, user.email);
    recent = await listProjects(user.id);
  } catch {
    email = null;
  }

  return (
    <AppFrame active="home" email={email} name={name} recent={recent}>
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-8 py-16">
        <section className="flex flex-1 flex-col items-center justify-center gap-8">
          <h1 className="text-center text-4xl font-semibold tracking-tight">
            {name ? `你想创造什么，${name}？` : "你想创造什么？"}
          </h1>
          <PromptBox />
        </section>
        <section id="examples" className="mt-16">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-neutral-300">我的项目</span>
            <Link className="text-neutral-400 hover:text-white" href="/projects">查看全部</Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-neutral-500">还没有项目。上面说一句话就能创建。</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {recent.slice(0, 4).map((project) => (
                <li key={project.id}>
                  <ProjectCard id={project.id} title={project.title} meta="进入对话" />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </AppFrame>
  );
}
