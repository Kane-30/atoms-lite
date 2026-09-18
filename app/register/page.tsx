"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    if (!res.ok) {
      setError("注册失败，邮箱可能已存在或密码不足 8 位");
      return;
    }
    router.push("/projects");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">注册 atoms-lite</h1>
      <form className="flex flex-col gap-3" onSubmit={onSubmit}>
        <input className="rounded border px-3 py-2" name="email" type="email" required placeholder="邮箱" />
        <input className="rounded border px-3 py-2" name="password" type="password" required minLength={8} placeholder="密码（至少 8 位）" />
        <button className="rounded bg-black px-3 py-2 text-white" type="submit">注册并登录</button>
      </form>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </main>
  );
}
