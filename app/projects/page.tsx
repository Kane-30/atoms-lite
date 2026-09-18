import Link from "next/link";
import { redirect } from "next/navigation";
import { destroySession, requireUser } from "@/lib/auth/session";
import { listProjects } from "@/lib/db/projects";

async function logout() {
  "use server";
  await destroySession();
  redirect("/login");
}

export default async function ProjectsPage() {
  let user: { id: string; email: string };
  try {
    user = await requireUser();
  } catch {
    redirect("/login");
  }

  const items = await listProjects(user.id);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">我的项目</h1>
          <p className="text-sm text-neutral-500">{user.email}</p>
        </div>
        <form action={logout}>
          <button className="text-sm underline" type="submit">
            登出
          </button>
        </form>
      </header>
      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">还没有项目。回到首页说一句话即可创建。</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                className="block rounded border px-4 py-3 hover:bg-neutral-50"
                href={`/p/${item.id}`}
              >
                <div className="font-medium">{item.title}</div>
                <div className="text-xs text-neutral-500">{item.status}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link className="text-sm underline" href="/">
        回首页
      </Link>
    </main>
  );
}
