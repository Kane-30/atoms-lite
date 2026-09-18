# Module F: Sandbox · Bridge · app_data — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Index:** [2026-09-18-atoms-lite-index.md](./2026-09-18-atoms-lite-index.md) · **Depends on:** C E · **Spec:** §5.5 · M7 · 持久化 D

**Goal:** 预览区真实跑生成物；`postMessage` bridge 读写 `app_data`；刷新后应用数据仍在。

**Architecture:** 父页鉴权 project 归属；iframe 无 allow-same-origin；完整 Promise 桥（requestId）。

**Tech Stack:** iframe srcdoc · postMessage

## Global Constraints

见 index §5。sandbox 属性：`allow-scripts allow-forms` only。

---

### Task 1: 完整 Bridge SDK（Promise + requestId）

**Files:**
- Modify: `lib/sandbox/bridge-sdk.ts`
- Create: `components/preview/bridge-host.tsx`, `components/preview/preview-frame.tsx`
- Create: `app/api/projects/[id]/app-data/route.ts`
- Test: `tests/sandbox/bridge-protocol.test.ts`（纯函数编解码）

**Interfaces:**
- Produces:

```ts
// iframe → parent
{ type: "atomslite:req"; id: string; method: "list"|"insert"|"update"|"remove"; collection: string; docId?: string; doc?: unknown; patch?: unknown }
// parent → iframe
{ type: "atomslite:res"; id: string; ok: true; data: unknown } | { type: "atomslite:res"; id: string; ok: false; error: string }
```

- [ ] **Step 1: 重写 BRIDGE_SDK_SOURCE 为真实 Promise 队列**

```js
function call(method, payload) {
  const id = Math.random().toString(36).slice(2);
  return new Promise((resolve, reject) => {
    function onMsg(e) {
      const d = e.data;
      if (!d || d.type !== "atomslite:res" || d.id !== id) return;
      window.removeEventListener("message", onMsg);
      if (d.ok) resolve(d.data); else reject(new Error(d.error));
    }
    window.addEventListener("message", onMsg);
    parent.postMessage({ type: "atomslite:req", id, method, ...payload }, "*");
  });
}
```

- [ ] **Step 2: BridgeHost 校验**
  - 仅处理来自预览 iframe 的消息
  - `requireUser` + project.userId 匹配
  - 调用 DB：`app_data` 按 `(projectId, collection, docId)` upsert/list/delete

- [ ] **Step 3: PreviewFrame**
  - `files` → `assembleSrcdoc` → `iframe.srcdoc`
  - sandbox 属性正确
  - 桌面/手机宽度切换（CSS max-width）

- [ ] **Step 4: 验收**
  - 生成记账本 → 预览写入一条 → 刷新预览/整页 → 数据仍在

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: preview iframe with app_data bridge persistence"
```

---

### Task 2: validate 步接入真实 runtime 错误（可选增强）

**Files:**
- Modify: `components/preview/preview-frame.tsx`, `lib/orchestrator/run-step.ts`
- Create: `app/api/projects/[id]/runtime-error/route.ts`

- [ ] **Step 1: iframe 内 hook `window.onerror` / `unhandledrejection` → postMessage `atomslite:error`**
- [ ] **Step 2: 父页上报后供 validate/自动修复使用**
- [ ] **Step 3: Commit**

```bash
git commit -m "feat: surface sandbox runtime errors to orchestrator"
```

---

### Module F 完成门禁

- [ ] 预览可交互
- [ ] app_data 刷新仍在（持久化 D）
- [ ] 无 allow-same-origin；生成代码无平台凭据
