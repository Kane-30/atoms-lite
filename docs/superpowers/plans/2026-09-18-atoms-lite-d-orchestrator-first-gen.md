# Module D: Orchestrator First-Gen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Index:** [2026-09-18-atoms-lite-index.md](./2026-09-18-atoms-lite-index.md) · **Depends on:** B C · **Spec:** §5.4 §8 · M4 M6

**Goal:** 显式状态机跑通首轮 `spec → (approve) → code → validate`；落 Step/Snapshot/File；计量 tokens。

**Architecture:** 线性状态机；每步执行前打快照；spec 进入 `waiting_approval`；code 逐文件 `streamObject`；validate 记录错误并最多自动修 1 轮。发布**不**在本模块。

**Tech Stack:** AI SDK `streamObject` / `generateObject` · Drizzle

## Global Constraints

见 index §5。`StepKey = 'spec' | 'code' | 'validate'`。`StepStatus` 含 `waiting_approval`。

---

### Task 1: 类型与状态机骨架

**Files:**
- Create: `lib/orchestrator/types.ts`, `lib/orchestrator/state-machine.ts`, `lib/orchestrator/snapshots.ts`
- Test: `tests/orchestrator/state-machine.test.ts`

**Interfaces:**
- Produces:

```ts
export type StepKey = "spec" | "code" | "validate";
export type StepStatus =
  | "pending" | "running" | "waiting_approval" | "done" | "failed";

export function nextStepAfter(key: StepKey, opts: { approved: boolean; hasRuntimeError: boolean }): StepKey | "ready";
export async function captureSnapshot(projectId: string, stepId: string): Promise<string>; // snapshot id
```

- [ ] **Step 1: 状态转移测试**

```ts
expect(nextStepAfter("spec", { approved: false, hasRuntimeError: false })).toBe("spec"); // still waiting — or throw
expect(nextStepAfter("spec", { approved: true, hasRuntimeError: false })).toBe("code");
expect(nextStepAfter("code", { approved: true, hasRuntimeError: false })).toBe("validate");
expect(nextStepAfter("validate", { approved: true, hasRuntimeError: false })).toBe("ready");
```

- [ ] **Step 2: 实现 + `captureSnapshot` 把当前 files 行 + anchors 扫进 `snapshots` 表**

锚点扫描函数可先放 `lib/verify/anchors.ts` 的 `extractAnchorsFromHtml(content: string): Set<string>`（Module I 会扩展）。

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: orchestrator state machine and snapshot capture"
```

---

### Task 2: executeStep(spec) + 审批 API

**Files:**
- Create: `lib/orchestrator/run-step.ts`, `lib/orchestrator/metering.ts`, `lib/pricing.ts`
- Create: `app/api/steps/[id]/approve/route.ts`
- Create: `app/api/projects/[id]/run/route.ts`（启动/继续编排）

**Interfaces:**
- Produces:

```ts
export async function executeStep(stepId: string): Promise<{ paused?: boolean; failed?: boolean }>;
export async function approveSpec(stepId: string, userId: string, features: SpecOutput["features"]): Promise<void>;
export function costFromUsage(usage: { inputTokens: number; outputTokens: number }, model: string): number;
```

- [ ] **Step 1: metering + pricing 表（DeepSeek 单价可配置常量，允许 .env 覆盖）**

- [ ] **Step 2: `executeStep` 对 `spec`**
  1. captureSnapshot  
  2. `streamObject`/`generateObject` + SpecSchema + buildSpecPrompt  
  3. 写 step.output、messages（kind=step）、metering  
  4. status → `waiting_approval`；return `{ paused: true }`

- [ ] **Step 3: approve API**
  - 校验 step 属当前用户项目且 status=`waiting_approval`
  - 允许增删 features 后写回 `output`
  - `approvedAt=now`；status=`done`
  - 创建下一 step `code` pending 并触发执行（或由前端再调 run）

- [ ] **Step 4: 用真实 API 跑一次到审批暂停**

Expected: DB 中有 spec step + message；status waiting_approval。

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: spec step execution with approval pause"
```

---

### Task 3: code 逐文件生成 + validate

**Files:**
- Modify: `lib/orchestrator/run-step.ts`
- Create: `lib/orchestrator/write-files.ts`

**Interfaces:**
- Produces:

```ts
export async function upsertProjectFiles(
  projectId: string,
  files: { path: string; content: string }[],
): Promise<void>;
```

- [ ] **Step 1: code 步**
  - 根据 spec.features 决定文件列表（至少 `index.html`, `styles/main.css`, `scripts/app.js`）
  - **每次 LLM 只生成一个 path 的完整 content**
  - upsert `files`；流式进度通过 message 或 SSE（Module E 接 UI；此处至少落库完整文件）

- [ ] **Step 2: validate 步**
  - `assembleSrcdoc`；若 `missing`/`blockedCdns` 非空 → failed 可修复
  - 自动修复：把错误列表塞进 validate prompt，最多 1 轮改文件
  - 成功 → round status=`applied` 或 `ready`；**不调用 publish**

- [ ] **Step 3: 集成验收（curl/脚本）**

创建项目 → run → approve → code → validate → `files` 表有内容。

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: code+validate steps with per-file generation"
```

---

### Module D 完成门禁

- [ ] 首轮可暂停审批并可继续
- [ ] 文件落库；快照存在
- [ ] 每步有 tokens/cost 字段非空（可为 0 仅当 usage 缺失并记日志）
- [ ] 无自动 publish
