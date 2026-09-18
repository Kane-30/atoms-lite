"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/ui/submit-button";
import { EXAMPLES, PENDING_PROMPT_KEY } from "@/lib/examples";
import { useSubmitLock } from "@/lib/ui/use-submit-lock";

export function PromptBox() {
  const router = useRouter();
  const { pending, run } = useSubmitLock();
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const value = prompt.trim();
    if (!value) return;
    void run(`prompt:${value}`, async () => {
      setError("");
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: value }),
      });
      if (res.status === 401) {
        sessionStorage.setItem(PENDING_PROMPT_KEY, value);
        router.push("/register");
        return true;
      }
      if (!res.ok) {
        setError("创建失败，请再试一次");
        return false;
      }
      const data = (await res.json()) as { projectId: string };
      sessionStorage.removeItem(PENDING_PROMPT_KEY);
      router.push(`/p/${data.projectId}`);
      return true;
    });
  }

  return (
    <form className="w-full max-w-2xl" onSubmit={onSubmit}>
      <label className="sr-only" htmlFor="prompt">
        你想做什么
      </label>
      <div className="rounded-3xl border border-white/10 bg-neutral-900 p-4 shadow-2xl">
        <textarea
          id="prompt"
          className="min-h-24 w-full resize-none bg-transparent px-2 py-2 text-base text-neutral-100 outline-none placeholder:text-neutral-500 disabled:cursor-not-allowed disabled:opacity-60"
          placeholder="说一句话，比如：帮我做一个记账本"
          value={prompt}
          disabled={pending}
          onChange={(event) => setPrompt(event.target.value)}
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((item) => (
              <button
                key={item.id}
                className="rounded-full bg-white/5 px-3 py-1 text-xs text-neutral-300 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                disabled={pending}
                onClick={() => setPrompt(item.prompt)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <SubmitButton
            pending={pending}
            disabled={prompt.trim().length === 0}
            idle="发送"
            busy="创建中"
            className="h-10 shrink-0 rounded-full px-4"
          />
        </div>
      </div>
      <p className="mt-3 min-h-5 text-sm" role="status" aria-live="polite">
        {pending ? <span className="text-neutral-400">正在处理，请稍候</span> : null}
        {!pending && error ? <span className="text-red-400">{error}</span> : null}
      </p>
    </form>
  );
}
