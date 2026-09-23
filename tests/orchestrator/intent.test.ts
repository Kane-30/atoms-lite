import { describe, expect, it } from "vitest";
import { classifyWorkbenchIntent, ruleClassifyIntent } from "@/lib/orchestrator/intent";

describe("ruleClassifyIntent", () => {
  it("classifies hard modify phrases as modify", () => {
    expect(ruleClassifyIntent("加一个退格按钮").intent).toBe("modify");
    expect(ruleClassifyIntent("把历史改成用 list 保存").intent).toBe("modify");
    expect(ruleClassifyIntent("删掉清空历史按钮").intent).toBe("modify");
  });

  it("classifies hard ask phrases as ask", () => {
    expect(ruleClassifyIntent("清空功能有吗？告诉我在哪").intent).toBe("ask");
    expect(ruleClassifyIntent("退格键在哪个文件里").intent).toBe("ask");
    expect(ruleClassifyIntent("这个历史是怎么存的").intent).toBe("ask");
  });

  it("returns null for hybrid or ambiguous prompts so the model can decide", () => {
    expect(ruleClassifyIntent("清空功能有吗？有的话告诉我在哪，没有的话帮我加上").intent).toBeNull();
    expect(ruleClassifyIntent("界面再好看一点").intent).toBeNull();
  });
});

describe("classifyWorkbenchIntent", () => {
  it("uses the model when rules are ambiguous", async () => {
    const decided = await classifyWorkbenchIntent(
      "清空功能有吗？有的话告诉我在哪，没有的话帮我加上",
      async () => ({ intent: "ask", reason: "先回答现状" }),
    );
    expect(decided).toEqual({ intent: "ask", source: "model", reason: "先回答现状" });
  });

  it("defaults to modify when ambiguous and no model", async () => {
    const decided = await classifyWorkbenchIntent("界面再好看一点");
    expect(decided.intent).toBe("modify");
    expect(decided.source).toBe("default");
  });
});
