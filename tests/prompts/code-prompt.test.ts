import { describe, expect, it } from "vitest";
import { buildCodePrompt } from "@/lib/prompts/code";

describe("buildCodePrompt", () => {
  it("keeps the single-file contract and guides db usage", () => {
    const prompt = buildCodePrompt({
      spec: {
        appName: "记账本",
        features: [{ id: "add", title: "记账", acceptance: "能新增一笔" }],
        pages: ["home"],
      },
      path: "index.html",
      written: [],
      allowedPaths: ["index.html", "styles/main.css", "scripts/db.js", "scripts/app.js"],
    });
    expect(prompt).toContain("data-feature");
    expect(prompt).toContain("window.atomslite.db");
    expect(prompt).toContain('list("');
    expect(prompt).toContain("集合名");
    expect(prompt).toContain("本轮只允许写这些路径");
    expect(prompt).toContain("scripts/db.js");
    expect(prompt).toContain("必须全部引用");
    expect(prompt).not.toContain("禁止 localStorage");
    expect(prompt).toContain("能点的界面");
    expect(prompt).toContain("空状态");
    expect(prompt).toContain("index.html");
  });
});
