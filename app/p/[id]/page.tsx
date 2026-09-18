import { notFound, redirect } from "next/navigation";
import { WorkbenchShell } from "@/components/workbench/shell";
import { requireUser } from "@/lib/auth/session";
import { getProjectForUser } from "@/lib/db/projects";
import type { SpecOutput } from "@/lib/schemas/spec";
import { assembleSrcdoc } from "@/lib/sandbox/assemble-srcdoc";

function readSpec(output: unknown): SpecOutput | null {
  if (!output || typeof output !== "object") return null;
  const value = output as SpecOutput;
  if (!value.appName || !Array.isArray(value.features)) return null;
  return value;
}

export default async function WorkbenchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let user: { id: string };
  try {
    user = await requireUser();
  } catch {
    redirect("/login");
  }

  const data = await getProjectForUser(id, user.id);
  if (!data) notFound();

  const specStep = data.steps.find((step) => step.key === "spec");
  const codeStep = data.steps.find((step) => step.key === "code");
  const preview = data.files.length > 0 ? assembleSrcdoc(data.files) : null;

  return (
    <WorkbenchShell
      projectId={id}
      title={data.project.title}
      prompt={data.rounds[0]?.prompt ?? ""}
      roundIndex={data.rounds[0]?.index ?? 1}
      spec={readSpec(specStep?.output)}
      specStatus={specStep?.status ?? null}
      codeStatus={codeStep?.status ?? null}
      steps={data.steps.map((step) => ({
        id: step.id,
        seq: step.seq,
        key: step.key,
        agentRole: step.agentRole,
        status: step.status,
        verifyResult: step.verifyResult,
        output: step.output,
      }))}
      files={data.files.map((file) => ({ path: file.path, content: file.content }))}
      srcDoc={preview?.html ?? ""}
    />
  );
}
