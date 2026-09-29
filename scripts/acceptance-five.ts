/**
 * Local acceptance for the five wiring / first-gen criteria.
 * Creates NEW projects only; does not mutate interviewer history rows.
 */
import { config } from "dotenv";
config();

import { Window } from "happy-dom";
import { neon, neonConfig } from "@neondatabase/serverless";
import { createProject } from "../lib/db/projects";
import { runPlanForProject } from "../lib/orchestrator/run-plan";
import { approveSpecAndGenerate } from "../lib/orchestrator/approve-spec";
import { runModifyForProject } from "../lib/orchestrator/run-modify";
import { htmlAssetRefs } from "../lib/orchestrator/script-wiring";
import { assembleSrcdoc } from "../lib/sandbox/assemble-srcdoc";
import { BRIDGE_SDK_SOURCE } from "../lib/sandbox/bridge-sdk";

const baseFetch = globalThis.fetch.bind(globalThis);
neonConfig.fetchFunction = async (input: RequestInfo | URL, init?: RequestInit) => {
  let last: unknown;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      return await baseFetch(input, init);
    } catch (error) {
      last = error;
      if (attempt === 5) break;
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
  throw last;
};

type FileRow = { path: string; content: string };

const MEMORY_BRIDGE = `
window.atomslite = (function () {
  var collections = {};
  function rows(name) {
    if (!collections[name]) collections[name] = [];
    return collections[name];
  }
  return {
    db: {
      list: function (collection) {
        return Promise.resolve(rows(collection).slice());
      },
      insert: function (collection, doc) {
        var row = Object.assign({}, doc || {});
        if (!row.id) row.id = Date.now().toString(36) + Math.random().toString(16).slice(2);
        rows(collection).push(row);
        return Promise.resolve(row);
      },
      update: function (collection, id, patch) {
        var list = rows(collection);
        for (var i = 0; i < list.length; i++) {
          if (String(list[i].id) === String(id)) {
            list[i] = Object.assign({}, list[i], patch || {});
            return Promise.resolve(list[i]);
          }
        }
        return Promise.resolve(null);
      },
      remove: function (collection, id) {
        collections[collection] = rows(collection).filter(function (row) {
          return String(row.id) !== String(id);
        });
        return Promise.resolve({ ok: true });
      }
    },
    toast: function () {},
    ready: function () {}
  };
})();
window.__atomsliteReady = Promise.resolve();
`.trim();

function checkClosure(files: FileRow[]) {
  const index = files.find((file) => file.path === "index.html");
  if (!index) return { ok: false as const, detail: "no index" as const };
  const present = new Set(files.map((file) => file.path));
  const refs = htmlAssetRefs(index.content);
  const missing = [...refs.css, ...refs.js].filter((path) => !present.has(path));
  const orphanJs = files
    .filter((file) => file.path.endsWith(".js") && !refs.js.includes(file.path))
    .map((file) => file.path);
  const assembled = assembleSrcdoc(files);
  return {
    ok: missing.length === 0 && orphanJs.length === 0 && assembled.missing.length === 0,
    missing,
    orphanJs,
    assembleMissing: assembled.missing,
    refs,
    paths: [...present],
  };
}

function withMemoryBridge(html: string) {
  if (html.includes(BRIDGE_SDK_SOURCE.slice(0, 40))) {
    return html.replace(BRIDGE_SDK_SOURCE, MEMORY_BRIDGE);
  }
  if (html.includes("atomslite:req")) {
    return html.replace(/<script>[\s\S]*?atomslite:req[\s\S]*?<\/script>/, `<script>${MEMORY_BRIDGE}</script>`);
  }
  return `<script>${MEMORY_BRIDGE}</script>${html}`;
}

function readDisplay(document: Document): string {
  const candidates = [
    "#display",
    "#result",
    "#displayResult",
    ".display",
    ".display-result",
    "[data-feature='calc-basic-ops'] .display",
    "[aria-live]",
  ];
  for (const selector of candidates) {
    const node = document.querySelector(selector);
    if (node && node.textContent && node.textContent.trim() !== "") {
      return node.textContent.trim().replace(/\s+/g, " ");
    }
  }
  return "";
}

function findButton(document: Document, matcher: (button: Element) => boolean) {
  const buttons = [...document.querySelectorAll("button")];
  return buttons.find(matcher) ?? null;
}

function clickLabel(document: Document, label: string) {
  const button = findButton(document, (node) => {
    const text = (node.textContent || "").trim();
    const digit = node.getAttribute("data-digit");
    const op = node.getAttribute("data-op");
    const action = node.getAttribute("data-action");
    if (label === "C") return action === "clear" || text === "C" || text === "AC";
    if (label === "=") return action === "equals" || action === "eq" || text === "=";
    if (label === "×" || label === "*") return op === "×" || op === "*" || text === "×" || text === "*";
    if (label === "÷" || label === "/") return op === "÷" || op === "/" || text === "÷" || text === "/";
    if (label === "+") return op === "+" || text === "+";
    if (label === "-") return op === "-" || text === "−" || text === "-";
    return digit === label || text === label;
  });
  if (!button) throw new Error(`button not found: ${label}`);
  (button as HTMLButtonElement).click();
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function previewCalc(files: FileRow[]) {
  const assembled = assembleSrcdoc(files);
  if (assembled.missing.length > 0) {
    return { ok: false as const, error: `assemble missing ${assembled.missing.join(",")}` };
  }
  const html = withMemoryBridge(assembled.html);
  const win = new Window({ url: "https://atoms.local/preview" });
  win.document.write(html);
  await win.happyDOM.waitUntilComplete();
  await sleep(50);
  // App scripts may be deferred behind __atomsliteReady.
  await sleep(100);

  const doc = win.document as unknown as Document;
  const steps: { name: string; display: string }[] = [];

  try {
    clickLabel(doc, "C");
    await sleep(20);
    steps.push({ name: "clear", display: readDisplay(doc) });

    clickLabel(doc, "7");
    clickLabel(doc, "×");
    clickLabel(doc, "8");
    clickLabel(doc, "=");
    await sleep(30);
    const mul = readDisplay(doc);
    steps.push({ name: "7×8", display: mul });

    clickLabel(doc, "C");
    clickLabel(doc, "1");
    clickLabel(doc, "2");
    clickLabel(doc, "+");
    clickLabel(doc, "3");
    clickLabel(doc, "=");
    await sleep(30);
    const add = readDisplay(doc);
    steps.push({ name: "12+3", display: add });

    clickLabel(doc, "C");
    clickLabel(doc, "9");
    clickLabel(doc, "-");
    clickLabel(doc, "4");
    clickLabel(doc, "=");
    await sleep(30);
    const sub = readDisplay(doc);
    steps.push({ name: "9-4", display: sub });

    clickLabel(doc, "C");
    clickLabel(doc, "8");
    clickLabel(doc, "÷");
    clickLabel(doc, "2");
    clickLabel(doc, "=");
    await sleep(30);
    const div = readDisplay(doc);
    steps.push({ name: "8÷2", display: div });

    clickLabel(doc, "C");
    await sleep(20);
    const cleared = readDisplay(doc);
    steps.push({ name: "clear-end", display: cleared });

    const ok =
      /\b56\b/.test(mul) &&
      /\b15\b/.test(add) &&
      /\b5\b/.test(sub) &&
      /\b4\b/.test(div) &&
      (/^0$/.test(cleared) || cleared === "" || /\b0\b/.test(cleared));

    win.close();
    return { ok, steps, mul, add, sub, div, cleared };
  } catch (error) {
    win.close();
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : String(error),
      steps,
      display: readDisplay(doc),
    };
  }
}

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const [user] = await sql`select id, email from users where email = 'bonjourzyko@gmail.com' limit 1`;
  if (!user) throw new Error("user missing");

  const report: Record<string, unknown> = { startedAt: new Date().toISOString() };
  const failures: string[] = [];

  async function loadFiles(projectId: string) {
    return (await sql`select path, content from files where project_id = ${projectId}`) as FileRow[];
  }

  async function firstGen(title: string, prompt: string) {
    const created = await createProject(user.id, title, prompt);
    await runPlanForProject(created.projectId, user.id);
    const result = await approveSpecAndGenerate(created.projectId, user.id);
    const files = await loadFiles(created.projectId);
    const steps = await sql`
      select s.key, s.status, s.verify_result
      from steps s join rounds r on r.id = s.round_id
      where r.project_id = ${created.projectId}
      order by r.index, s.seq`;
    const closure = checkClosure(files);
    return { projectId: created.projectId, result, files, steps, closure };
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  // 1+2: two new projects succeed + HTML refs exist
  const calc = await firstGen(
    `accept-${stamp}-calc`,
    "生成一个可交互计算器，支持加减乘除和清空。",
  );
  const todo = await firstGen(
    `accept-${stamp}-todo`,
    "生成一个待办清单，可以添加、完成、删除。",
  );

  const twoOk =
    calc.result?.status === "done" &&
    calc.closure.ok &&
    todo.result?.status === "done" &&
    todo.closure.ok;
  if (!twoOk) failures.push("连续两次新建/引用闭包未通过");

  report.criterion1_twoProjects = {
    ok: twoOk,
    calc: {
      id: calc.projectId,
      status: calc.result?.status,
      verify: calc.result?.verifyResult,
      closure: calc.closure,
    },
    todo: {
      id: todo.projectId,
      status: todo.result?.status,
      verify: todo.result?.verifyResult,
      closure: todo.closure,
    },
  };

  // 3: Preview calculator ops
  const preview1 = await previewCalc(calc.files);
  if (!preview1.ok) failures.push(`计算器 Preview 运算未通过: ${"error" in preview1 ? preview1.error : JSON.stringify(preview1.steps)}`);
  report.criterion3_previewMath = preview1;

  // 4: two modify rounds, keep calc working + closure
  const m1 = await runModifyForProject(calc.projectId, user.id, "加一个退格按钮，保留加减乘除和清空。");
  const m2 = await runModifyForProject(
    calc.projectId,
    user.id,
    '历史记录用 list("history") 保存成功计算，刷新还能看到；保留原有运算功能。',
  );
  const filesAfterModify = await loadFiles(calc.projectId);
  const closureAfter = checkClosure(filesAfterModify);
  const preview2 = await previewCalc(filesAfterModify);
  const modifyOk =
    !("error" in m1) &&
    !("error" in m2) &&
    m1.status === "done" &&
    (m2.status === "done") &&
    (m2.verifyResult === "unchanged" || m2.verifyResult === "ok") &&
    closureAfter.ok &&
    preview2.ok;
  if (!modifyOk) failures.push("两轮 modify 或事后运算/闭包未通过");
  report.criterion4_modify = {
    ok: modifyOk,
    m1,
    m2,
    closureAfter,
    previewAfter: preview2,
  };

  // 5: refresh persistence — re-query project / messages / files
  const [projectRow] = await sql`select id, title from projects where id = ${calc.projectId}`;
  const msgCount = await sql`select count(*)::int as n from messages where project_id = ${calc.projectId}`;
  const fileCount = await sql`select count(*)::int as n from files where project_id = ${calc.projectId}`;
  const refreshedFiles = await loadFiles(calc.projectId);
  const refreshedClosure = checkClosure(refreshedFiles);
  const persistOk =
    !!projectRow &&
    Number(msgCount[0].n) > 0 &&
    Number(fileCount[0].n) > 0 &&
    refreshedClosure.ok;
  if (!persistOk) failures.push("刷新后项目/对话/生成物不完整");
  report.criterion5_refresh = {
    ok: persistOk,
    project: projectRow,
    messages: msgCount[0].n,
    files: fileCount[0].n,
    closure: refreshedClosure,
  };

  report.failures = failures;
  report.passed = failures.length === 0;
  report.finishedAt = new Date().toISOString();
  console.log(JSON.stringify(report, null, 2));
  if (failures.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
