# Workbench Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Index:** [2026-09-18-atoms-lite-index.md](./2026-09-18-atoms-lite-index.md) · **Spec:** v4.4 §10.1 §10.2 M5 M11

**Goal:** 把 `/p/[id]` 从白卡片改成工作台：左对话，右预览 / 代码 / 终端。

**Architecture:** 服务端读项目、步骤、文件，组装 srcdoc；客户端只负责三页切换、步骤折叠和确认按钮。不新加生成接口。登录、注册、个人中心这轮不重做视觉。

**Tech Stack:** Next.js 15 App Router · Tailwind · 已有 `assembleSrcdoc` · 已有 `SpecRunner`

## Global Constraints

- 唯一写路径是对话。代码页只读，不用 `textarea`，不提供保存。
- 终端不是系统 shell。只显示步骤状态、`verifyResult`、预览是否已组装。
- 不做设计页、SEO、广告、增长看板。
- 增量修改输入框可以出现，但本轮不接发送。
- 仓库目标是 `git@github.com:Kane-30/atoms-lite.git`。本轮不推。

---

### Task 1: 工作台壳

**Files:**
- Create: `components/workbench/shell.tsx`
- Modify: `app/p/[id]/page.tsx`
- Modify: `components/workbench/spec-runner.tsx`（放进左栏，去掉独立白卡片的页面级布局）

**Interfaces:**
- Consumes: `getProjectForUser` 的 project / rounds / steps / messages / files；`assembleSrcdoc` 的 `html`
- Produces: 页面上能切换 `预览` / `代码` / `终端` 三个按钮

- [x] **Step 1: 左栏**
  - 项目名、用户原话
  - 步骤按 `seq` 列出，角色用库里的 `agentRole`
  - 全部完成时折叠成「已处理 N 步」，可展开
  - spec 仍在 `waiting_approval` 时，确认区留在左栏
  - 底部版本卡片显示轮次序号和原话摘要
  - 输入框可见、禁用，占位「增量修改还没接上」

- [x] **Step 2: 右栏**
  - 默认预览：有 html 就放 `iframe sandbox="allow-scripts"`
  - 代码：点文件名显示该文件全文，`<pre>` 只读
  - 终端：每步一行，含状态和 `verifyResult`

- [x] **Step 3: 验收**

已生成项目 `282fb99f-b8db-4e5e-972e-00e1391b0fd3` 的 HTML 里要同时出现「预览」「代码」「终端」「已处理」。

不在本任务：语法高亮、引用到对话、流式、个人中心视觉、推送 GitHub。
