import { describe, expect, it } from "vitest";
import { outcomeOf, problemsOf } from "@/lib/orchestrator/run-code";
import type { SpecOutput } from "@/lib/schemas/spec";

const spec: SpecOutput = {
  appName: "示例",
  features: [{ id: "play", title: "开始", acceptance: "能点开始并看到结果" }],
  pages: ["home"],
};

function page(htmlBody: string, script: string) {
  return [
    {
      path: "index.html",
      content: `<!doctype html><html><head></head><body>${htmlBody}<script src="scripts/app.js"></script></body></html>`,
    },
    { path: "scripts/app.js", content: script },
    { path: "styles/main.css", content: "body{margin:0}" },
  ];
}

describe("problemsOf", () => {
  it("把脚本里的 localStorage 当成失败", () => {
    const { issues } = problemsOf(
      page(
        '<button data-feature="play">开始</button><p>还没有记录</p>',
        "localStorage.setItem('score', '1'); window.atomslite.db.list('scores')",
      ),
      spec,
    );
    expect(outcomeOf(issues)).toEqual({
      status: "failed",
      verifyResult: expect.stringContaining("localStorage"),
    });
  });

  it("把 index.html 里的 sessionStorage 和 indexedDB 当成失败", () => {
    const { issues } = problemsOf(
      page(
        '<button data-feature="play">开始</button><p>sessionStorage</p><p>indexedDB</p>',
        "window.atomslite.db.list('scores')",
      ),
      spec,
    );
    expect(outcomeOf(issues).status).toBe("failed");
    expect(issues.join("\n")).toContain("sessionStorage");
  });

  it("把缺少 data-feature 当成失败", () => {
    const { issues } = problemsOf(
      page("<p>这里只有说明文字</p>", "window.atomslite.db.list('scores')"),
      spec,
    );
    expect(outcomeOf(issues)).toEqual({
      status: "failed",
      verifyResult: '缺少 data-feature="play"',
    });
  });

  it("不把沙箱注入的 localStorage 兜底当成应用自己的存储", () => {
    const { issues } = problemsOf(
      page(
        '<button data-feature="play">开始</button><p>还没有记录</p>',
        "window.atomslite.db.list('scores').then(function(){})",
      ),
      spec,
    );
    expect(outcomeOf(issues)).toEqual({ status: "done", verifyResult: "ok" });
  });
});
