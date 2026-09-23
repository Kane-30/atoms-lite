import { config } from "dotenv";
config();
import { createProject } from "../lib/db/projects";
import { runPlanForProject } from "../lib/orchestrator/run-plan";
import { approveSpecAndGenerate } from "../lib/orchestrator/approve-spec";
import { runModifyForProject } from "../lib/orchestrator/run-modify";
import { htmlAssetRefs } from "../lib/orchestrator/script-wiring";
import { neon, neonConfig } from "@neondatabase/serverless";

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

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const [user] = await sql`select id, email from users where email = 'bonjourzyko@gmail.com' limit 1`;
  if (!user) throw new Error("user missing");

  async function ping() {
    await sql`select 1 as ok`;
  }

  function checkClosure(files: { path: string; content: string }[]) {
    const index = files.find((f) => f.path === "index.html");
    if (!index) return { ok: false as const, detail: "no index" };
    const present = new Set(files.map((f) => f.path));
    const refs = htmlAssetRefs(index.content);
    const missing = [...refs.css, ...refs.js].filter((p) => !present.has(p));
    const orphanJs = files
      .filter((f) => f.path.endsWith(".js") && !refs.js.includes(f.path))
      .map((f) => f.path);
    return { ok: missing.length === 0 && orphanJs.length === 0, missing, orphanJs, refs, paths: [...present] };
  }

  async function firstGen(title: string, prompt: string) {
    await ping();
    const created = await createProject(user.id, title, prompt);
    console.log("CREATED", created.projectId, title);
    await ping();
    await runPlanForProject(created.projectId, user.id);
    await ping();
    const result = await approveSpecAndGenerate(created.projectId, user.id);
    await ping();
    const files = (await sql`select path, content from files where project_id = ${created.projectId}`) as {
      path: string;
      content: string;
    }[];
    const steps = await sql`
      select s.key, s.status, s.verify_result
      from steps s join rounds r on r.id = s.round_id
      where r.project_id = ${created.projectId}
      order by r.index, s.seq`;
    const closure = checkClosure(files);
    return { projectId: created.projectId, result, steps, closure, fileCount: files.length };
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const calc = await firstGen(
    `wiring-selftest-${stamp}-calc`,
    "生成一个可交互计算器，支持加减乘除和清空。",
  );
  console.log(
    "CALC_RESULT",
    JSON.stringify(
      {
        projectId: calc.projectId,
        status: calc.result?.status,
        verify: calc.result?.verifyResult,
        files: calc.result?.files,
        closure: calc.closure,
        steps: calc.steps,
      },
      null,
      2,
    ),
  );

  if (calc.result?.status === "done" && calc.closure.ok) {
    await ping();
    const m1 = await runModifyForProject(calc.projectId, user.id, "加一个退格按钮，保留加减乘除和清空。");
    await ping();
    const m2 = await runModifyForProject(
      calc.projectId,
      user.id,
      '历史记录用 list("history") 保存成功计算，刷新还能看到；保留原有运算功能。',
    );
    const filesAfter = await sql`select path from files where project_id = ${calc.projectId}`;
    const msgs = await sql`select count(*)::int as n from messages where project_id = ${calc.projectId}`;
    console.log("MODIFY", JSON.stringify({ m1, m2, filesAfter, messages: msgs[0].n }, null, 2));
  }

  const todo = await firstGen(
    `wiring-selftest-${stamp}-todo`,
    "生成一个待办清单，可以添加、完成、删除。",
  );
  console.log(
    "TODO_RESULT",
    JSON.stringify(
      {
        projectId: todo.projectId,
        status: todo.result?.status,
        verify: todo.result?.verifyResult,
        files: todo.result?.files,
        closure: todo.closure,
        steps: todo.steps,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
