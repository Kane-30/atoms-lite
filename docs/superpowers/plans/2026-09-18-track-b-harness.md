# 线 2：Harness

把下面整段贴进新窗口。若已由主会话派发，直接按本文做。

---

你在 `/Users/lil_p/面试/atoms` 做机械校验。用中文回复。不要 commit，不要 push。不要调用 DeepSeek。

读 `docs/superpowers/plans/2026-09-18-track-b-harness.md` 并执行。不要改编排，不要改页面。

---

## 要做到

做出纯函数，让「模型说改了」和「文件真的变了」分开。

`lib/verify/diff.ts`

- `normalize(content: string): string` 去掉行尾空白和文末多余空行
- `diffPaths(before, after)`，两边都是 `{ path, content }[]`
- 返回 `{ added: string[]; removed: string[]; changed: string[]; unchanged: string[] }`
- 规范化后内容相同算 unchanged，不算 changed

`lib/verify/anchors.ts`

- `extractAnchors(content: string): string[]` 抽出 `data-feature="..."` 的 id，去重并排序

`lib/verify/verify-application.ts`

```ts
export type VerifyCode =
  | "OK"
  | "NO_FILE_CHANGED"
  | "IDENTICAL_CONTENT"
  | "REGRESSION";

export function verifyApplication(input: {
  before: { path: string; content: string }[];
  after: { path: string; content: string }[];
  declaredRemovals: string[];
}): { code: VerifyCode; changed: string[]; missingAnchors: string[] };
```

规则：

- `after` 相对 `before` 没有任何 added/removed/changed → `NO_FILE_CHANGED`
- 有路径差，但规范化后内容都相同 → `IDENTICAL_CONTENT`
- `before` 里的锚点，去掉 `declaredRemovals` 之后，必须仍在 `after` 的全部文件拼起来的锚点里。缺了 → `REGRESSION`，`missingAnchors` 列出缺的 id
- 否则 `OK`

单测放 `tests/verify/verify-application.test.ts`，四个 code 各至少一条。

不要在这个任务里调用这些函数去改生成流程。

## 只能改

`lib/verify/**`、`tests/verify/**`

## 不许改

`lib/orchestrator/**`、`components/**`、`app/**`、`lib/llm/**`、`package.json`

## 验收

`npx vitest run tests/verify/verify-application.test.ts` 通过，并且 `npx tsc --noEmit` 通过。

## 汇报格式

```
线：2
结果：完成 | 部分完成 | 停住

做完了什么
-

改过的文件
-

确认没改的文件
- lib/orchestrator/
- components/
- app/
- package.json

怎么验的
- 命令：
- 结果：

没验的
-

给接线用的接口
- verifyApplication 的路径和参数

停住的原因
- 无
```
