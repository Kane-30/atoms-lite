import { describe, expect, it } from "vitest";
import { buildCodePrompt } from "@/lib/prompts/code";

describe("buildCodePrompt", () => {
  it("keeps the single-file contract", () => {
    const prompt = buildCodePrompt({
      spec: {
        appName: "记账本",
        features: [{ id: "add", title: "记账", acceptance: "能新增一笔" }],
        pages: ["home"],
      },
      path: "index.html",
      written: [],
    });
    expect(prompt).toContain("data-feature");
    expect(prompt).toContain("window.atomslite.db");
    expect(prompt).toContain("list");
    expect(prompt).toContain("insert");
    expect(prompt).toContain("update");
    expect(prompt).toContain("remove");
    expect(prompt).toContain("localStorage");
    expect(prompt).toContain("sessionStorage");
    expect(prompt).toContain("IndexedDB");
    expect(prompt).toContain("cookie");
    expect(prompt).toContain("能点的界面");
    expect(prompt).toContain("不能只写说明文字");
    expect(prompt).toContain("空状态");
    expect(prompt).toContain("index.html");
  });
});
