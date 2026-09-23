import { describe, expect, it } from "vitest";
import { classifyWorkbenchIntent } from "@/lib/orchestrator/intent";

describe("classifyWorkbenchIntent", () => {
  it("always uses the model when provided", async () => {
    const decided = await classifyWorkbenchIntent("这个导数功能怎么用？", async () => ({
      intent: "ask",
      reason: "在问用法",
    }));
    expect(decided).toEqual({ intent: "ask", source: "model", reason: "在问用法" });
  });

  it("uses the model for hard modify phrases too", async () => {
    const decided = await classifyWorkbenchIntent("加一个退格按钮", async () => ({
      intent: "modify",
      reason: "要求改文件",
    }));
    expect(decided).toEqual({ intent: "modify", source: "model", reason: "要求改文件" });
  });

  it("defaults to modify when no model is provided", async () => {
    const decided = await classifyWorkbenchIntent("界面再好看一点");
    expect(decided.intent).toBe("modify");
    expect(decided.source).toBe("default");
  });

  it("defaults to modify when the model throws", async () => {
    const decided = await classifyWorkbenchIntent("随便问问", async () => {
      throw new Error("boom");
    });
    expect(decided.intent).toBe("modify");
    expect(decided.source).toBe("default");
  });
});
