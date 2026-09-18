# 线 3：工作台显示四个角色

把下面整段贴进新窗口。若已由主会话派发，直接按本文做。

---

你在 `/Users/lil_p/面试/atoms` 改工作台左栏。用中文回复。不要 commit，不要 push。不要改编排实现。

读 `docs/superpowers/plans/2026-09-18-track-c-workbench-agents.md` 并执行。

---

## 要做到

左栏按步骤展示角色，名字用数据库里的 `agentRole`。新的一轮会出现：团队领导、产品经理、架构师、工程师。

1. 团队领导的步骤如果是 `waiting_approval`，展示他的 `goal`、`scope`、`outOfScope`、`approvalQuestion`，按钮文案是「批准并继续」。点击 `POST /api/projects/:id/approve`，body 可以是 `{}`。进行中锁定，按钮显示「正在执行」。
2. 旧项目如果仍是产品经理的 `spec` 在 `waiting_approval`，保留现在的功能勾选和「确认并开始写代码」。
3. 不要写死只有三个角色。有几条步骤显示几条。
4. 右栏预览、代码、终端、发布、个人中心的位置不要打乱。
5. 底部输入框继续禁用。

批准接口可能要跑很久。等待时不要重复提交。

## 只能改

`components/workbench/**`、`app/p/[id]/page.tsx`

## 不许改

`lib/orchestrator/**`、`lib/llm/**`、`lib/verify/**`、`app/api/**`、`package.json`

## 验收

- `npx tsc --noEmit` 通过
- 打开一个已有项目的 `/p/[id]`，页面里仍有「预览」「代码」「终端」「发布」
- 左栏能渲染 `agentRole`。用一段假的 plan 输出说明批准按钮会在 `key=plan` 且 `waiting_approval` 时出现；如果手头没有这种项目，不要为了验收去改数据库，写进「没验的」

## 汇报格式

```
线：3
结果：完成 | 部分完成 | 停住

做完了什么
-

改过的文件
-

确认没改的文件
- lib/orchestrator/
- lib/llm/
- app/api/
- package.json

怎么验的
- 命令：
- 结果：

没验的
-

给接线用的接口
- 无

停住的原因
- 无
```
