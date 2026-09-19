import { conversationBlocks, type ThreadMessage } from "@/lib/workbench/thread";
import { WorkbenchTimeline, type ShellStep } from "@/components/workbench/timeline";

function Bubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  if (role === "user") {
    return (
      <div className="ml-8">
        <p className="mb-1 text-right text-[11px] text-neutral-500">你</p>
        <p className="rounded-2xl rounded-br-md bg-white px-3 py-2 text-sm text-neutral-900">{text}</p>
      </div>
    );
  }
  return (
    <div className="mr-8">
      <p className="mb-1 text-[11px] text-sky-200/80">助手</p>
      <p className="rounded-2xl rounded-bl-md border border-sky-300/40 bg-sky-300/10 px-3 py-2 text-sm text-sky-50">
        {text}
      </p>
    </div>
  );
}

export function ChatThread({
  projectId,
  messages,
  steps,
  fallbackPrompt,
}: {
  projectId: string;
  messages: ThreadMessage[];
  steps: ShellStep[];
  fallbackPrompt: string;
}) {
  const blocks = conversationBlocks(
    messages,
    [...new Set(steps.map((step) => step.roundId))],
    fallbackPrompt,
  );
  if (blocks.length === 0) {
    return <p className="text-sm text-neutral-500">还没有对话。</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block) => {
        if (block.type === "process") {
          return (
            <WorkbenchTimeline
              key={`process-${block.roundId}`}
              projectId={projectId}
              steps={steps.filter((step) => step.roundId === block.roundId)}
            />
          );
        }
        return <Bubble key={block.id} role={block.type} text={block.text} />;
      })}
    </div>
  );
}
