import { conversationBlocks, messageText, type ThreadMessage } from "@/lib/workbench/thread";
import { WorkbenchTimeline, type ShellStep } from "@/components/workbench/timeline";

function Bubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  if (role === "user") {
    return (
      <div className="ml-8">
        <p className="mb-1 text-right text-[11px] text-neutral-500">你</p>
      <p className="whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-white px-3 py-2 text-sm text-neutral-900">{text}</p>
      </div>
    );
  }
  return (
    <div className="mr-8">
      <p className="mb-1 text-[11px] text-sky-200/80">助手</p>
      <p className="whitespace-pre-wrap break-words rounded-2xl rounded-bl-md border border-sky-300/40 bg-sky-300/10 px-3 py-2 text-sm text-sky-50">
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
  liveText = "",
  pendingUser = "",
  onText,
  onStreamStart,
  onStreamFinish,
  onStreamReset,
}: {
  projectId: string;
  messages: ThreadMessage[];
  steps: ShellStep[];
  fallbackPrompt: string;
  liveText?: string;
  pendingUser?: string;
  onText?: (text: string) => void;
  onStreamStart?: () => void;
  onStreamFinish?: () => void;
  onStreamReset?: () => void;
}) {
  const blocks = conversationBlocks(
    messages,
    [...new Set(steps.map((step) => step.roundId))],
    fallbackPrompt,
  );
  const pending = pendingUser.trim();
  const pendingShown =
    pending.length > 0 &&
    !messages.some((message) => message.role === "user" && messageText(message.content) === pending);
  if (blocks.length === 0 && !pendingShown && !liveText.trim()) {
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
              onText={onText}
              onStreamStart={onStreamStart}
              onStreamFinish={onStreamFinish}
              onStreamReset={onStreamReset}
            />
          );
        }
        return <Bubble key={block.id} role={block.type} text={block.text} />;
      })}
      {pendingShown ? <Bubble role="user" text={pending} /> : null}
      {liveText.trim() ? <Bubble role="assistant" text={liveText} /> : null}
    </div>
  );
}
