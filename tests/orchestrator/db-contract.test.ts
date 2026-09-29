import { describe, expect, it } from "vitest";
import { ensureDbContract } from "@/lib/orchestrator/db-contract";
import { problemsOf, outcomeOf } from "@/lib/orchestrator/run-code";
import type { SpecOutput } from "@/lib/schemas/spec";

const spec: SpecOutput = {
  appName: "待办",
  features: [
    { id: "add-todo", title: "添加", acceptance: "能添加待办" },
    { id: "complete-todo", title: "完成", acceptance: "能完成待办" },
  ],
  pages: ["home"],
};

function todoFiles(appJs: string) {
  return [
    {
      path: "index.html",
      content: `<!doctype html><html><body>
<button data-feature="add-todo">添加</button>
<button data-feature="complete-todo">完成</button>
<ul id="list"></ul>
<script src="scripts/app.js"></script>
</body></html>`,
    },
    { path: "scripts/app.js", content: appJs },
    { path: "styles/main.css", content: "body{margin:0}" },
  ];
}

describe("ensureDbContract", () => {
  it("补上完全缺失的 atomslite.db 调用后能通过 problemsOf", () => {
    const before = todoFiles(`
      document.querySelector('[data-feature="add-todo"]').onclick = function () {
        var li = document.createElement("li");
        li.textContent = "x";
        document.getElementById("list").appendChild(li);
      };
    `);
    expect(problemsOf(before, spec).issues.join("\n")).toMatch(/atomslite\.db/);

    const fixed = ensureDbContract(before);
    expect(outcomeOf(problemsOf(fixed, spec).issues)).toEqual({
      status: "done",
      verifyResult: "ok",
    });
    expect(fixed.find((f) => f.path === "scripts/app.js")!.content).toMatch(
      /atomslite\.db\.list\(["'][\w-]+["']\)/,
    );
  });

  it("把 list() 无集合名修成带集合名", () => {
    const before = todoFiles(`
      window.atomslite.db.list().then(function (rows) {
        console.log(rows);
      });
    `);
    expect(problemsOf(before, spec).issues.join("\n")).toMatch(/list.*集合名/);

    const fixed = ensureDbContract(before);
    expect(outcomeOf(problemsOf(fixed, spec).issues)).toEqual({
      status: "done",
      verifyResult: "ok",
    });
    expect(fixed.find((f) => f.path === "scripts/app.js")!.content).not.toMatch(
      /\.list\s*\(\s*\)/,
    );
  });

  it("把 insert({...}) 修成 insert(\"集合\", {...})", () => {
    const before = todoFiles(`
      window.atomslite.db.list("todos");
      window.atomslite.db.insert({ title: "a" });
    `);
    expect(problemsOf(before, spec).issues.join("\n")).toMatch(/insert.*集合名/);

    const fixed = ensureDbContract(before);
    expect(outcomeOf(problemsOf(fixed, spec).issues)).toEqual({
      status: "done",
      verifyResult: "ok",
    });
    expect(fixed.find((f) => f.path === "scripts/app.js")!.content).toMatch(
      /\.insert\s*\(\s*["']todos["']\s*,/,
    );
  });

  it("已合规文件保持不变", () => {
    const files = todoFiles(`window.atomslite.db.list("todos");`);
    expect(ensureDbContract(files)).toEqual(files);
  });
});
