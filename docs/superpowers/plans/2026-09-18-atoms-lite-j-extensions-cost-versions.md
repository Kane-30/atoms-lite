# Module J: Extensions · Cost · Version Card · Change Card — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Index:** [2026-09-18-atoms-lite-index.md](./2026-09-18-atoms-lite-index.md) · **Depends on:** I · **Spec:** §10.4 §11 · S1 S2 S3 · §9.7

**Goal:** 延展 1（步骤产出编辑+重跑）、延展 2（任意步骤/轮次回滚）、成本可见、改动卡、版本卡片。

**Architecture:** 回滚=快照还原 files；编辑 spec.output 后重跑下游 code+validate 并新增 round 记录；成本从 step 聚合。

**Tech Stack:** 现有 DB + API

## Global Constraints

见 index §5。回滚 UI：**后续节点变灰标记「已被回滚」**，不物理删除历史。

---

### Task 1: 改动卡 UI（§9.7）

**Files:**
- Create: `components/workbench/change-card.tsx`
- Modify: `components/workbench/chat-stream.tsx`

**Interfaces:**
- Consumes: message.kind=`change_card` content:

```ts
{
  roundIndex: number;
  changed: { path: string; added: number; removed: number }[];
  retainedAnchors: string[];
  costUsd: number;
  durationMs: number;
  status: "applied" | "failed";
  failureReason?: string;
}
```

- [ ] **Step 1: 成功/失败两种卡片；文件名点击 → 切代码 Tab 并定位**
- [ ] **Step 2: 「回到本轮之前」调用 rollback API（Task 3）**
- [ ] **Step 3: Commit**

```bash
git commit -m "feat: change cards for applied and failed rounds"
```

---

### Task 2: 成本可见（S3）

**Files:**
- Modify: `components/workbench/top-bar.tsx`, `components/workbench/step-card.tsx`
- Create: `lib/db/costs.ts`

**Interfaces:**
- Produces:

```ts
export async function sumCosts(projectId: string): Promise<{
  roundCostUsd: number;
  totalCostUsd: number;
}>;
```

- [ ] **Step 1: 顶栏显示本轮 / 累计；步骤卡显示该步 cost**
- [ ] **Step 2: Commit**

```bash
git commit -m "feat: show per-step and cumulative token costs"
```

---

### Task 3: 回滚（S2）

**Files:**
- Create: `app/api/rounds/[id]/rollback/route.ts`, `app/api/steps/[id]/rollback/route.ts`
- Create: `lib/orchestrator/rollback.ts`
- Modify: `components/workbench/step-card.tsx`, `version-card.tsx`

**Interfaces:**
- Produces:

```ts
export async function rollbackToSnapshot(args: {
  projectId: string;
  userId: string;
  snapshotId: string;
  markAfter: "round" | "step";
  anchorId: string;
}): Promise<void>;
// 覆盖 files；写 system message；将之后 rounds/steps 标 grey=rolled_back（status 字段或 metadata）
```

- [ ] **Step 1: API + 仓储实现**
- [ ] **Step 2: UI「回到这里」**
- [ ] **Step 3: 验收：回滚后预览恢复；历史仍可见但变灰**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat: rollback to step/round snapshots"
```

---

### Task 4: 步骤产出编辑 + 重跑（S1）

**Files:**
- Create: `app/api/steps/[id]/rerun/route.ts`
- Modify: `components/workbench/step-card.tsx`（spec 可编辑）

**Interfaces:**
- Produces:

```ts
// POST body: { features: SpecOutput["features"] }
// 响应预检：{ willRerun: ["code","validate"]; estimatedCostUsd: number; estimatedDurationSec: number }
// 确认后：新建 round（prompt=「编辑功能规格并重跑」）→ 重跑 code+validate
```

- [ ] **Step 1: 编辑 UI + 代价预告弹窗（取消 / 保存并重跑）**
- [ ] **Step 2: 重跑后预览更新**
- [ ] **Step 3: Commit**

```bash
git commit -m "feat: edit spec output and rerun downstream with cost preview"
```

---

### Task 5: 版本卡片（输入框上方）

**Files:**
- Create: `components/workbench/version-card.tsx`

- [ ] **Step 1: 展示当前 round；点击打开轮次列表并切换查看历史快照对话/产物**
- [ ] **Step 2: 「回到当前」跳最新 round**
- [ ] **Step 3: Commit**

```bash
git commit -m "feat: version card round switcher above composer"
```

---

### Module J 完成门禁

- [ ] S1 S2 S3 可演示
- [ ] 改动卡与版本卡符合 §10.2 / §9.7
- [ ] 回滚不删历史，只变灰
