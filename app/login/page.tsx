"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthNav } from "@/components/auth/auth-nav";
import { SubmitButton } from "@/components/ui/submit-button";
import { resumePendingPrompt } from "@/lib/resume-prompt";
import { useSubmitLock } from "@/lib/ui/use-submit-lock";

const fieldClass =
  "h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-neutral-100 outline-none placeholder:text-neutral-500 focus:border-white/40 disabled:cursor-not-allowed disabled:opacity-60";

export default function LoginPage() {
  const router = useRouter();
  const { pending, run } = useSubmitLock();
  const [error, setError] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    void run(`login:${email}`, async () => {
      setError("");
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setError("邮箱或密码不对。如果还没注册，请点上方「去注册」。");
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
        <AuthNav mode="login" locked={pending} />
        <h1 className="text-2xl font-semibold">登录 atoms-lite</h1>
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <input className={fieldClass} name="email" type="email" required placeholder="邮箱" disabled={pending} autoComplete="email" />
          <input className={fieldClass} name="password" type="password" required placeholder="密码" disabled={pending} autoComplete="current-password" />
          <SubmitButton pending={pending} idle="登录" busy="正在登录" />
        </form>
        <p className="min-h-5 text-sm" role="status" aria-live="polite">
          {pending ? <span className="text-neutral-400">正在验证，请稍候</span> : null}
          {!pending && error ? <span className="text-red-400">{error}</span> : null}
        </p>
      </main>
    </div>
  );
}
