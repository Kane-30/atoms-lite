# 线 3：工作台轨迹和底部输入

把下面整段贴进新窗口。若已由主会话派发，直接按本文做。

---

你在 `/Users/lil_p/面试/atoms` 改工作台左栏。用中文回复。不要 commit，不要 push，不要部署。

读 `docs/superpowers/plans/2026-09-18-track-3-timeline.md` 并执行。不要改编排，不要实现修改接口。

---

## 现在的问题

左栏是按角色分的卡片：团队领导、产品经理、架构师、工程师。这不是轨迹。轨迹是这一整件事走到了哪一步。底部输入框是关的，占位文字是「增量修改还没接上」。

## 要做到

1. 左栏改成一条按 `seq` 排列的时间线，标题写「已处理 N 步」。N 是状态为 `done` 或 `failed` 的步骤数。
2. 不要用角色名当步骤标题。按 `step.key` 写成这件事：
   - `plan`：开始，或等待批准
   - `spec`：整理功能
   - `blueprint`：定文件
   - `code`：写文件。若 `changedFiles` 是字符串数组，列在这一步下面
   - `validate`：校验
   - `modify`：按新要求改文件
   - 其他 key：用 `agentRole` 兜底
3. `plan` 仍是 `waiting_approval` 时，时间线里保留现有的批准按钮（`PlanApproval`）。不要把批准流程弄丢。
4. 去掉「增量修改还没接上」。底部是一个能输入的框，用现有的 `useSubmitLock`，同一句话 800 毫秒内不重复提交，提交中有 loading。
5. 提交调用 `POST /api/projects/:id/modify`，body `{ "prompt": "..." }`。这个接口由线 2 实现。线 3 只调用。
   - `200`：`router.refresh()`
   - `409`：输入框下显示「还不能改，先等当前这步结束」
   - 其他失败：显示「没改成」
6. 计划还在等待批准时，输入框禁用，占位写「先批准这一轮计划」。
7. 右侧仍是预览和代码。不要加回终端。发布、个人中心、删除项目留在原地。

## 只能改

`components/workbench/shell.tsx`，以及你新建的 `components/workbench/` 下只服务于这条时间线或底部输入的组件。

## 不许改

`lib/**`、`app/api/**`、`app/p/**`、`lib/sandbox/bridge-sdk.ts`、`package.json`、`.env`。不要改 `PlanApproval` 的请求地址，它仍是 `POST /api/projects/:id/approve`。

## 验收

- `npx tsc --noEmit` 通过
- 工作台页面源码里不再出现「增量修改还没接上」
- 源码里能看到「已处理」和时间线用的步骤文案
- 没有浏览器就不要声称点过。源码和 `tsc` 写进汇报

## 汇报格式

```
线：3
结果：完成 | 部分完成 | 停住

做完了什么
-

改过的文件
-

确认没改的文件
- lib/
- app/api/
- package.json

怎么验的
- 命令：
- 结果：

没验的
- 没有在浏览器里点提交。线 2 的接口可能还没有

给接线用的接口
- 只调用 POST /api/projects/:id/modify，没有改它的形状

停住的原因
- 无
```
