import { describe, expect, it } from "vitest";
import {
  blueprintStreamText,
  encodeSse,
  fileStreamText,
  parseSseBuffer,
  planStreamText,
  readEventStream,
  specStreamText,
} from "@/lib/workbench/live-stream";

describe("planStreamText", () => {
  it("grows from goal to the approval question", () => {
    expect(planStreamText({})).toBe("");
    expect(planStreamText({ goal: "做一个记账本" })).toBe("做一个记账本");
    expect(
      planStreamText({
        goal: "做一个记账本",
        scope: ["记一笔", ""],
        approvalQuestion: "就按这个做？",
      }),
    ).toBe("做一个记账本\n记一笔\n就按这个做？");
  });
});

describe("specStreamText", () => {
  it("lists feature titles as they arrive", () => {
    expect(specStreamText({ appName: "记账本", features: [{ title: "记一笔" }] })).toBe(
      "记账本\n记一笔",
    );
    expect(
      specStreamText({
        appName: "记账本",
        features: [{ title: "记一笔", acceptance: "点一下就记上" }],
      }),
    ).toBe("记账本\n记一笔：点一下就记上");
  });
});

describe("blueprintStreamText", () => {
  it("shows the summary and file purposes", () => {
    expect(
      blueprintStreamText({
        summary: "三个文件",
        files: [{ path: "index.html", purpose: "页面" }],
      }),
    ).toBe("三个文件\nindex.html：页面");
  });
});

describe("fileStreamText", () => {
  it("names the file and keeps only the tail of a long body", () => {
    expect(fileStreamText("正在写", "index.html", "")).toBe("正在写 index.html");
    const body = `${"a".repeat(300)}TAIL`;
    const text = fileStreamText("正在改", "app.js", body);
    expect(text.startsWith("正在改 app.js\n")).toBe(true);
    expect(text.endsWith("TAIL")).toBe(true);
    expect(text.length).toBeLessThan(body.length);
  });
});

describe("sse", () => {
  it("round-trips events split across chunks", () => {
    const raw = `${encodeSse({ type: "text", text: "你好" })}${encodeSse({ type: "done" })}`;
    const first = parseSseBuffer(raw.slice(0, 8));
    expect(first.events).toEqual([]);
    const second = parseSseBuffer(first.rest + raw.slice(8));
    expect(second.events).toEqual([
      { type: "text", text: "你好" },
      { type: "done" },
    ]);
    expect(second.rest).toBe("");
  });

  it("reads a text event then done", async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(encodeSse({ type: "text", text: "在写" })));
        controller.enqueue(new TextEncoder().encode(encodeSse({ type: "done" })));
        controller.close();
      },
    });
    const seen: string[] = [];
    const outcome = await readEventStream(new Response(body), (text) => seen.push(text));
    expect(outcome).toEqual({ ok: true });
    expect(seen).toEqual(["在写"]);
  });

  it("surfaces an error event", async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(encodeSse({ type: "error", message: "not_ready" })),
        );
        controller.close();
      },
    });
    const outcome = await readEventStream(new Response(body), () => {});
    expect(outcome).toEqual({ ok: false, message: "not_ready" });
  });
});
