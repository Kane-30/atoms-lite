# 线 1：前台

把下面整段贴进新窗口，作为第一条消息。

---

你在 `/Users/lil_p/面试/atoms` 做 atoms-lite 的前台，只做这一条线。用中文回复。不要 commit，不要 push。

读 `docs/superpowers/plans/2026-09-18-track-1-account-shell.md`，按里面的范围改。不要读另外两条线的文档，不要做增量修改、发布、应用数据入库。

做完后按该文档末尾的汇报格式回复，不要写别的总结格式。

---

## 产品里这一条是什么

用户能进来、能找回自己的项目、能在工作台里看见生成过程。四个面：

- `/login` 登录
- `/register` 注册
- `/` 首页，一句话创建项目
- `/projects` 个人中心：账号、项目列表、进工作台、退出。不是增长看板，不做 SEO、广告、分析图
- `/p/[id]` 工作台：左栏对话和步骤轨迹，右栏预览 / 代码 / 终端

规格里对应 M1、M2、M3、M5、M11 的只读代码页。终端继续显示已有步骤的状态和 `verifyResult`，不要做成系统命令行。

## 现在已经有的

- 登录、注册、退出接口能用。页面能提交，有 800ms 去重和进行中锁定（`lib/ui/use-submit-lock.ts`、`components/ui/submit-button.tsx`）。这两套不要拆。
- 首页有输入框和三个示例。
- `/projects` 能列出项目，标题还是「我的项目」，样式是白底列表。
- `/p/[id]` 已是深色左右栏。左栏有「已处理 N 步」、确认区、禁用的输入框。右栏三个按钮都在。代码页是扁文件列表加 `<pre>`，还不是目录树，也没有行号。

## 要做到

1. 登录和注册互相能去，都能回首页。错误时说明该去注册还是登录。提交中按钮有 loading，输入不可再点。
2. 个人中心标题用「个人中心」。页面上有邮箱、项目名、进入 `/p/[id]`、退出。没有项目时说明回首页创建。
3. 首页保持「说一句话创建」。不要改成工作台。
4. 工作台左栏：步骤可展开，能看到 `agentRole` 和状态。原话还在。确认功能清单的交互还在。输入框继续禁用，占位保持「增量修改还没接上」。
5. 工作台代码页：按 `styles/`、`scripts/` 这种 path 显示目录。点文件后是带行号的只读内容。禁止 `textarea`、`contentEditable`、保存按钮。
6. 预览和终端两个切换还在。不要把预览改成新的数据桥，那是线 2。

视觉收成同一套深色平台，不要四个页面四种白卡片。不要加新的 npm 依赖。

## 只能改这些文件

- `app/page.tsx`
- `app/login/page.tsx`
- `app/register/page.tsx`
- `app/projects/page.tsx`
- `app/p/[id]/page.tsx`
- `components/auth/**`
- `components/landing/**`
- `components/workbench/shell.tsx`
- `components/workbench/spec-runner.tsx`
- `components/ui/submit-button.tsx`
- `components/code-view/**`（新建）
- `lib/code-view/**`（新建）
- `tests/code-view/**`（新建）

## 不许改

`lib/sandbox/**`、`lib/orchestrator/**`、`lib/db/schema.ts`、`app/api/**`、`package.json`、`.env`、发布相关路径、`app/published/**`。

## 验收

- `npx tsc --noEmit` 通过
- 目录树有单测：`styles/main.css` 和 `scripts/app.js` 会进对应目录，不把 `/` 当成文件名的一部分
- 已登录时打开 `/projects`，HTML 里有「个人中心」
- 已登录时打开一个有文件的项目，HTML 里仍有「预览」「代码」「终端」
- 代码页源码里没有用于编辑的 `textarea`

开发服务器已在 http://localhost:3000 时不要再启动。

## 汇报格式

```
线：1
结果：完成 | 部分完成 | 停住

做完了什么
-

改过的文件
-

确认没改的文件
- lib/sandbox/
- lib/orchestrator/
- lib/db/schema.ts
- app/api/
- package.json

怎么验的
- 命令：
- 结果：

没验的
-

给接线用的接口
- 无。本线直接改的是工作台页面

停住的原因
- 无
```
