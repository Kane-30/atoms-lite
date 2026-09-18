"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    if (!res.ok) {
      setError("邮箱或密码不对");
      return;
    }
    router.push("/projects");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">登录 atoms-lite</h1>
      <form className="flex flex-col gap-3" onSubmit={onSubmit}>
        <input className="rounded border px-3 py-2" name="email" type="email" required placeholder="邮箱" />
        <input className="rounded border px-3 py-2" name="password" type="password" required placeholder="密码" />
        <button className="rounded bg-black px-3 py-2 text-white" type="submit">登录</button>
      </form>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </main>
  );
}
