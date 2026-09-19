# 线 1：首轮生成一次做完

把下面整段贴进新窗口。若已由主会话派发，直接按本文做。

---

你在 `/Users/lil_p/面试/atoms` 把首轮生成收成能用的应用。用中文回复。不要 commit，不要 push，不要部署。

读 `docs/superpowers/plans/2026-09-18-track-1-first-gen.md` 并执行。不要做增量修改，不要改工作台。

---

## 现在的问题

工程师会把应用写成半成品：功能缺一块，或者脚本里写了 `localStorage`，页面文案还说「数据存在浏览器本地」。预览沙箱里真正的 `localStorage` 刷新就丢。正式存储只有 `window.atomslite.db`。

`lib/orchestrator/run-code.ts` 里已经会检查缺 `data-feature`、外链、以及脚本里的 `localStorage`。检查失败后只重写一轮 html/js，仍可能带着失败状态结束。

## 要做到

1. `lib/prompts/code.ts` 继续禁止 `localStorage`、`sessionStorage`、`IndexedDB`、cookie。写明每个功能都要有能点的界面，不能只写说明文字。数据读写只能走 `window.atomslite.db` 的 `list` / `insert` / `update` / `remove`。
2. `problemsOf` 在脚本或 `index.html` 里出现 `localStorage`、`sessionStorage`、`indexedDB` 时，必须记成问题。缺任何一个 `data-feature="<功能id>"` 也是问题。
3. 校验不过时，重写所有 `.html` 和 `.js`。最多两轮。两轮后仍有问题，步骤标 `failed`，`verifyResult` 写下原因，文件仍然保存，方便预览。不要把失败伪装成成功。
4. 不要调用发布接口。不要改团队领导、产品经理、架构师的停顿方式。
5. 给这条检查补测试。不必为了验收再打一次真实模型。

## 只能改

`lib/prompts/code.ts`、`lib/orchestrator/run-code.ts`、`tests/prompts/**`、以及你为这次检查新加的测试文件。

## 不许改

`components/**`、`app/**`、`lib/sandbox/bridge-sdk.ts`、`lib/orchestrator/run-plan.ts`、`lib/orchestrator/run-spec.ts`、`lib/orchestrator/run-blueprint.ts`、`lib/orchestrator/approve-spec.ts`、`lib/verify/**`、`lib/db/schema.ts`、`package.json`、`.env`。

## 验收

- `npx tsc --noEmit` 通过
- 新增或已有测试能证明：脚本含 `localStorage` 会被当成失败；缺 `data-feature` 会被当成失败
- `npx vitest run` 里和这次有关的测试通过

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
- app/
- lib/sandbox/bridge-sdk.ts
- lib/verify/
- package.json

怎么验的
- 命令：
- 结果：

没验的
-

给接线用的接口
- 无。首轮入口仍是 POST /api/projects/:id/spec 和 POST /api/projects/:id/approve

停住的原因
- 无
```
