# Module G: Code View (Read-only Full) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Index:** [2026-09-18-atoms-lite-index.md](./2026-09-18-atoms-lite-index.md) · **Depends on:** E F · **Spec:** §10.3 · M11  
> **Note:** 改动行标记在 Module I 产出 diff 后接线；本模块先交付目录树+只读高亮+复制+引用占位。

**Goal:** 右栏「代码」Tab：文件树 + 只读高亮 + 行号 + 复制 +「引用到对话」；**无任何编辑入口**。

**Architecture:** 数据源 = 当前 `files` 表；树由 `path` 投影；高亮 `highlight.js` 仅 html/css/js。

**Tech Stack:** highlight.js · React

## Global Constraints

见 index §5。唯一写路径是对话——禁止 contentEditable / textarea 编辑源码。

---

### Task 1: 文件树构建纯函数

**Files:**
- Create: `lib/code-view/build-file-tree.ts`
- Test: `tests/code-view/build-file-tree.test.ts`

**Interfaces:**
- Produces:

```ts
export type FileTreeNode =
  | { type: "dir"; name: string; children: FileTreeNode[] }
  | { type: "file"; name: string; path: string; lineCount: number };

export function buildFileTree(files: { path: string; content: string }[]): FileTreeNode[];
```

- [ ] **Step 1: 测试嵌套 path `styles/main.css` / `scripts/app.js`**
- [ ] **Step 2: 实现使测试通过**
- [ ] **Step 3: Commit**

```bash
git commit -m "feat: build file tree from FILE paths"
```

---

### Task 2: Code View UI

**Files:**
- Create: `components/code-view/code-view.tsx`, `file-tree.tsx`, `code-pane.tsx`
- Modify: `components/workbench/workbench-shell.tsx`（接入 Tab）

**Interfaces:**
- Consumes: `files`, optional `diffByPath?: Record<string, number[]>`（改动行，I 后传入）
- Produces: 回调 `onQuoteToChat(path: string)` → 插入 `@path` 到输入框

- [ ] **Step 1: 实现只读 CodePane**
  - highlight.js 注册 html/css/javascript
  - 行号列；无编辑快捷键处理（忽略输入）
  - 顶部：复制、引用到对话
  - 多文件 Tab（已打开文件，无关闭按钮也可先简单切换）

- [ ] **Step 2: 生成中文件树随 files 增长逐个出现**

- [ ] **Step 3: 验收「全站无编辑入口」**
  - 检查无 Save、无 contentEditable

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: read-only code view with tree and highlight"
```

---

### Task 3: 改动徽标接线点（接口预留）

**Files:**
- Modify: `components/code-view/file-tree.tsx`, `code-pane.tsx`

- [ ] **Step 1: 若 `changedPaths` / `diffByPath` 有值，文件名旁显示 `●`，行左侧着色**
- [ ] **Step 2: 无数据时不显示（I 完成前可为永远空）**
- [ ] **Step 3: Commit**

```bash
git commit -m "feat: code view hooks for change markers"
```

---

### Module G 完成门禁

- [ ] 目录结构可见；子目录正确
- [ ] 只读高亮 + 复制 + 引用到对话
- [ ] 无可编辑控件
