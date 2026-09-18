# 三线并行说明

> 规格：`docs/atoms-demo落地方案规划设计.md` v4.4
> 日期：2026-09-18
> 三个窗口各自只读自己那一份，不要读另外两份来扩范围。

## 为什么是这三条

平台还缺三块，而且这三块的文件不重叠，可以同时做：

| 线 | 文档 | 做完用户能看到什么 |
|---|---|---|
| 1 前台 | [2026-09-18-track-1-account-shell.md](./2026-09-18-track-1-account-shell.md) | 登录、注册、首页、个人中心是一套；工作台左栏是轨迹，右栏预览 / 代码 / 终端还在，代码只读 |
| 2 应用数据 | [2026-09-18-track-2-app-data.md](./2026-09-18-track-2-app-data.md) | 生成应用里的增删改写进 Neon，刷新还在 |
| 3 发布 | [2026-09-18-track-3-publish.md](./2026-09-18-track-3-publish.md) | 登录用户点发布得到稳定链接；未登录打开该链接能看到应用 |

## 三线都不做

增量修改、回滚、成本数字、步骤编辑后重跑、EdgeOne、把仓库推到 GitHub。这些要等三份汇报回到原对话再排。不要提前做。

## 共用禁令

- 不要 `git commit`，不要 `git push`，不要改 git config，不要 `git add -A`
- 不要改 `.env`、`lib/db/schema.ts`、`lib/orchestrator/`、`package.json`、`package-lock.json`
- 不要跑 `neon`、不要部署
- 3000 端口已有开发服务器时，不要再起一个
- 只改自己文档里列出的文件。看到别人的文件只读，不写
- `components/workbench/shell.tsx` 只归线 1。线 2、线 3 做完也不许把组件挂进去。接线留到三份汇报之后

## 汇报格式

三份都用这一份。写在回复正文里，不要另存文件。

```
线：1 | 2 | 3
结果：完成 | 部分完成 | 停住

做完了什么
- 

改过的文件
- 

确认没改的文件
- components/workbench/shell.tsx（线 2、线 3 必须写「未改」）
- lib/db/schema.ts
- lib/orchestrator/
- package.json

怎么验的
- 命令：
- 结果：

没验的
- 

给接线用的接口
- 组件或函数的路径、导出名、参数

停住的原因
- 没有就写「无」
```
