# Module H: Publish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Index:** [2026-09-18-atoms-lite-index.md](./2026-09-18-atoms-lite-index.md) · **Depends on:** F · **Spec:** M10 · v4.3 发布为用户触发

**Goal:** 用户点击「发布」生成稳定 slug；`/published/:slug` 未登录可打开并可交互（只读项目数据命名空间）。

**Architecture:** `publications` 表；公开页复用 assembleSrcdoc + bridge，但 bridge 只允许该 projectId 的 app_data（发布态可匿名写自己的数据或只读——**本方案：公开页允许对该 project 的 app_data 读写**，与预览一致，便于分享演示）。

**Tech Stack:** nanoid/slugify

## Global Constraints

见 index §5。不在编排器末尾自动 publish。

---

### Task 1: Publish API

**Files:**
- Create: `lib/db/publications.ts`, `app/api/projects/[id]/publish/route.ts`
- Modify: `components/workbench/top-bar.tsx`

**Interfaces:**
- Produces:

```ts
export async function publishProject(projectId: string, userId: string): Promise<{ slug: string; url: string }>;
// slug: 短横线 + 小写 + nanoid(8)，冲突重试
```

- [ ] **Step 1: POST publish（需登录且为 owner）**
  - 校验项目至少有 `index.html`
  - upsert publication
  - 返回绝对 URL（`NEXT_PUBLIC_APP_URL`）

- [ ] **Step 2: 顶栏按钮调用并展示链接（可复制）**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: user-triggered project publish with slug"
```

---

### Task 2: 公开访问页

**Files:**
- Create: `app/published/[slug]/page.tsx`, `app/api/published/[slug]/app-data/route.ts`

- [ ] **Step 1: 服务端按 slug 取 project files → PreviewFrame**
- [ ] **Step 2: 匿名 app-data API 仅绑定该 publication.projectId**（防遍历：slug 未知则 404）
- [ ] **Step 3: 无痕窗口打开验收**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat: public published app page with sandboxed data"
```

---

### Module H 完成门禁

- [ ] 一键发布得链接
- [ ] 无痕可打开可交互
- [ ] 编排流程不会自动发布
