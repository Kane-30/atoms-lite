export type ThreadMessage = {
  id: string;
  role: string;
  roundId: string;
  content: unknown;
};

export type ThreadBlock =
  | { type: "user" | "assistant"; id: string; text: string }
  | { type: "process"; roundId: string };

export function messageText(content: unknown): string {
  if (!content || typeof content !== "object") return "";
  const value = content as { text?: unknown; summary?: unknown };
  if (typeof value.text === "string" && value.text.trim()) return value.text.trim();
  if (typeof value.summary === "string" && value.summary.trim()) return value.summary.trim();
  return "";
}

export function conversationBlocks(
  messages: ThreadMessage[],
  roundIdsWithSteps: string[],
  fallbackPrompt = "",
): ThreadBlock[] {
  const rounds: string[] = [];
  const grouped = new Map<string, ThreadMessage[]>();
  for (const message of messages) {
    if (!grouped.has(message.roundId)) {
      grouped.set(message.roundId, []);
      rounds.push(message.roundId);
    }
    grouped.get(message.roundId)?.push(message);
  }

  if (rounds.length === 0) {
    const prompt = fallbackPrompt.trim();
    if (!prompt) return [];
    const roundId = roundIdsWithSteps[0] ?? "prompt";
    const blocks: ThreadBlock[] = [{ type: "user", id: "prompt", text: prompt }];
    if (roundIdsWithSteps.includes(roundId)) blocks.push({ type: "process", roundId });
    return blocks;
  }

  const stepRounds = new Set(roundIdsWithSteps);
  const blocks: ThreadBlock[] = [];
  for (const roundId of rounds) {
    const lines = grouped.get(roundId) ?? [];
    for (const message of lines) {
      if (message.role !== "user") continue;
      const text = messageText(message.content);
      if (text) blocks.push({ type: "user", id: message.id, text });
    }
    if (stepRounds.has(roundId)) blocks.push({ type: "process", roundId });
    for (const message of lines) {
      if (message.role === "user") continue;
      const text = messageText(message.content);
      if (text) blocks.push({ type: "assistant", id: message.id, text });
    }
  }
  return blocks;
}

export function processStartsOpen(steps: { status: string }[]): boolean {
  return steps.some(
    (step) => step.status === "running" || step.status === "waiting_approval" || step.status === "pending",
  );
}

