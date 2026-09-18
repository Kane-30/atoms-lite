"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/ui/submit-button";
import { useSubmitLock } from "@/lib/ui/use-submit-lock";

export type PlanView = {
  goal: string;
  scope: string[];
  outOfScope: string[];
  approvalQuestion: string;
};

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function readPlanOutput(output: unknown): PlanView {
  if (!output || typeof output !== "object") {
    return { goal: "", scope: [], outOfScope: [], approvalQuestion: "" };
  }
  const value = output as Record<string, unknown>;
  return {
    goal: typeof value.goal === "string" ? value.goal : "",
    scope: stringList(value.scope),
    outOfScope: stringList(value.outOfScope),
    approvalQuestion: typeof value.approvalQuestion === "string" ? value.approvalQuestion : "",
  };
}

export function isPlanWaitingApproval(step: { key: string; status: string }) {
  return step.key === "plan" && step.status === "waiting_approval";
}

export function PlanApprovalView({
  plan,
  pending,
  error,
  onApprove,
}: {
  plan: PlanView;
  pending: boolean;
  error: string;
  onApprove: () => void;
}) {
  return (
    <div className="mt-3 space-y-3">
      {plan.goal ? (
        <p>
          <span className="text-neutral-400">目标</span>
          <span className="mt-1 block">{plan.goal}</span>
        </p>
      ) : null}
      {plan.scope.length > 0 ? (
        <div>
          <p className="text-neutral-400">范围内</p>
          <ul className="mt-1 list-disc pl-4">
            {plan.scope.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {plan.outOfScope.length > 0 ? (
        <div>
          <p className="text-neutral-400">明确不做</p>
          <ul className="mt-1 list-disc pl-4">
            {plan.outOfScope.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {plan.approvalQuestion ? <p>{plan.approvalQuestion}</p> : null}
      {error ? <p className="text-red-400">{error}</p> : null}
      <SubmitButton
        type="button"
        variant="inverse"
        pending={pending}
        idle="批准并继续"
        busy="正在执行"
        onClick={onApprove}
      />
    </div>
  );
}

export function PlanApproval({ projectId, output }: { projectId: string; output: unknown }) {
  const router = useRouter();
  const { pending, run } = useSubmitLock();
  const [error, setError] = useState("");
  const plan = readPlanOutput(output);

  function approve() {
    setError("");
    void run(`plan:${projectId}`, async () => {
      const res = await fetch(`/api/projects/${projectId}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        setError("批准失败，请再试一次");
        return false;
      }
      router.refresh();
      return true;
    });
  }

  return <PlanApprovalView plan={plan} pending={pending} error={error} onApprove={approve} />;
}
