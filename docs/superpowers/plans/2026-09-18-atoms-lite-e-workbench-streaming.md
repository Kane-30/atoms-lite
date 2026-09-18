# Module E: Workbench · Streaming · Message Persistence — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Index:** [2026-09-18-atoms-lite-index.md](./2026-09-18-atoms-lite-index.md) · **Depends on:** D · **Spec:** §10.2 §7 · M3 M5 · 持久化 B/C

**Goal:** 落地页示例 + 双栏工作台；左栏对话与步骤；右栏预览 / 代码 / 终端（v4.4，终端已是 M5，不是 P2）。

**Architecture:** 左 28% / 右 72%。右栏三页：预览用已有 srcdoc，代码只读文件树，终端展示步骤与校验结论。个人中心仍是 `/projects`，本模块不重做登录页视觉。

**Tech Stack:** shadcn ResizablePanel · AI SDK UI 流（若用 data stream）或轮询/SSE

## Global Constraints

见 index §5。注册后不丢失已输入 prompt（sessionStorage 键：`atoms_pending_prompt`）。

---

### Task 1: 落地页大输入框 + 三示例 + 登录续写

**Files:**
- Modify: `app/page.tsx`
- Create: `components/landing/prompt-box.tsx`, `lib/examples.ts`

**Interfaces:**
- Produces: 示例 id：`todo` | `ledger` | `habit`，点击填充 textarea

- [ ] **Step 1: 实现三示例文案（中文）与 PromptBox**
  - 未登录提交 → 把 prompt 写入 `sessionStorage` → 跳转 `/register?next=/projects/new`
  - 注册/登录成功 → 读出 prompt → `POST /api/projects` → 进 `/p/[id]`

- [ ] **Step 2: 手动验收「注册不丢输入」**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: landing prompt box with examples and pending prompt"
```

---

### Task 2: 工作台双栏壳 + 步骤卡片 + 折叠行

**Files:**
- Modify: `app/p/[id]/page.tsx`
- Create: `components/workbench/workbench-shell.tsx`, `step-card.tsx`, `completed-steps-fold.tsx`, `chat-stream.tsx`, `top-bar.tsx`

**Interfaces:**
- Consumes: `GET /api/projects/:id` 返回 messages/steps/rounds/files
- Produces: UI 状态仅本地；持久态全在服务端

- [ ] **Step 1: 布局按 §10.2**
  - 顶栏：项目名、本轮/累计成本占位、分享/发布按钮占位、用户
  - 左：消息流 + 步骤卡（显示 agentRole / status / 成本）
  - 已完成步骤折叠为「已完成 N 步」
  - 输入框在底部（本模块可先禁用增量，占位「生成完成后可继续修改」）
  - 右：Tab「预览 | 代码 | 终端」。预览放 iframe；代码放目录树和只读源码；终端放步骤状态与 `verifyResult`

- [ ] **Step 2: 审批 UI**
  - spec 的 step-card 可增删功能项 → 调 approve API → 继续 code

- [ ] **Step 3: 刷新页面对话仍在（持久化 B）**
  - 同一 project 多轮列表可先只显示 round 1（C 层在 I/J 强化）

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: workbench dual-pane with step cards and fold"
```

---

### Task 3: 流式进度接入

**Files:**
- Create: `app/api/projects/[id]/run/stream/route.ts`（或扩展现有 run）
- Modify: `components/workbench/chat-stream.tsx`

**Interfaces:**
- Produces: SSE 事件类型

```ts
type ServerEvent =
  | { type: "step_status"; stepId: string; status: string }
  | { type: "file_progress"; path: string; index: number; total: number }
  | { type: "message"; message: { id: string; kind: string; content: unknown } }
  | { type: "done" }
  | { type: "error"; message: string };
```

- [ ] **Step 1: 后端在 code 步每完成一文件 push `file_progress`**
- [ ] **Step 2: 前端订阅并更新步骤卡文案「正在生成 app.js（2/3）」**
- [ ] **Step 3: Commit**

```bash
git commit -m "feat: streaming progress events for code generation"
```

---

### Module E 完成门禁

- [ ] 示例一键填充；注册不丢 prompt
- [ ] 双栏比例与步骤折叠可用
- [ ] 刷新后消息与步骤仍在
- [ ] 流式进度可见
