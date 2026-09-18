# 线 3：一键发布

把下面整段贴进新窗口，作为第一条消息。

---

你在 `/Users/lil_p/面试/atoms` 做一键发布，只做这一条线。用中文回复。不要 commit，不要 push。

读 `docs/superpowers/plans/2026-09-18-track-3-publish.md`，按里面的范围改。不要读另外两条线的文档。不要改工作台文件，不要改登录页，不要做应用数据桥。

做完后按该文档末尾的汇报格式回复，不要写别的总结格式。

---

## 产品里这一条是什么

用户主动发布后，得到一个稳定链接。未登录的人打开这个链接，能看到生成的应用。再点一次发布，链接不变。

规格里是 M10。发布不是生成流程的最后一步。不要在 `lib/orchestrator/` 里自动调用发布。

这不是把整个 atoms-lite 部署到 EdgeOne。EdgeOne 不在这一条里。

## 现在已经有的

- 表 `publications` 已在 `lib/db/schema.ts`：`projectId`、`slug` 唯一、`isPublic`、`publishedAt`。不要改表定义。
- 项目文件在 `files` 表。组装用现成的 `assembleSrcdoc`（`lib/sandbox/assemble-srcdoc.ts`），只调用，不修改。
- 工作台顶栏还没有真正的发布按钮。按钮组件可以做，但不要挂进 `components/workbench/shell.tsx`。

## 要做到

1. `POST /api/projects/:id/publish`：必须登录，且是该项目的主人。项目里没有 `index.html` 时返回 409，不要写出 publications。
2. 第一次发布生成 slug：小写字母和数字，长度 8 到 12。冲突就换一个再写。同一个项目再发布，返回原来的 slug，不新建第二条。
3. 返回 `{ slug, url }`。`url` 用 `NEXT_PUBLIC_APP_URL` 拼出 `/published/:slug`。
4. `GET /published/:slug` 不需要登录。页面里能看到组装后的应用。slug 不存在返回 404。
5. 新建 `components/publish/publish-button.tsx`，点击后调用上面的接口，成功后显示链接。不要在本线把它 import 进工作台。

不要加 npm 依赖。slug 用 `crypto.randomBytes` 即可。

公开页的预览可以沿用现在的内存桥。不要在本线改 `lib/sandbox/bridge-sdk.ts`。公开页的数据持久化等接线时再接。

## 只能改这些文件

- `lib/db/publications.ts`（新建）
- `app/api/projects/[id]/publish/route.ts`（新建）
- `app/published/[slug]/page.tsx`（新建）
- `components/publish/publish-button.tsx`（新建）
- `tests/publish/slug.test.ts`（新建，只测 slug 字符和长度，不要连数据库）

## 不许改

`components/workbench/**`、`app/p/**`、`lib/sandbox/**`、`lib/orchestrator/**`、`lib/db/schema.ts`、`app/login/**`、`app/projects/**`、`package.json`、`.env`。

## 验收

- `npx vitest run tests/publish/slug.test.ts` 通过
- `npx tsc --noEmit` 通过
- 用已登录 cookie：对一个已有 `index.html` 的项目发布，HTTP 200，body 有 `slug` 和 `url`。再发布一次，slug 相同
- 不带 cookie 打开 `/published/:slug`，HTTP 200，HTML 里有 `iframe` 或组装进页面的应用片段
- 不带 cookie 调发布接口，HTTP 401
- `git diff --name-only` 里没有 `components/workbench/shell.tsx`

已有可发布项目：`282fb99f-b8db-4e5e-972e-00e1391b0fd3`。cookie 如果还在 `/tmp/atoms-spec.ck` 可以用。没有就自己注册一个测试用户再发布，不要把邮箱密码写进汇报。

开发服务器已在 http://localhost:3000 时不要再启动。

## 汇报格式

```
线：3
结果：完成 | 部分完成 | 停住

做完了什么
-

改过的文件
-

确认没改的文件
- components/workbench/shell.tsx（未改）
- lib/sandbox/
- lib/orchestrator/
- lib/db/schema.ts
- package.json

怎么验的
- 命令：
- 结果：

没验的
-

给接线用的接口
- PublishButton 的路径、导出名、props
- 发布接口的方法和返回字段

停住的原因
- 无
```
