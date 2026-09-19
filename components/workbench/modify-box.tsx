"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/ui/submit-button";
import { useSubmitLock } from "@/lib/ui/use-submit-lock";

export function ModifyBox({ projectId, locked }: { projectId: string; locked: boolean }) {
  const router = useRouter();
  const { pending, run } = useSubmitLock();
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const value = prompt.trim();

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!value || locked) return;
    setError("");
    void run(value, async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/modify`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ prompt: value }),
        });
        if (res.status === 200) {
          setPrompt("");
          router.refresh();
          return false;
        }
        setError(res.status === 409 ? "还不能改，先等当前这步结束" : "没改成");
        return false;
      } catch {
        setError("没改成");
        return false;
      }
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <label className="sr-only" htmlFor="modify-prompt">
        按新要求改
      </label>
      <textarea
        id="modify-prompt"
        rows={2}
        maxLength={2000}
        value={prompt}
        disabled={locked || pending}
        placeholder={locked ? "先批准这一轮计划" : "再说一句，改这个应用"}
        onChange={(event) => setPrompt(event.target.value)}
        className="w-full resize-none rounded-lg border border-neutral-500 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-500 disabled:cursor-not-allowed disabled:text-neutral-500"
      />
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      <div className="mt-2 flex justify-end">
        <SubmitButton
          pending={pending}
          disabled={locked || value.length === 0}
          idle="发送"
          busy="提交中"
          className="h-9 px-3"
        />
      </div>
    </form>
  );
}
