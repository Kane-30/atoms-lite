import Link from "next/link";
import type { ReactNode } from "react";
import { AccountMenu } from "@/components/auth/account-menu";

export type NavProject = { id: string; title: string };

export function AppFrame({
  active,
  email,
  name,
  recent,
  children,
}: {
  active: "home" | "projects";
  email: string | null;
  name: string | null;
  recent: NavProject[];
  children: ReactNode;
}) {
  const label = name || (email ? email.split("@")[0] : null);
  const item = (href: string, key: "home" | "projects", text: string) => (
    <Link
      href={href}
      className={`block rounded-lg px-3 py-2 text-sm ${
        active === key ? "bg-white/10 text-white" : "text-neutral-300 hover:bg-white/5"
      }`}
    >
      {text}
    </Link>
  );

  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
      <aside className="flex w-60 shrink-0 flex-col border-r border-white/10 px-3 py-4">
        <div className="px-2 text-sm font-semibold">atoms-lite</div>
        <div className="mt-4 truncate px-2 text-xs text-neutral-400">
          {label ? `${label} 的应用` : "未登录"}
        </div>
        <nav className="mt-4 space-y-1">
          {item("/", "home", "首页")}
          {item("/projects", "projects", "我的项目")}
        </nav>
        <div className="mt-6 px-2 text-xs text-neutral-500">最近</div>
        <ul className="mt-2 space-y-1">
          {recent.slice(0, 6).map((project) => (
            <li key={project.id}>
              <Link
                href={`/p/${project.id}`}
                className="block truncate rounded-lg px-3 py-1.5 text-sm text-neutral-300 hover:bg-white/5"
              >
                {project.title}
              </Link>
            </li>
          ))}
          {recent.length === 0 ? (
            <li className="px-3 text-xs text-neutral-500">还没有项目</li>
          ) : null}
        </ul>
        <div className="mt-auto px-2 pt-6">
          {email && label ? (
            <AccountMenu name={label} email={email} />
          ) : (
            <div className="flex gap-3 text-sm text-neutral-300">
              <Link className="underline" href="/login">登录</Link>
              <Link className="underline" href="/register">注册</Link>
            </div>
          )}
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
