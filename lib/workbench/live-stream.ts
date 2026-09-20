export type StreamEvent =
  | { type: "text"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

const PREVIEW_LIMIT = 240;

function recordOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function textOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function planStreamText(partial: unknown): string {
  const value = recordOf(partial);
  const lines: string[] = [];
  const goal = textOf(value.goal);
  if (goal) lines.push(goal);
  const scope = Array.isArray(value.scope) ? value.scope.map(textOf).filter(Boolean) : [];
  if (scope.length > 0) lines.push(scope.join("、"));
  const question = textOf(value.approvalQuestion);
  if (question) lines.push(question);
  return lines.join("\n");
}

export function specStreamText(partial: unknown): string {
  const value = recordOf(partial);
  const lines: string[] = [];
  const appName = textOf(value.appName);
  if (appName) lines.push(appName);
  if (Array.isArray(value.features)) {
    for (const feature of value.features) {
      const item = recordOf(feature);
      const title = textOf(item.title);
      if (!title) continue;
      const acceptance = textOf(item.acceptance);
      lines.push(acceptance ? `${title}：${acceptance}` : title);
    }
  }
  return lines.join("\n");
}

export function blueprintStreamText(partial: unknown): string {
  const value = recordOf(partial);
  const lines: string[] = [];
  const summary = textOf(value.summary);
  if (summary) lines.push(summary);
  if (Array.isArray(value.files)) {
    for (const file of value.files) {
      const item = recordOf(file);
      const path = textOf(item.path);
      if (!path) continue;
      const purpose = textOf(item.purpose);
      lines.push(purpose ? `${path}：${purpose}` : path);
    }
  }
  return lines.join("\n");
}

export function fileStreamText(action: string, path: string, content: string): string {
  const name = path.trim();
  const head = name ? `${action} ${name}` : action;
  const body = content.replace(/\s+$/g, "");
  if (!body) return head;
  const preview = body.length > PREVIEW_LIMIT ? body.slice(-PREVIEW_LIMIT) : body;
  return `${head}\n${preview}`;
}

export function dedupeText(onText?: (text: string) => void) {
  let last = "";
  return (text: string) => {
    if (!onText || !text || text === last) return;
    last = text;
    onText(text);
  };
}

export function encodeSse(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function parseEvent(json: string): StreamEvent | null {
  try {
    const value = JSON.parse(json) as { type?: unknown; text?: unknown; message?: unknown };
    if (value.type === "text" && typeof value.text === "string") {
      return { type: "text", text: value.text };
    }
    if (value.type === "done") return { type: "done" };
    if (value.type === "error") {
      return { type: "error", message: typeof value.message === "string" ? value.message : "failed" };
    }
  } catch {
    return null;
  }
  return null;
}

export function parseSseBuffer(buffer: string): { events: StreamEvent[]; rest: string } {
  const events: StreamEvent[] = [];
  let rest = buffer;
  while (true) {
    const split = rest.indexOf("\n\n");
    if (split < 0) break;
    const raw = rest.slice(0, split);
    rest = rest.slice(split + 2);
    const line = raw
      .split("\n")
      .map((item) => item.trim())
      .find((item) => item.startsWith("data:"));
    if (!line) continue;
    const json = line.slice(line.startsWith("data: ") ? 6 : 5).trim();
    const event = parseEvent(json);
    if (event) events.push(event);
  }
  return { events, rest };
}

export async function readEventStream(
  response: Response,
  onText: (text: string) => void,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const reader = response.body?.getReader();
  if (!reader) return { ok: false, message: "failed" };
  const decoder = new TextDecoder();
  let rest = "";
  let failed: string | null = null;
  let done = false;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    rest += decoder.decode(chunk.value, { stream: true });
    const parsed = parseSseBuffer(rest);
    rest = parsed.rest;
    for (const event of parsed.events) {
      if (event.type === "text") onText(event.text);
      if (event.type === "error") failed = event.message;
      if (event.type === "done") done = true;
    }
  }
  if (failed) return { ok: false, message: failed };
  if (!done) return { ok: false, message: "failed" };
  return { ok: true };
}

export function sseResponse(run: (send: (event: StreamEvent) => void) => Promise<void>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let open = true;
      const send = (event: StreamEvent) => {
        if (!open) return;
        controller.enqueue(encoder.encode(encodeSse(event)));
      };
      try {
        await run(send);
      } catch (error) {
        const message = error instanceof Error ? error.message : "failed";
        send({ type: "error", message });
      } finally {
        open = false;
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
