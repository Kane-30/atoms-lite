# Module I: Incremental Modify Reliability — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Index:** [2026-09-18-atoms-lite-index.md](./2026-09-18-atoms-lite-index.md) · **Depends on:** C D E F G · **Spec:** §9 · M9 · G3  
> **并行：** Task 1–3 可在 Module D 之后尽早开始（不依赖 UI）。

**Goal:** 四道闸门落地：意图路由 → 变更计划 → 机械校验 → 三级重试/返工；只承认文件真实变化。

**Architecture:** 规则优先意图路由；`verifyApplication` 纯函数 + 单测；修改写 files 前先快照；失败自动回滚快照。

**Tech Stack:** vitest · AI SDK · zod

## Global Constraints

见 index §5。原则：**模型文字不构成完成证据**。

---

### Task 1: anchors + diff 纯函数（TDD）

**Files:**
- Create: `lib/verify/anchors.ts`, `lib/verify/diff.ts`
- Test: `tests/verify/anchors.test.ts`, `tests/verify/diff.test.ts`

**Interfaces:**
- Produces:

```ts
export type FileMap = Record<string, string>;
export function extractAnchors(files: FileMap): Set<string>; // data-feature="..."
export function diffPaths(before: FileMap, after: FileMap): string[];
export function normalize(content: string): string; // 去尾空白、统一 \n
export function lineDiff(before: string, after: string): { added: number[]; removed: number[] };
```

- [ ] **Step 1: 写失败测试**

```ts
// tests/verify/anchors.test.ts
it("extracts data-feature ids", () => {
  const set = extractAnchors({
    "index.html": `<button data-feature="add-record">x</button><div data-feature='list'></div>`,
  });
  expect([...set].sort()).toEqual(["add-record", "list"]);
});

// tests/verify/diff.test.ts
it("normalize ignores trailing spaces and CRLF", () => {
  expect(normalize("a  \r\n")).toBe(normalize("a\n"));
});
```

- [ ] **Step 2: 跑测确认失败 → 实现 → 全绿**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: anchor extraction and file diff helpers"
```

---

### Task 2: verifyApplication（TDD）— G3 核心

**Files:**
- Create: `lib/verify/verify-application.ts`
- Test: `tests/verify/verify-application.test.ts`

**Interfaces:**
- Produces:

```ts
export type ChangePlan = {
  targets: string[];
  changes: { path: string; description: string }[];
  declaredRemovals: string[];
};

export type VerifyResult =
  | { ok: true; changed: string[]; lineDiffs: Record<string, { added: number[]; removed: number[] }> }
  | { ok: false; reason: "NO_FILE_CHANGED" | "IDENTICAL_CONTENT" | "REGRESSION"; missing?: string[] };

export function verifyApplication(
  before: FileMap,
  after: FileMap,
  anchorsBefore: Set<string>,
  plan: ChangePlan,
): VerifyResult;
```

- [ ] **Step 1: 写测试覆盖四类**

```ts
it("NO_FILE_CHANGED when maps equal", () => {
  const files = { "a.js": "1" };
  const r = verifyApplication(files, { ...files }, new Set(), {
    targets: ["a.js"], changes: [], declaredRemovals: [],
  });
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.reason).toBe("NO_FILE_CHANGED");
});

it("IDENTICAL_CONTENT when only whitespace changes", () => {
  const before = { "a.js": "const x=1" };
  const after = { "a.js": "const x=1   " };
  const r = verifyApplication(before, after, new Set(), {
    targets: ["a.js"], changes: [], declaredRemovals: [],
  });
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.reason).toBe("IDENTICAL_CONTENT");
});

it("REGRESSION when undeclared anchor missing", () => {
  const before = { "index.html": `<b data-feature="add-record"></b>` };
  const after = { "index.html": `<b></b>` };
  const r = verifyApplication(before, after, extractAnchors(before), {
    targets: ["index.html"], changes: [], declaredRemovals: [],
  });
  expect(r.ok).toBe(false);
  if (!r.ok) {
    expect(r.reason).toBe("REGRESSION");
    expect(r.missing).toContain("add-record");
  }
});

it("allows declaredRemovals", () => {
  const before = { "index.html": `<b data-feature="add-record"></b><i data-feature="list"></i>` };
  const after = { "index.html": `<i data-feature="list"></i><button>x</button>` };
  const r = verifyApplication(before, after, extractAnchors(before), {
    targets: ["index.html"],
    changes: [{ path: "index.html", description: "remove add" }],
    declaredRemovals: ["add-record"],
  });
  expect(r.ok).toBe(true);
});
```

- [ ] **Step 2: 实现 `verifyApplication` 使全绿**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: verifyApplication mechanical gate with unit tests"
```

---

### Task 3: 意图路由（规则优先）

**Files:**
- Create: `lib/intent/rules.ts`, `lib/intent/route.ts`
- Test: `tests/intent/rules.test.ts`

**Interfaces:**
- Produces:

```ts
export type IntentKind = "modify" | "question" | "new_app" | "ambiguous";
export type IntentResult = {
  kind: IntentKind;
  confidence: number;
  reason: string;
  targets: string[];
  source: "rules" | "llm";
};

export function routeIntentRules(args: {
  message: string;
  hasApp: boolean;
}): IntentResult | null; // null → 需 LLM

export async function routeIntent(args: {
  message: string;
  hasApp: boolean;
}): Promise<IntentResult>;
```

- [ ] **Step 1: 规则测试**

```ts
expect(routeIntentRules({
  message: "加一个导出 CSV 的按钮",
  hasApp: true,
})?.kind).toBe("modify");

expect(routeIntentRules({
  message: "为什么你用 index.html 而不是 React？",
  hasApp: true,
})?.kind).toBe("question");

expect(routeIntentRules({
  message: "改一下",
  hasApp: true,
})).toBeNull(); // 交给 LLM / ambiguous
```

- [ ] **Step 2: 实现规则；LLM 兜底用 IntentSchema；confidence < 0.7 → ambiguous**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: intent router with rules-first classification"
```

---

### Task 4: 增量修改编排（计划 → 执行 → 校验 → 重试）

**Files:**
- Create: `lib/orchestrator/run-modify.ts`
- Create: `app/api/projects/[id]/rounds/route.ts`
- Modify: `components/workbench/chat-stream.tsx`（启用输入）

**Interfaces:**
- Produces:

```ts
export async function runModifyRound(args: {
  projectId: string;
  userId: string;
  prompt: string;
}): Promise<{
  roundId: string;
  status: "applied" | "answered" | "clarifying" | "failed" | "reverted";
  verify?: VerifyResult;
}>;
```

- [ ] **Step 1: POST `/api/projects/:id/rounds`**
  - 同一 project 下 `index = max+1`（**禁止 new project**）
  - 写 user message
  - `routeIntent`
  - `question` → 回答 + 标注未改文件 + 可选「改为直接执行」按钮数据
  - `ambiguous` → 澄清问题 + 默认动作按钮
  - `modify` → 生成 ChangePlan（可与执行同一次 LLM，字段兼容）→ 快照 → 调模型拿完整文件 → verify
  - 失败：带 reason 重试，最多 3 次；第 3 次可拆子步骤（先 HTML 后 JS）
  - REGRESSION：恢复快照，status=`reverted`
  - 成功：upsert files；写 change 所需字段到 step；status=`applied`

- [ ] **Step 2: UI 气泡徽标**
  - `✓ 已修改 N 个文件` / `💬 仅回答` / `❓ 需要确认` / `⟳ 重试` / `✗ 失败`

- [ ] **Step 3: 把 `lineDiffs` 传给 Code View**

- [ ] **Step 4: 手工跑 §9.8 T1 T4 T5 冒烟**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: incremental modify loop with verify and retry"
```

---

### Task 5: 返工入口

**Files:**
- Modify: `components/workbench/change-failure-card.tsx`（新建）

- [ ] **Step 1: 失败卡按钮**
  - 换个说法重试
  - 手动指定要改的文件（把 paths 写入下一轮 plan.targets 强制）
  - 撤销本轮（恢复快照）

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: explicit rework actions on modify failure"
```

---

### Module I 完成门禁

- [ ] `tests/verify/*` 全绿（含四类 VerifyResult）
- [ ] T1/T4/T5 冒烟通过
- [ ] 多轮修改不新建 project
- [ ] 代码视图可见改动标记
