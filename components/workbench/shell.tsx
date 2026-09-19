"use client";

import { useState } from "react";
import Link from "next/link";
import { CodeView } from "@/components/code-view/code-view";
import { PreviewFrame } from "@/components/preview/preview-frame";
import { PublishButton } from "@/components/publish/publish-button";
import { DeleteProjectButton } from "@/components/projects/project-card";
import { isPlanWaitingApproval } from "@/components/workbench/plan-approval";
import { SpecRunner } from "@/components/workbench/spec-runner";
import { ChatThread } from "@/components/workbench/chat-thread";
import { ModifyBox } from "@/components/workbench/modify-box";
import { type ShellStep } from "@/components/workbench/timeline";
import type { ThreadMessage } from "@/lib/workbench/thread";

export type { ShellStep };

export type ShellFile = { path: string; content: string };

type Spec = {
  appName: string;
  features: { id: string; title: string; acceptance: string }[];
  pages: string[];
};

export function WorkbenchShell({
  projectId,
  title,
  prompt,
  spec,
  specStatus,
  codeStatus,
  steps,
  messages,
  files,
  srcDoc,
}: {
  projectId: string;
  title: string;
  prompt: string;
  spec: Spec | null;
  specStatus: string | null;
  codeStatus: string | null;
  steps: ShellStep[];
  messages: ThreadMessage[];
  files: ShellFile[];
  srcDoc: string;
}) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const hasPlan = steps.some((step) => step.key === "plan");
  const showSpecRunner =
    specStatus === "waiting_approval" ||
    codeStatus === "failed" ||
    codeStatus === "running" ||
    (!hasPlan && specStatus !== "done");

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
          <ChatThread
            projectId={projectId}
            messages={messages}
            steps={steps}
            fallbackPrompt={prompt}
          />
          {showSpecRunner ? (
            <SpecRunner
              projectId={projectId}
              initial={spec}
              confirmed={specStatus === "done"}
              codeStatus={codeStatus}
            />
          ) : null}
        </div>
        <div className="border-t border-white/15 bg-neutral-900 p-4">
          <p className="mb-2 text-[11px] tracking-wide text-neutral-500">输入</p>
          <ModifyBox projectId={projectId} locked={steps.some(isPlanWaitingApproval)} />
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
              <PreviewFrame projectId={projectId} srcDoc={srcDoc} className="h-full w-full border-0" />
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
