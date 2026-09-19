# 线 2：增量修改

把下面整段贴进新窗口。若已由主会话派发，直接按本文做。

---

你在 `/Users/lil_p/面试/atoms` 接上「同一项目里再说一句话就改应用」。用中文回复。不要 commit，不要 push，不要部署。

读 `docs/superpowers/plans/2026-09-18-track-2-modify.md` 并执行。不要改工作台，不要改首轮 `run-code.ts`。

---

## 要做到

1. 新接口 `POST /api/projects/:id/modify`，约定见 `docs/superpowers/plans/2026-09-18-atoms-lite-three-tracks-next.md` 的「接线约定」。`maxDuration = 300`。
2. 只允许项目主人调用。计划步骤还是 `waiting_approval`，或当前轮有 `running` 且未超过 3 分钟的步骤，返回 `409`。
3. 新开一轮，不要新建项目。`intentKind` 写 `modify`。用户原话存进 `messages`。`projects.currentRoundId` 改到这一轮。
4. 改文件前先记下当前 `files` 作为 before。工程师用 `flashModel()` 和 `generateObject`，按用户这句话改已有文件。一次只生成一个需要改的文件。路径仍不超过两层，入口仍是 `index.html`。数据仍只能走 `window.atomslite.db`。
5. 写回用现有 `upsertProjectFiles`。不要改那个文件；不够用就停住并写明。
6. 写完调用已有的 `verifyApplication({ before, after, declaredRemovals: [] })`。
   - `OK`：步骤 `done`，`verifyResult` 为 `ok`
   - `NO_FILE_CHANGED` 或 `IDENTICAL_CONTENT`：步骤 `failed`，`verifyResult` 写明没改到
   - `REGRESSION`：步骤 `failed`，`verifyResult` 写明丢了哪些 `data-feature`，文件仍保留这次写入，方便人看
7. 插入一条助手 `messages`，`kind=step`，`content` 里有 `summary`，用一句话说明改了什么或为什么失败。
8. 不要自动发布。不要跑团队领导、产品经理、架构师。

## 只能改

新建 `lib/orchestrator/run-modify.ts`、`lib/prompts/modify.ts`、`lib/schemas/modify.ts`（如果需要）、`app/api/projects/[id]/modify/route.ts`，以及这次的测试。

可以读不能改：`lib/verify/**`、`lib/orchestrator/write-files.ts`、`lib/llm/client.ts`、`lib/db/schema.ts`、`lib/sandbox/assemble-srcdoc.ts`。

## 不许改

`components/**`、`app/p/**`、`lib/orchestrator/run-code.ts`、`lib/orchestrator/run-plan.ts`、`lib/orchestrator/approve-spec.ts`、`lib/sandbox/bridge-sdk.ts`、`package.json`、`.env`。

## 验收

- `npx tsc --noEmit` 通过
- 单测覆盖 `verifyApplication` 的三种失败码如何变成步骤状态。模型调用抽出去，测试里不要打真的 DeepSeek
- 不要求在这个窗口里用真实项目打一遍模型。打了就在汇报里写项目 id 和 `verifyResult`

## 汇报格式

```
线：2
结果：完成 | 部分完成 | 停住

做完了什么
-

改过的文件
-

确认没改的文件
- components/
- lib/orchestrator/run-code.ts
- lib/db/schema.ts
- package.json

怎么验的
- 命令：
- 结果：

没验的
-

给接线用的接口
- POST /api/projects/:id/modify 的请求体和 200 / 409 形状

停住的原因
- 无
```
