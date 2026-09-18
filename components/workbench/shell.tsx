"use client";

import { useState } from "react";
import Link from "next/link";
import { CodeView } from "@/components/code-view/code-view";
import { PreviewFrame } from "@/components/preview/preview-frame";
import { PublishButton } from "@/components/publish/publish-button";
import { DeleteProjectButton } from "@/components/projects/project-card";
import { isPlanWaitingApproval, PlanApproval } from "@/components/workbench/plan-approval";
import { SpecRunner } from "@/components/workbench/spec-runner";

export type ShellStep = {
  id: string;
  seq: number;
  key: string;
  agentRole: string;
  status: string;
  verifyResult: string | null;
  output: unknown;
};

export type ShellFile = { path: string; content: string };

type Spec = {
  appName: string;
  features: { id: string; title: string; acceptance: string }[];
  pages: string[];
};

const STATUS: Record<string, string> = {
  pending: "等待",
  running: "进行中",
  waiting_approval: "等待确认",
  done: "完成",
  failed: "失败",
};

export function WorkbenchShell({
  projectId,
  title,
  prompt,
  roundIndex,
  spec,
  specStatus,
  codeStatus,
  steps,
  files,
  srcDoc,
}: {
  projectId: string;
  title: string;
  prompt: string;
  roundIndex: number;
  spec: Spec | null;
  specStatus: string | null;
  codeStatus: string | null;
  steps: ShellStep[];
  files: ShellFile[];
  srcDoc: string;
}) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const hasPlan = steps.some((step) => step.key === "plan");
  const showSpecRunner = specStatus === "waiting_approval" || spec !== null || !hasPlan;

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100">
      <aside className="flex w-[28%] min-w-[280px] max-w-md flex-col border-r border-white/10">
        <header className="border-b border-white/10 px-4 py-3">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>atoms-lite</span>
            <DeleteProjectButton projectId={projectId} title={title} redirectTo="/projects" />
          </div>
          <h1 className="mt-2 text-base font-semibold">{title}</h1>
        </header>
        <div className="flex-1 space-y-4 overflow-auto px-4 py-4">
          <div className="ml-8 rounded-2xl bg-white/10 px-3 py-2 text-sm">{prompt}</div>
          <div className="space-y-2 text-sm">
            {steps.length === 0 ? (
              <p className="rounded-2xl bg-white/5 px-3 py-2 text-neutral-300">还没有开始生成。</p>
            ) : (
              steps.map((step) => (
                <div key={step.id} className="rounded-2xl bg-white/5 px-3 py-2">
                  <div className="flex justify-between gap-3">
                    <span>{step.agentRole}</span>
                    <span className="text-neutral-400">{STATUS[step.status] ?? step.status}</span>
                  </div>
                  {step.verifyResult ? (
                    <p className="mt-1 text-neutral-400">{step.verifyResult}</p>
                  ) : null}
                  {isPlanWaitingApproval(step) ? (
                    <PlanApproval projectId={projectId} output={step.output} />
                  ) : null}
                </div>
              ))
            )}
          </div>
          {showSpecRunner ? (
            <SpecRunner
              projectId={projectId}
              initial={spec}
              confirmed={specStatus === "done"}
              codeStatus={codeStatus}
            />
          ) : null}
        </div>
        <div className="space-y-3 border-t border-white/10 p-4">
          <div className="rounded-lg bg-white/5 px-3 py-2 text-sm">
            版本 {roundIndex} · {prompt.slice(0, 24)}
          </div>
          <textarea
            disabled
            rows={2}
            placeholder="增量修改还没接上"
            className="w-full resize-none rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-neutral-500"
          />
        </div>
      </aside>
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-sm">
          <div className="flex gap-2">
          {(
            [
              ["preview", "预览"],
              ["code", "代码"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-md px-3 py-1 ${tab === id ? "bg-white text-neutral-900" : "text-neutral-300"}`}
            >
              {label}
            </button>
          ))}
          </div>
          <div className="flex items-center gap-3">
            <PublishButton projectId={projectId} />
            <Link className="text-neutral-300 underline" href="/projects">个人中心</Link>
          </div>
        </div>
        <div className="min-h-0 flex-1 bg-neutral-900">
          {tab === "preview" ? (
            srcDoc ? (
              <PreviewFrame projectId={projectId} srcDoc={srcDoc} className="h-full w-full bg-white" />
            ) : (
              <p className="p-6 text-sm text-neutral-400">确认功能清单后，预览会出现在这里</p>
            )
          ) : null}
          {tab === "code" ? <CodeView files={files} /> : null}
        </div>
      </section>
    </div>
  );
}
