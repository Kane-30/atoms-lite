# Module B: Data Model · Auth · Projects — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Index:** [2026-09-18-atoms-lite-index.md](./2026-09-18-atoms-lite-index.md) · **Depends on:** Module A · **Spec:** §6 §7 · M1 M2

**Goal:** Neon + Drizzle 落库全表；邮箱密码会话认证；项目创建/列表/按 id 读取。

**Architecture:** Serverless Neon driver；HttpOnly session cookie；仓储函数集中在 `lib/db`。

**Tech Stack:** drizzle-orm · @neondatabase/serverless · bcryptjs · zod

## Global Constraints

见 index §5。Session cookie 名固定：`atoms_session`。密码哈希用 bcrypt cost 10。

---

### Task 1: Drizzle schema 与迁移

**Files:**
- Create: `lib/db/schema.ts`, `lib/db/client.ts`, `drizzle.config.ts`, `drizzle/0000_init.sql`
- Test: `npx drizzle-kit push` 或 migrate 成功

**Interfaces:**
- Produces: 表 `users`, `projects`, `rounds`, `messages`, `steps`, `files`, `snapshots`, `app_data`, `publications`（字段对齐 spec §6.1）

- [ ] **Step 1: 写 schema（核心片段必须齐全）**

```ts
// lib/db/schema.ts
import {
  pgTable, uuid, text, timestamp, integer, numeric, boolean, jsonb,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  status: text("status").notNull().default("active"),
  currentRoundId: uuid("current_round_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const rounds = pgTable("rounds", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  index: integer("index").notNull(),
  prompt: text("prompt").notNull(),
  intentKind: text("intent_kind"),
  status: text("status").notNull().default("created"),
  totalCostUsd: numeric("total_cost_usd", { precision: 12, scale: 6 }).default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  roundId: uuid("round_id").notNull().references(() => rounds.id),
  role: text("role").notNull(), // user | assistant | system
  kind: text("kind").notNull(), // text | step | change_card | error | approval
  content: jsonb("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const steps = pgTable("steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  roundId: uuid("round_id").notNull().references(() => rounds.id),
  seq: integer("seq").notNull(),
  key: text("key").notNull(), // spec | code | validate
  agentRole: text("agent_role").notNull(),
  status: text("status").notNull(),
  output: jsonb("output"),
  changedFiles: jsonb("changed_files"),
  anchorsBefore: jsonb("anchors_before"),
  anchorsAfter: jsonb("anchors_after"),
  verifyResult: text("verify_result"),
  attempts: integer("attempts").default(0).notNull(),
  tokensIn: integer("tokens_in").default(0).notNull(),
  tokensOut: integer("tokens_out").default(0).notNull(),
  costUsd: numeric("cost_usd", { precision: 12, scale: 6 }).default("0"),
  durationMs: integer("duration_ms"),
  snapshotId: uuid("snapshot_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
});

export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  path: text("path").notNull(),
  content: text("content").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const snapshots = pgTable("snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  stepId: uuid("step_id"),
  files: jsonb("files").notNull(),
  anchors: jsonb("anchors").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const appData = pgTable("app_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  collection: text("collection").notNull(),
  docId: text("doc_id").notNull(),
  value: jsonb("value").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const publications = pgTable("publications", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  slug: text("slug").notNull().unique(),
  isPublic: boolean("is_public").default(true).notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 2: client + drizzle config**

```ts
// lib/db/client.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}
```

- [ ] **Step 3: 对 Neon 执行迁移**

```bash
npx drizzle-kit generate && npx drizzle-kit migrate
# 或开发期：npx drizzle-kit push
```

Expected: 九张表存在。

- [ ] **Step 4: Commit**

```bash
git add lib/db drizzle drizzle.config.ts
git commit -m "feat: add Drizzle schema for atoms-lite persistence model"
```

---

### Task 2: 注册 / 登录 / 登出 Session

**Files:**
- Create: `lib/auth/password.ts`, `lib/auth/session.ts`
- Create: `app/api/auth/register/route.ts`, `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`
- Create: `app/register/page.tsx`, `app/login/page.tsx`
- Test: curl 注册→登录→带 cookie 访问受保护接口

**Interfaces:**
- Produces:

```ts
export async function hashPassword(plain: string): Promise<string>;
export async function verifyPassword(plain: string, hash: string): Promise<boolean>;
export async function createSession(userId: string): Promise<void>; // Set-Cookie
export async function destroySession(): Promise<void>;
export async function requireUser(): Promise<{ id: string; email: string }>;
```

- [ ] **Step 1: password + session 实现**

Cookie：`HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`。Session 载荷可用签名 JWT（`SESSION_SECRET`）或服务端随机 token 存 DB；本方案选 **签名 cookie（HMAC）**，payload `{ userId, exp }`，避免再加一张 sessions 表。

- [ ] **Step 2: register/login API**

```ts
// POST /api/auth/register  body: { email, password }
// 校验 email 格式、password length >= 8
// insert users；createSession；返回 { user: { id, email } }

// POST /api/auth/login
// 验密失败 → 401 { error: "invalid_credentials" }

// POST /api/auth/logout → destroySession → { ok: true }
```

- [ ] **Step 3: 手动验收**

```bash
curl -c /tmp/atoms.ck -H 'content-type: application/json' \
  -d '{"email":"a@b.com","password":"password1"}' \
  http://localhost:3000/api/auth/register
curl -b /tmp/atoms.ck -c /tmp/atoms.ck -H 'content-type: application/json' \
  -d '{"email":"a@b.com","password":"password1"}' \
  http://localhost:3000/api/auth/login
```

Expected: 200 + Set-Cookie；错误密码 401。

- [ ] **Step 4: Commit**

```bash
git add lib/auth app/api/auth app/login app/register
git commit -m "feat: email/password auth with signed session cookie"
```

---

### Task 3: 项目 CRUD API + 列表页

**Files:**
- Create: `lib/db/projects.ts`
- Create: `app/api/projects/route.ts`, `app/api/projects/[id]/route.ts`
- Create: `app/projects/page.tsx`
- Test: 登录后创建项目、列表可见、按 id 取回

**Interfaces:**
- Produces:

```ts
export async function createProject(userId: string, title: string, initialPrompt: string): Promise<{
  projectId: string;
  roundId: string;
}>;
// 创建 Project + Round index=1 status=created；写入一条 user message；设置 currentRoundId

export async function listProjects(userId: string): Promise<Array<{
  id: string; title: string; updatedAt: Date; status: string;
}>>;

export async function getProjectForUser(projectId: string, userId: string): Promise<{
  project: ...; rounds: ...; messages: ...; files: ...;
} | null>;
```

- [ ] **Step 1: 实现仓储与 API**

`POST /api/projects` body `{ title?, prompt }` → 需登录 → `createProject`  
`GET /api/projects` → 当前用户全部项目  
`GET /api/projects/:id` → 无权限 404（不泄露存在性）

- [ ] **Step 2: `/projects` 页面列出历史项目，点击进入 `/p/[id]`（工作台页可先占位）**

```tsx
// app/p/[id]/page.tsx 占位
export default async function WorkbenchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div className="p-6">Workbench {id}</div>;
}
```

- [ ] **Step 3: 验收**

刷新后项目仍在；登出再登入列表仍在（持久化 A 层）。

- [ ] **Step 4: Commit**

```bash
git add lib/db/projects.ts app/api/projects app/projects app/p
git commit -m "feat: project create/list/get with round-1 seed"
```

---

### Module B 完成门禁

- [ ] 九表已迁移
- [ ] 注册/登录/登出可用，session 刷新保持
- [ ] 项目创建与列表跨会话可恢复
