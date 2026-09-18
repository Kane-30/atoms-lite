# 线 2：生成应用的数据持久化

把下面整段贴进新窗口，作为第一条消息。

---

你在 `/Users/lil_p/面试/atoms` 做生成应用的数据持久化，只做这一条线。用中文回复。不要 commit，不要 push。

读 `docs/superpowers/plans/2026-09-18-track-2-app-data.md`，按里面的范围改。不要读另外两条线的文档。不要改工作台外观，不要做发布。

做完后按该文档末尾的汇报格式回复，不要写别的总结格式。

---

## 产品里这一条是什么

生成出来的应用通过 `window.atomslite.db` 存数据。现在这套是 iframe 里的内存，刷新就没了。要改成写入 Neon 的 `app_data` 表，刷新后还在。

这是规格里的持久化 D 层和 M7。不是平台用户的登录数据，也不是对话记录。对话和步骤已经在库里，不要重做。

## 现在已经有的

- 表 `app_data` 已在 `lib/db/schema.ts`：`projectId`、`collection`、`docId`、`value`。不要改这张表的定义。
- `lib/sandbox/bridge-sdk.ts` 里的 `window.atomslite.db` 只在内存里改数组，`list` 不经过父页面。
- `lib/sandbox/assemble-srcdoc.ts` 会把这段脚本注入预览。不要改组装器，除非注入点坏了；坏了要在汇报里写原因。
- 工作台 `components/workbench/shell.tsx` 自己放了一个 iframe。本线不要改这个文件。接线以后再做。

## 要做到

1. iframe 里的 `list` / `insert` / `update` / `remove` 都返回 Promise，用 `postMessage` 找父页面。协议：

```ts
// iframe → parent
{ type: "atomslite:req"; id: string; method: "list" | "insert" | "update" | "remove"; collection: string; docId?: string; doc?: unknown; patch?: unknown }
// parent → iframe
{ type: "atomslite:res"; id: string; ok: true; data: unknown } | { type: "atomslite:res"; id: string; ok: false; error: string }
```

2. 父页面只接受自己这个预览 iframe 的消息。要登录，且项目属于当前用户。
3. 数据进 `app_data`。同一 `projectId + collection + docId` 再写入是更新，不是再插一行。`list` 只返回这个项目、这个 collection。
4. 新建 `components/preview/preview-frame.tsx`，供以后挂进工作台。本线不要挂进 `shell.tsx`。用 `app/poc/persist/page.tsx` 自己证明：写入一条，重新请求后还能读到。
5. iframe 的 sandbox 只有 `allow-scripts`。不要加 `allow-same-origin`。

不要加 npm 依赖。不要改生成代码的 prompt，不要重跑模型。

## 只能改这些文件

- `lib/sandbox/bridge-sdk.ts`
- `lib/sandbox/bridge-protocol.ts`（新建，消息的编解码纯函数）
- `lib/db/app-data.ts`（新建）
- `components/preview/**`（新建）
- `app/api/projects/[id]/app-data/route.ts`（新建）
- `app/poc/persist/page.tsx`（新建）
- `tests/sandbox/bridge-protocol.test.ts`（新建）

## 不许改

`components/workbench/shell.tsx`、`app/p/[id]/page.tsx`、`lib/db/schema.ts`、`lib/orchestrator/**`、`app/login/**`、`app/projects/**`、`package.json`、`.env`。

## 验收

- `npx vitest run tests/sandbox/bridge-protocol.test.ts` 通过。至少覆盖：合法请求能解析，缺 `id` 或未知 `method` 被拒绝。
- `npx tsc --noEmit` 通过。
- 用已登录 cookie 调用 app-data 接口写入一条，再读，`value` 还在。第二次写入同一 `docId` 不增加行数。
- `git diff --name-only` 里没有 `components/workbench/shell.tsx`。

数据库在 `.env` 的 `DATABASE_URL`。脚本如果要读 `.env`，用 `dotenv` 且 `override: true`。不要把密钥写进代码或汇报。

## 汇报格式

```
线：2
结果：完成 | 部分完成 | 停住

做完了什么
-

改过的文件
-

确认没改的文件
- components/workbench/shell.tsx（未改）
- lib/db/schema.ts
- lib/orchestrator/
- package.json

怎么验的
- 命令：
- 结果：

没验的
-

给接线用的接口
- PreviewFrame 的路径、导出名、props
- app-data 接口的方法和字段

停住的原因
- 无
```
