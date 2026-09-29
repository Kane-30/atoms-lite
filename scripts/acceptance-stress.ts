/**
 * Hard acceptance stress against the five criteria.
 * Each "trial" = calc project + todo project, full checklist.
 * Target: high pass rate under repeated runs (not one lucky pass).
 */
import { config } from "dotenv";
config();

import { neon, neonConfig } from "@neondatabase/serverless";
import { hashPassword } from "../lib/auth/password";
import { getDb } from "../lib/db/client";
import { users } from "../lib/db/schema";
import { createProject } from "../lib/db/projects";
import { runPlanForProject } from "../lib/orchestrator/run-plan";
import { approveSpecAndGenerate } from "../lib/orchestrator/approve-spec";
import { runModifyForProject } from "../lib/orchestrator/run-modify";
import { htmlAssetRefs, scriptWiringIssues } from "../lib/orchestrator/script-wiring";
import { assembleSrcdoc } from "../lib/sandbox/assemble-srcdoc";
import { extractAnchors } from "../lib/verify/anchors";
import { previewCalculatorMath } from "../lib/orchestrator/calculator-semantics";

const EMAIL = "123456789@gmail.com";
const PASSWORD = "123456";
const TRIALS = Number(process.env.ACCEPT_TRIALS || 8);

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

function checkClosure(files: FileRow[]) {
  const index = files.find((file) => file.path === "index.html");
  if (!index) return { ok: false as const, issues: ["no index"] };
  const present = new Set(files.map((file) => file.path));
  const refs = htmlAssetRefs(index.content);
  const issues: string[] = [];
  for (const path of [...refs.css, ...refs.js]) {
    if (!present.has(path)) issues.push(`missing ${path}`);
  }
  for (const file of files) {
    if (file.path.endsWith(".js") && !refs.js.includes(file.path)) issues.push(`orphan ${file.path}`);
  }
  for (const path of assembleSrcdoc(files).missing) issues.push(`assemble ${path}`);
  for (const issue of scriptWiringIssues(files)) issues.push(issue);
  if (extractAnchors(index.content).length === 0) issues.push("no data-feature");
  return { ok: issues.length === 0, issues, refs, paths: [...present].sort() };
}

async function ensureUser() {
  const sql = neon(process.env.DATABASE_URL!);
  const existing = await sql`select id from users where email = ${EMAIL} limit 1`;
  if (existing[0]) {
    await sql`update users set password_hash = ${await hashPassword(PASSWORD)} where email = ${EMAIL}`;
    return existing[0].id as string;
  }
  const db = getDb();
  const [created] = await db
    .insert(users)
    .values({ email: EMAIL, name: "batch-temp", passwordHash: await hashPassword(PASSWORD) })
    .returning({ id: users.id });
  return created.id;
}

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const userId = await ensureUser();
  console.log(JSON.stringify({ phase: "start", email: EMAIL, userId, trials: TRIALS }));

  // Keep one bad Preview from killing the whole stress run.
  process.on("uncaughtException", (error) => {
    console.error(JSON.stringify({ phase: "uncaughtException", message: error.message }));
  });
  process.on("unhandledRejection", (reason) => {
    console.error(
      JSON.stringify({
        phase: "unhandledRejection",
        message: reason instanceof Error ? reason.message : String(reason),
      }),
    );
  });

  async function loadFiles(projectId: string) {
    return (await sql`select path, content from files where project_id = ${projectId}`) as FileRow[];
  }

  async function refreshSnapshot(projectId: string) {
    const [project] = await sql`select id, title from projects where id = ${projectId} and user_id = ${userId}`;
    const msgs = await sql`select count(*)::int as n from messages where project_id = ${projectId}`;
    const files = await loadFiles(projectId);
    const closure = checkClosure(files);
    return {
      projectExists: Boolean(project),
      title: project?.title ?? null,
      messages: Number(msgs[0].n),
      files: files.length,
      closure,
      fileRows: files,
    };
  }

  async function firstGen(title: string, prompt: string) {
    const created = await createProject(userId, title, prompt);
    await runPlanForProject(created.projectId, userId);
    const result = await approveSpecAndGenerate(created.projectId, userId);
    const snap = await refreshSnapshot(created.projectId);
    return { projectId: created.projectId, result, snap };
  }

  type Criterion = {
    c1_twoProjects: boolean;
    c2_refsExist: boolean;
    c3_previewMath: boolean;
    c4_twoModifies: boolean;
    c5_refreshPersist: boolean;
  };

  async function runOneTrial(t: number): Promise<Record<string, unknown>> {
    const stamp = `${Date.now()}-${t}`;
    const failures: string[] = [];
    const criterion: Criterion = {
      c1_twoProjects: false,
      c2_refsExist: false,
      c3_previewMath: false,
      c4_twoModifies: false,
      c5_refreshPersist: false,
    };

    const calc = await firstGen(`acc-${stamp}-calc`, "生成一个可交互计算器，支持加减乘除和清空。");
    const todo = await firstGen(`acc-${stamp}-todo`, "生成一个待办清单，可以添加、完成、删除。");

    criterion.c1_twoProjects = calc.result?.status === "done" && todo.result?.status === "done";
    if (!criterion.c1_twoProjects) {
      failures.push(
        `c1 gen calc=${calc.result?.status}/${"verifyResult" in (calc.result || {}) ? (calc.result as { verifyResult?: string }).verifyResult : ""} todo=${todo.result?.status}`,
      );
    }

    criterion.c2_refsExist = calc.snap.closure.ok && todo.snap.closure.ok;
    if (!criterion.c2_refsExist) {
      failures.push(
        `c2 calc=${JSON.stringify(calc.snap.closure.issues)} todo=${JSON.stringify(todo.snap.closure.issues)}`,
      );
    }

    const preview = await previewCalculatorMath(calc.snap.fileRows);
    criterion.c3_previewMath = preview.ok === true;
    if (!criterion.c3_previewMath) failures.push(`c3 preview ${JSON.stringify(preview)}`);

    const anchorsBefore = new Set(
      extractAnchors(calc.snap.fileRows.find((f) => f.path === "index.html")?.content || ""),
    );
    const m1 = await runModifyForProject(calc.projectId, userId, "加一个退格按钮，保留加减乘除和清空。");
    const afterM1 = await refreshSnapshot(calc.projectId);
    const m2 = await runModifyForProject(
      calc.projectId,
      userId,
      '历史记录用 list("history") 保存，刷新还能看到；保留原有运算。',
    );
    const afterM2 = await refreshSnapshot(calc.projectId);
    const previewAfter = await previewCalculatorMath(afterM2.fileRows);
    const anchorsAfter = new Set(
      extractAnchors(afterM2.fileRows.find((f) => f.path === "index.html")?.content || ""),
    );
    const anchorsKept = [...anchorsBefore].every((id) => anchorsAfter.has(id));

    criterion.c4_twoModifies =
      !("error" in m1) &&
      !("error" in m2) &&
      m1.status === "done" &&
      m2.status === "done" &&
      afterM1.closure.ok &&
      afterM2.closure.ok &&
      anchorsKept &&
      previewAfter.ok === true;
    if (!criterion.c4_twoModifies) {
      failures.push(
        `c4 m1=${JSON.stringify(m1)} m2=${JSON.stringify(m2)} anchorsKept=${anchorsKept} previewAfter=${JSON.stringify(previewAfter)} closure=${afterM2.closure.ok}`,
      );
    }

    const refreshedCalc = await refreshSnapshot(calc.projectId);
    const refreshedTodo = await refreshSnapshot(todo.projectId);
    criterion.c5_refreshPersist =
      refreshedCalc.projectExists &&
      refreshedTodo.projectExists &&
      refreshedCalc.messages >= 1 &&
      refreshedTodo.messages >= 1 &&
      refreshedCalc.files >= 1 &&
      refreshedTodo.files >= 1 &&
      refreshedCalc.closure.ok &&
      refreshedTodo.closure.ok;
    if (!criterion.c5_refreshPersist) {
      failures.push(
        `c5 calc=${JSON.stringify({ p: refreshedCalc.projectExists, m: refreshedCalc.messages, f: refreshedCalc.files, c: refreshedCalc.closure.ok })} todo=${JSON.stringify({ p: refreshedTodo.projectExists, m: refreshedTodo.messages, f: refreshedTodo.files, c: refreshedTodo.closure.ok })}`,
      );
    }

    const allFive = Object.values(criterion).every(Boolean);
    return {
      trial: t,
      ok: allFive,
      criterion,
      calcId: calc.projectId,
      todoId: todo.projectId,
      preview,
      previewAfter,
      failures,
    };
  }

  const trials: Record<string, unknown>[] = [];
  const tallies = {
    c1_twoProjects: 0,
    c2_refsExist: 0,
    c3_previewMath: 0,
    c4_twoModifies: 0,
    c5_refreshPersist: 0,
    allFive: 0,
  };

  for (let t = 1; t <= TRIALS; t += 1) {
    console.log(`\n===== ACCEPT TRIAL ${t}/${TRIALS} =====`);
    let row: Record<string, unknown> | null = null;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        row = await runOneTrial(t);
        const failures = (row.failures as string[]) || [];
        const infra =
          failures.length > 0 &&
          failures.every((f) => /^(terminated|aborted|network|fetch failed|ECONNRESET|ETIMEDOUT)/i.test(f));
        if (row.ok || !infra || attempt === 2) break;
        console.log(JSON.stringify({ phase: "trial-retry", trial: t, attempt, reason: failures[0] }));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const infra = /^(terminated|aborted|network|fetch failed|ECONNRESET|ETIMEDOUT)/i.test(message);
        row = { trial: t, ok: false, failures: [message] };
        if (!infra || attempt === 2) {
          console.log(JSON.stringify({ phase: "trial-error", ...row }, null, 2));
          break;
        }
        console.log(JSON.stringify({ phase: "trial-retry", trial: t, attempt, reason: message }));
      }
    }
    if (!row) continue;
    if (!("criterion" in row)) {
      trials.push(row);
      if (!row.ok) console.log(JSON.stringify({ phase: "trial-error", ...row }, null, 2));
      continue;
    }
    const criterion = row.criterion as Criterion;
    if (criterion.c1_twoProjects) tallies.c1_twoProjects += 1;
    if (criterion.c2_refsExist) tallies.c2_refsExist += 1;
    if (criterion.c3_previewMath) tallies.c3_previewMath += 1;
    if (criterion.c4_twoModifies) tallies.c4_twoModifies += 1;
    if (criterion.c5_refreshPersist) tallies.c5_refreshPersist += 1;
    if (row.ok) tallies.allFive += 1;
    trials.push(row);
    console.log(JSON.stringify({ phase: "trial-done", ...row }, null, 2));
  }

  const rate = (n: number) => Number(((n / TRIALS) * 100).toFixed(1));
  const summary = {
    trials: TRIALS,
    rates: {
      c1_twoProjects: rate(tallies.c1_twoProjects),
      c2_refsExist: rate(tallies.c2_refsExist),
      c3_previewMath: rate(tallies.c3_previewMath),
      c4_twoModifies: rate(tallies.c4_twoModifies),
      c5_refreshPersist: rate(tallies.c5_refreshPersist),
      allFive: rate(tallies.allFive),
    },
    tallies,
    failedTrials: trials.filter((row) => !row.ok).map((row) => ({
      trial: row.trial,
      failures: row.failures,
      calcId: row.calcId,
      todoId: row.todoId,
    })),
    meet99: {
      c1: rate(tallies.c1_twoProjects) >= 99,
      c2: rate(tallies.c2_refsExist) >= 99,
      c3: rate(tallies.c3_previewMath) >= 99,
      c4: rate(tallies.c4_twoModifies) >= 99,
      c5: rate(tallies.c5_refreshPersist) >= 99,
      allFive: rate(tallies.allFive) >= 99,
    },
  };
  console.log("\n===== ACCEPTANCE STRESS SUMMARY =====");
  console.log(JSON.stringify(summary, null, 2));
  // With TRIALS=8, 99% means 8/8. Fail process if any criterion < 100% at this sample size.
  if (tallies.allFive < TRIALS) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
