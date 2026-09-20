"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/ui/submit-button";
import { useSubmitLock } from "@/lib/ui/use-submit-lock";
import { readEventStream } from "@/lib/workbench/live-stream";

type Feature = { id: string; title: string; acceptance: string };
type Spec = { appName: string; features: Feature[]; pages: string[] };

export function SpecRunner({
  projectId,
  initial,
  confirmed,
  codeStatus,
  onText,
  onStreamStart,
  onStreamFinish,
  onStreamReset,
}: {
  projectId: string;
  initial: Spec | null;
  confirmed: boolean;
  codeStatus: string | null;
  onText?: (text: string) => void;
  onStreamStart?: () => void;
  onStreamFinish?: () => void;
  onStreamReset?: () => void;
}) {
  const router = useRouter();
  const { pending, run } = useSubmitLock();
  const [spec, setSpec] = useState<Spec | null>(initial);
  const [error, setError] = useState("");
  const [kept, setKept] = useState<string[]>(() => initial?.features.map((feature) => feature.id) ?? []);
  const [phase, setPhase] = useState<"spec" | "writing" | "done">(
    codeStatus === "done" || codeStatus === "failed" ? "done" : codeStatus === "running" ? "writing" : "spec",
  );
  const started = useRef(false);

  useEffect(() => {
    if (initial || started.current) return;
    started.current = true;
    onStreamStart?.();
    void run(`spec:${projectId}`, async () => {
      const res = await fetch(`/api/projects/${projectId}/spec`, { method: "POST" });
      if (!res.ok) {
        onStreamReset?.();
        setError("需求拆解失败，请刷新再试一次");
        return false;
      }
      const outcome = await readEventStream(res, (text) => onText?.(text));
      if (!outcome.ok) {
        onStreamReset?.();
        setError("需求拆解失败，请刷新再试一次");
        return false;
      }
      onStreamFinish?.();
      router.refresh();
      return false;
    });
  }, [initial, onStreamFinish, onStreamReset, onStreamStart, onText, projectId, router, run]);

  function toggle(id: string) {
    setKept((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function confirm() {
    if (!spec) return;
    const features = spec.features.filter((feature) => kept.includes(feature.id));
    if (features.length === 0) return;
    setPhase("writing");
    setError("");
    onStreamStart?.();
    void run(`approve:${projectId}`, async () => {
      const res = await fetch(`/api/projects/${projectId}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ features }),
      });
      if (!res.ok) {
        onStreamReset?.();
        setPhase("spec");
        setError("写代码失败，请再确认一次");
        return false;
      }
      const outcome = await readEventStream(res, (text) => onText?.(text));
      if (!outcome.ok) {
        onStreamReset?.();
        setPhase("spec");
        setError("写代码失败，请再确认一次");
        return false;
      }
      setPhase("done");
      onStreamFinish?.();
      router.refresh();
      return false;
    });
  }

  if (!spec || phase === "writing" || pending && phase !== "done") {
    const writing = phase === "writing" || (pending && spec);
    return (
      <section className="rounded-xl border border-white/10 p-4" aria-busy="true" role="status">
        <p className="text-sm text-neutral-400">
          {writing ? "工程师 · 正在写代码" : "产品经理 · 正在拆解需求"}
        </p>
        <div className="mt-4 h-2 w-40 animate-pulse rounded bg-white/10" />
        <p className="mt-3 text-sm text-neutral-400">
          {error || (writing ? "正在生成页面、样式和脚本，通常要一分钟左右" : "正在生成功能清单，请稍候")}
        </p>
      </section>
    );
  }

  if (confirmed || phase === "done") {
    return (
      <section className="rounded-xl border border-white/10 p-4">
        <p className="text-sm text-neutral-400">产品经理 · 已确认</p>
        <h2 className="mt-1 text-lg font-semibold">{spec.appName}</h2>
        {codeStatus === "failed" ? (
          <div className="mt-4">
            <p className="text-sm text-red-400">{error || "代码没写完，可以再试一次"}</p>
            <div className="mt-3">
              <SubmitButton type="button" pending={pending} idle="重新生成代码" busy="正在重试" variant="inverse" onClick={confirm} />
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-white/10 p-4">
      <p className="text-sm text-neutral-400">产品经理 · 等待确认</p>
      <h2 className="mt-1 text-lg font-semibold">{spec.appName}</h2>
      <ul className="mt-4 flex flex-col gap-3">
        {spec.features.map((feature) => (
          <li key={feature.id}>
            <label className="flex gap-3 rounded-lg bg-white/5 px-3 py-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={kept.includes(feature.id)}
                disabled={pending}
                onChange={() => toggle(feature.id)}
              />
              <span>
                <span className="block font-medium">{feature.title}</span>
                <span className="block text-sm text-neutral-400">{feature.acceptance}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      <div className="mt-4">
        <SubmitButton
          type="button"
          variant="inverse"
          pending={pending}
          disabled={kept.length === 0}
          idle="确认并开始写代码"
          busy="正在写代码"
          onClick={confirm}
        />
      </div>
    </section>
  );
}
