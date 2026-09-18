# 线 1：四角色编排

把下面整段贴进新窗口。若已由主会话派发，直接按本文做。

---

你在 `/Users/lil_p/面试/atoms` 做四角色编排。用中文回复。不要 commit，不要 push。

读 `docs/superpowers/plans/2026-09-18-track-a-agents.md` 并执行。不要改工作台组件，不要做 harness 纯函数。

---

## 要做到

1. `lib/llm/client.ts` 的默认模型改成 `deepseek-flash`。`.env` 和 `.env.example` 里的 `LLM_MODEL_FLASH`、`LLM_MODEL_PRO` 也改成 `deepseek-flash`。不要改密钥。
2. 团队领导：`lib/schemas/plan.ts`、`lib/prompts/plan.ts`、`lib/orchestrator/run-plan.ts`。输出包含 `goal`、`scope`（1–6）、`outOfScope`、`steps`（只允许产品经理、架构师、工程师）、`approvalQuestion`。写入 step `key=plan`，`agentRole=团队领导`，状态 `waiting_approval`。
3. `POST /api/projects/:id/spec` 改为启动领导。已有待批准或已完成的 `plan` 就返回现有步骤，不要再插一条。
4. 批准：`POST /api/projects/:id/approve` 看到 `plan` 为 `waiting_approval` 时，标成 `done`，然后按顺序跑产品经理、架构师、工程师。不要中途再停。
5. 产品经理沿用 `SpecSchema`，`key=spec`，`agentRole=产品经理`。功能不超过 6，页面不超过 3。
6. 架构师：`lib/schemas/blueprint.ts`。`files` 里必须有 `index.html`，路径不超过两层。`collections` 是应用数据集合名。`key=blueprint`，`agentRole=架构师`。
7. 工程师按 blueprint 的文件逐个 `generateObject`，仍然一次只写一个文件。提示里写明只能用 `window.atomslite.db`，每个功能有 `data-feature`。写完用现有 `assembleSrcdoc` 看缺文件和白名单。失败只重写 `index.html` 一次。`key=code`，`agentRole=工程师`。不要调用发布接口。
8. 四个调用都用 `flashModel()`。

旧项目上已有的 `spec` / `code` 步骤不要删。

## 只能改

`lib/llm/client.ts`、`lib/prompts/**`、`lib/schemas/**`、`lib/orchestrator/**`、`app/api/projects/[id]/spec/route.ts`、`app/api/projects/[id]/approve/route.ts`、`.env` 里那两行模型名、`.env.example` 里那两行模型名。

## 不许改

`components/**`、`app/p/**`、`app/page.tsx`、`lib/verify/**`、`lib/db/schema.ts`、`package.json`。

## 验收

- `npx tsc --noEmit` 通过
- 新建一个项目，`POST /spec` 返回 `waiting_approval`，`output.goal` 非空，角色是团队领导
- 再 `POST /approve`，结束后数据库里有 `plan`、`spec`、`blueprint`、`code` 四条，`files` 里有 `index.html`
- 这次调用的模型名在日志或返回里能看出是 `deepseek-flash`。如果接口拒绝这个模型名，停住并写明错误正文，不要偷偷换回 `deepseek-chat`

## 汇报格式

```
线：1
结果：完成 | 部分完成 | 停住

做完了什么
-

改过的文件
-

确认没改的文件
- components/
- app/p/
- lib/verify/
- package.json

怎么验的
- 命令：
- 结果：

没验的
-

给接线用的接口
- plan / blueprint 的字段
- approve 成功时的返回

停住的原因
- 无
```
