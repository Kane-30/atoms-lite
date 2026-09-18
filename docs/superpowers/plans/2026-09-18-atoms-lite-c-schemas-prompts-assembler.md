# Module C: Schemas · Prompts · Assembler Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Index:** [2026-09-18-atoms-lite-index.md](./2026-09-18-atoms-lite-index.md) · **Depends on:** A（assembler 初版）· **Spec:** §5.4 Prompt 表 · D7 D14 D19

**Goal:** 定稿 zod schema 与 Prompt 模板；强化组装器对外链校验；约定 `data-feature` 与路径规则。

**Architecture:** 每步一个 schema + 一个 prompt builder；组装器已在 A，本模块补 CDN 阻断测试与路径边界。

**Tech Stack:** zod · vitest

## Global Constraints

见 index §5。功能项 ≤6；页面 ≤3；路径深度 ≤2。

---

### Task 1: Zod schemas

**Files:**
- Create: `lib/schemas/spec.ts`, `lib/schemas/code.ts`, `lib/schemas/intent.ts`, `lib/schemas/change-plan.ts`, `lib/schemas/validate-fix.ts`
- Test: `tests/schemas/parse.test.ts`

**Interfaces:**
- Produces:

```ts
// SpecOutput
{ appName: string; features: { id: string; title: string; acceptance: string }[]; pages: string[] }

// CodeFileOutput
{ path: string; content: string }

// IntentOutput
{ kind: "modify" | "question" | "new_app" | "ambiguous"; confidence: number; reason: string; targets: string[] }

// ChangePlan
{ targets: string[]; changes: { path: string; description: string }[]; declaredRemovals: string[] }

// CannotOutput
{ status: "cannot"; reason: string }
```

- [ ] **Step 1: 写解析测试（失败先写）**

```ts
import { SpecSchema } from "@/lib/schemas/spec";
import { IntentSchema } from "@/lib/schemas/intent";

it("rejects more than 6 features", () => {
  expect(() =>
    SpecSchema.parse({
      appName: "x",
      features: Array.from({ length: 7 }, (_, i) => ({
        id: `f${i}`, title: "t", acceptance: "a",
      })),
      pages: ["home"],
    }),
  ).toThrow();
});

it("accepts intent kinds", () => {
  expect(IntentSchema.parse({
    kind: "modify", confidence: 0.9, reason: "add filter", targets: ["scripts/app.js"],
  }).kind).toBe("modify");
});
```

- [ ] **Step 2: 实现 schema 使测试通过**

- [ ] **Step 3: Commit**

```bash
git add lib/schemas tests/schemas
git commit -m "feat: zod schemas for spec/code/intent/change-plan"
```

---

### Task 2: Prompt builders

**Files:**
- Create: `lib/prompts/spec.ts`, `lib/prompts/code.ts`, `lib/prompts/validate.ts`, `lib/prompts/intent.ts`, `lib/prompts/modify.ts`

**Interfaces:**
- Produces:

```ts
export function buildSpecPrompt(userPrompt: string): string;
export function buildCodePrompt(args: {
  appName: string;
  features: { id: string; title: string; acceptance: string }[];
  pages: string[];
  existingPaths: string[];
  nextPathHint?: string;
}): string;
export function buildModifyPrompt(args: {
  files: { path: string; content: string }[];
  instruction: string;
  plan: { targets: string[]; changes: { path: string; description: string }[]; declaredRemovals: string[] };
  lastFailureReason?: string;
}): string;
```

- [ ] **Step 1: 实现 Prompt（必须包含硬约束原文级要点）**

`buildCodePrompt` 必须包含：
- `index.html` 为入口；相对路径 ≤2 层
- 只用原生 API + 白名单 CDN
- 必须用 `window.atomslite.db` 读写
- **每个功能主 UI 必须有 `data-feature="<id>"`**
- 空状态；不要一次输出多文件（单文件生成）

`buildModifyPrompt` 必须包含：
- 输出被修改文件的**完整内容**
- 不得删除未在 `declaredRemovals` 中的 `data-feature`
- 无法完成则 `{ status: "cannot", reason }`
- 若有 `lastFailureReason`，原文附入

- [ ] **Step 2: 快照式单测（字符串包含关键约束句）**

```ts
expect(buildCodePrompt({...})).toContain("data-feature");
expect(buildModifyPrompt({... lastFailureReason: "NO_FILE_CHANGED" })).toContain("NO_FILE_CHANGED");
```

- [ ] **Step 3: Commit**

```bash
git add lib/prompts tests/prompts
git commit -m "feat: prompt builders with hard generation contracts"
```

---

### Task 3: 组装器 CDN 阻断与路径边界测试

**Files:**
- Modify: `lib/sandbox/assemble-srcdoc.ts`, `lib/sandbox/cdn-allowlist.ts`
- Test: `tests/sandbox/assemble-srcdoc.test.ts`（扩展）

- [ ] **Step 1: 增加测试**

```ts
it("blocks non-allowlisted CDN scripts", () => {
  const { blockedCdns, html } = assembleSrcdoc([
    {
      path: "index.html",
      content: `<script src="https://evil.example/x.js"></script><body></body>`,
    },
  ]);
  expect(blockedCdns.length).toBeGreaterThan(0);
  expect(html).not.toContain("evil.example");
});

it("rejects paths deeper than 2 segments beyond filename", () => {
  // 约定：styles/a/b.css 深度超限 → missing 或显式 error 列表
  const result = assembleSrcdoc([
    { path: "index.html", content: `<link href="styles/a/b.css" rel="stylesheet">` },
    { path: "styles/a/b.css", content: "x{}" },
  ]);
  expect(result.missing.length + (result.depthViolations?.length ?? 0)).toBeGreaterThan(0);
});
```

按测试补齐 `depthViolations?: string[]` 返回字段。

- [ ] **Step 2: vitest 全绿**

- [ ] **Step 3: Commit**

```bash
git add lib/sandbox tests/sandbox
git commit -m "test: harden srcdoc assembler CDN and depth rules"
```

---

### Module C 完成门禁

- [ ] 四个主 schema 可 parse / reject 边界
- [ ] Prompt 含锚点与完整文件输出约束
- [ ] 组装器 CDN + 深度测试通过
