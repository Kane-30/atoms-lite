"use client";

import { useState } from "react";

type Props = {
  projectId: string;
};

export function PublishButton({ projectId }: Props) {
  const [pending, setPending] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPublish() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/publish`, {
        method: "POST",
      });
      if (!response.ok) {
        if (response.status === 409) {
          setError("缺少 index.html，还不能发布");
        } else if (response.status === 401) {
          setError("请先登录");
        } else {
          setError("发布失败");
        }
        return;
      }
      const body = (await response.json()) as { slug?: string; url?: string };
      if (!body.url) {
        setError("发布失败");
        return;
      }
      setUrl(body.url);
    } catch {
      setError("发布失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onPublish}
        disabled={pending}
        className="inline-flex h-8 items-center rounded-md bg-white px-3 text-sm font-medium text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "发布中…" : "发布"}
      </button>
      {url ? (
        <a
          href={url}
          className="max-w-[220px] truncate text-xs text-neutral-300 underline"
          target="_blank"
          rel="noreferrer"
        >
          {url}
        </a>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
