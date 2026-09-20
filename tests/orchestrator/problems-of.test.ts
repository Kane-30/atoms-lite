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
  it("把无参 list() 当成失败", () => {
    const { issues } = problemsOf(
      page(
        '<button data-feature="play">开始</button><p>还没有记录</p>',
        "window.atomslite.db.list().then(function(){})",
      ),
      spec,
    );
    expect(outcomeOf(issues).status).toBe("failed");
    expect(issues.join("\n")).toMatch(/list.*集合名/);
  });

  it("把 insert 把对象当第一个参数当成失败", () => {
    const { issues } = problemsOf(
      page(
        '<button data-feature="play">开始</button><p>还没有记录</p>',
        "window.atomslite.db.insert({ id: '1', value: 'x' })",
      ),
      spec,
    );
    expect(outcomeOf(issues).status).toBe("failed");
    expect(issues.join("\n")).toMatch(/insert.*集合名/);
  });

  it("注释里提到 localStorage 不算失败", () => {
    const { issues } = problemsOf(
      page(
        '<button data-feature="play">开始</button><p>还没有记录</p>',
        "/* 不使用 localStorage / sessionStorage / indexedDB */\nwindow.atomslite.db.list('scores')",
      ),
      spec,
    );
    expect(outcomeOf(issues)).toEqual({ status: "done", verifyResult: "ok" });
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

  it("正确带集合名的读写可以通过", () => {
    const { issues } = problemsOf(
      page(
        '<button data-feature="play">开始</button><p>还没有记录</p>',
        "window.atomslite.db.list('scores').then(function(){})",
      ),
      spec,
    );
    expect(outcomeOf(issues)).toEqual({ status: "done", verifyResult: "ok" });
  });

  it("把 index.html 没引入的 js 文件当成失败", () => {
    const { issues } = problemsOf(
      [
        {
          path: "index.html",
          content:
            '<!doctype html><html><body><button data-feature="play">开始</button><script src="scripts/app.js"></script></body></html>',
        },
        { path: "scripts/app.js", content: "window.atomslite.db.list('scores')" },
        { path: "scripts/calc.js", content: "window.atomslite.calc = {}" },
        { path: "styles/main.css", content: "body{margin:0}" },
      ],
      spec,
    );
    expect(outcomeOf(issues).status).toBe("failed");
    expect(issues.join("\n")).toMatch(/未引入.*calc\.js/);
  });

  it("把覆盖 window.atomslite.db 当成失败", () => {
    const { issues } = problemsOf(
      page(
        '<button data-feature="play">开始</button><p>还没有记录</p>',
        "window.atomslite.db = {}; window.atomslite.db.list = function(){}",
      ),
      spec,
    );
    expect(outcomeOf(issues).status).toBe("failed");
    expect(issues.join("\n")).toMatch(/覆盖.*atomslite\.db/);
  });
});
