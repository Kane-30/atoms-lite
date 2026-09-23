"use client";

import { useEffect, useState } from "react";
import { isPlanWaitingApproval, PlanApproval } from "@/components/workbench/plan-approval";
import { processStartsOpen } from "@/lib/workbench/thread";

export type ShellStep = {
  id: string;
  roundId: string;
  seq: number;
  key: string;
  agentRole: string;
  status: string;
  verifyResult: string | null;
  output: unknown;
  changedFiles?: unknown;
};

const STATUS: Record<string, string> = {
  pending: "等待",
  running: "进行中",
  waiting_approval: "等待确认",
  done: "完成",
  failed: "失败",
};

export function stepEventTitle(step: Pick<ShellStep, "key" | "status" | "agentRole">): string {
  switch (step.key) {
    case "plan":
      return step.status === "waiting_approval" ? "等待批准" : "开始";
    case "spec":
      return "整理功能";
    case "blueprint":
      return "定文件";
    case "code":
      return "写文件";
    case "validate":
      return "校验";
    case "modify":
      return "按新要求改文件";
    case "ask":
      return "回答问题";
    default:
      return step.agentRole;
  }
}

function changedFileNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function handledStepCount(steps: ShellStep[]): number {
  return steps.filter((step) => step.status === "done" || step.status === "failed").length;
}

export function WorkbenchTimeline({
  projectId,
  steps,
  onText,
  onStreamStart,
  onStreamFinish,
  onStreamReset,
}: {
  projectId: string;
  steps: ShellStep[];
  onText?: (text: string) => void;
  onStreamStart?: () => void;
  onStreamFinish?: () => void;
  onStreamReset?: () => void;
}) {
  const ordered = [...steps].sort((a, b) => a.seq - b.seq);
  const handled = handledStepCount(ordered);
  const busy = processStartsOpen(ordered);
  const [open, setOpen] = useState(busy);

  useEffect(() => {
    if (busy) setOpen(true);
  }, [busy]);

  return (
    <section className="rounded-xl border border-amber-200/30 bg-amber-200/5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm"
      >
        <span className="font-medium text-amber-100">过程 · 已处理 {handled} 步</span>
        <span className="text-xs text-amber-100/70">{open ? "收起" : "展开"}</span>
      </button>
      {open ? (
        ordered.length === 0 ? (
          <p className="border-t border-amber-200/20 px-3 py-2 text-sm text-neutral-300">还没有开始生成。</p>
        ) : (
          <ol className="space-y-3 border-t border-amber-200/20 px-3 py-3">
            {ordered.map((step, index) => {
              const files =
                step.key === "code" || step.key === "modify"
                  ? changedFileNames(step.changedFiles)
                  : [];
              return (
                <li key={step.id} className="flex gap-3">
                  <div className="flex w-3 shrink-0 flex-col items-center">
                    <span className="mt-2 h-2 w-2 rounded-full bg-amber-200" />
                    {index < ordered.length - 1 ? <span className="mt-1 w-px flex-1 bg-amber-200/30" /> : null}
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="flex justify-between gap-3">
                      <span>{stepEventTitle(step)}</span>
                      <span className="text-neutral-400">{STATUS[step.status] ?? step.status}</span>
                    </div>
                    {files.length > 0 ? (
                      <ul className="mt-2 space-y-1 text-xs text-neutral-400">
                        {files.map((path) => (
                          <li key={path} className="truncate">
                            {path}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {step.verifyResult ? <p className="mt-1 text-neutral-400">{step.verifyResult}</p> : null}
                    {isPlanWaitingApproval(step) ? (
                      <PlanApproval
                        projectId={projectId}
                        output={step.output}
                        onText={onText}
                        onStreamStart={onStreamStart}
                        onStreamFinish={onStreamFinish}
                        onStreamReset={onStreamReset}
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )
      ) : null}
    </section>
  );
}
