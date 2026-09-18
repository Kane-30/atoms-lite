"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthNav } from "@/components/auth/auth-nav";
import { SubmitButton } from "@/components/ui/submit-button";
import { resumePendingPrompt } from "@/lib/resume-prompt";
import { useSubmitLock } from "@/lib/ui/use-submit-lock";

const fieldClass =
  "h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-neutral-100 outline-none placeholder:text-neutral-500 focus:border-white/40 disabled:cursor-not-allowed disabled:opacity-60";

export default function RegisterPage() {
  const router = useRouter();
  const { pending, run } = useSubmitLock();
  const [error, setError] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    void run(`register:${email}`, async () => {
      setError("");
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        setError("注册失败。请填写姓名，邮箱不能重复，密码至少 8 位。已有账号请去登录。");
        return false;
      }
      router.push(await resumePendingPrompt());
      router.refresh();
      return true;
    });
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-8">
        <AuthNav mode="register" locked={pending} />
        <h1 className="text-2xl font-semibold">注册 atoms-lite</h1>
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <input className={fieldClass} name="name" required maxLength={40} placeholder="姓名" disabled={pending} autoComplete="name" />
          <input className={fieldClass} name="email" type="email" required placeholder="邮箱" disabled={pending} autoComplete="email" />
          <input className={fieldClass} name="password" type="password" required minLength={8} placeholder="密码（至少 8 位）" disabled={pending} autoComplete="new-password" />
          <SubmitButton pending={pending} idle="注册并登录" busy="正在注册" />
        </form>
        <p className="min-h-5 text-sm" role="status" aria-live="polite">
          {pending ? <span className="text-neutral-400">正在创建账号，请稍候</span> : null}
          {!pending && error ? <span className="text-red-400">{error}</span> : null}
        </p>
      </main>
    </div>
  );
}
