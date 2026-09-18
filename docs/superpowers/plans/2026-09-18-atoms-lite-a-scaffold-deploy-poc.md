# Module A: Scaffold · Deploy · POC — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Index:** [2026-09-18-atoms-lite-index.md](./2026-09-18-atoms-lite-index.md) · **Spec:** `docs/atoms-demo落地方案规划设计.md` v4.3 §12.2

**Goal:** 建好 Next.js 15 绿场工程，空壳部署可达，三项 POC 全部通过后再写业务。

**Architecture:** App Router 全栈一体；部署主链 EdgeOne Pages，备链 Cloudflare Pages；POC 验证 API 路由、DeepSeek 结构化输出、bridge + srcdoc 组装。

**Tech Stack:** Next.js 15 · TypeScript strict · Tailwind · shadcn/ui · Vercel AI SDK · DeepSeek · Vitest

## Global Constraints

见 [index §5](./2026-09-18-atoms-lite-index.md)。本模块额外：POC 任一失败 → **停手改方案**，不进入 Module B。

---

### Task 1: 初始化 Next.js 工程与基础配置

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.env.example`, `.gitignore`
- Test: 手动 `npm run build`

**Interfaces:**
- Consumes: 无
- Produces: 可本地启动的空壳 App；环境变量模板键名固定如下

```bash
# .env.example
DATABASE_URL=
SESSION_SECRET=
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
LLM_MODEL_FLASH=deepseek-chat
LLM_MODEL_PRO=deepseek-chat
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 1: 创建 Next.js App Router 项目（在仓库根，保留现有 docs/）**

```bash
cd "/Users/lil_p/面试/atoms"
npx create-next-app@15 . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack --yes
```

若 create-next-app 因非空目录拒绝：手动写入 `package.json` 依赖 `next@15` `react` `react-dom` `typescript` `tailwindcss` `zod` `ai` `@ai-sdk/openai` `drizzle-orm` `@neondatabase/serverless` `bcryptjs` `highlight.js`，再 `npm install`。

- [ ] **Step 2: 写落地空壳页**

```tsx
// app/page.tsx
export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">atoms-lite</h1>
      <p className="text-muted-foreground text-sm">scaffold ok</p>
    </main>
  );
}
```

- [ ] **Step 3: 本地验证**

```bash
npm run build && npm run dev
```

Expected: 构建成功；`http://localhost:3000` 显示 `atoms-lite`。

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js 15 atoms-lite app"
```

---

### Task 2: 健康检查 API + EdgeOne 空壳部署（POC-1）

**Files:**
- Create: `app/api/health/route.ts`
- Modify: `.env.example`（如需部署文档注释）
- Create: `docs/poc/poc-1-edgeone.md`（记录结果）

**Interfaces:**
- Produces: `GET /api/health` → `{ ok: true, ts: string }`

- [ ] **Step 1: 实现健康检查**

```ts
// app/api/health/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
```

- [ ] **Step 2: 本地验证**

```bash
curl -s http://localhost:3000/api/health
```

Expected: `{"ok":true,"ts":"..."}`

- [ ] **Step 3: 部署到 EdgeOne Pages**

按 spec §5.7：安装 CLI、`edgeone pages init`、配置环境变量、`edgeone pages deploy`。若失败，立即切 Cloudflare Pages（`@opennextjs/cloudflare` 或平台文档当前推荐方式），并在 `docs/poc/poc-1-edgeone.md` 写明失败原因与备链 URL。

- [ ] **Step 4: 用手机 4G 打开主链接 + 请求 `/api/health`**

Expected: 页面可打开；health 返回 `ok: true`。写入 POC 文档：主 URL、备 URL、是否备案、实测延迟观感。

- [ ] **Step 5: Commit**

```bash
git add app/api/health/route.ts docs/poc/poc-1-edgeone.md
git commit -m "chore: add health API and record EdgeOne POC-1"
```

---

### Task 3: DeepSeek + AI SDK 结构化输出（POC-2）

**Files:**
- Create: `scripts/poc-deepseek-structured.ts`, `docs/poc/poc-2-deepseek.md`
- Create: `lib/llm/client.ts`
- Test: 运行脚本 5 次，记录成功率

**Interfaces:**
- Produces:

```ts
// lib/llm/client.ts
import { createOpenAI } from "@ai-sdk/openai";

export function createLlmProvider() {
  return createOpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY!,
    baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
  });
}

export function flashModel() {
  return createLlmProvider()(process.env.LLM_MODEL_FLASH ?? "deepseek-chat");
}
```

- [ ] **Step 1: 写 POC 脚本（zod schema + generateObject）**

```ts
// scripts/poc-deepseek-structured.ts
import "dotenv/config";
import { generateObject } from "ai";
import { z } from "zod";
import { flashModel } from "../lib/llm/client";

const SpecSchema = z.object({
  appName: z.string(),
  features: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      acceptance: z.string(),
    }),
  ).max(6),
  pages: z.array(z.string()).max(3),
});

async function once() {
  const { object, usage } = await generateObject({
    model: flashModel(),
    schema: SpecSchema,
    prompt: "为一个极简记账本产出功能规格 JSON。功能不超过 4 个。",
  });
  return { object, usage };
}

async function main() {
  const results = [];
  for (let i = 0; i < 5; i++) {
    try {
      const r = await once();
      results.push({ ok: true, usage: r.usage, appName: r.object.appName });
    } catch (e) {
      results.push({ ok: false, error: String(e) });
    }
  }
  console.log(JSON.stringify(results, null, 2));
}

main();
```

- [ ] **Step 2: 运行并记录**

```bash
npx tsx scripts/poc-deepseek-structured.ts
```

Expected: ≥4/5 `ok: true`；记录 usage 与粗算单价到 `docs/poc/poc-2-deepseek.md`。若结构化失败，验证 `response_format` / 换 `generateText` + `JSON.parse` + zod，并把降级路径写入 POC 文档（仍必须可稳定产出合法 JSON）。

- [ ] **Step 3: Commit**

```bash
git add lib/llm/client.ts scripts/poc-deepseek-structured.ts docs/poc/poc-2-deepseek.md
git commit -m "chore: DeepSeek structured-output POC-2"
```

---

### Task 4: Bridge + srcdoc 组装最小验证（POC-3）

**Files:**
- Create: `lib/sandbox/cdn-allowlist.ts`, `lib/sandbox/assemble-srcdoc.ts`, `lib/sandbox/bridge-sdk.ts`
- Create: `app/poc/bridge/page.tsx`（临时页，Module F 后可删或保留）
- Create: `tests/sandbox/assemble-srcdoc.test.ts`, `docs/poc/poc-3-bridge.md`
- Test: Vitest

**Interfaces:**
- Produces:

```ts
export type ProjectFile = { path: string; content: string };

export function assembleSrcdoc(files: ProjectFile[]): {
  html: string;
  missing: string[];
  blockedCdns: string[];
};

export const BRIDGE_SDK_SOURCE: string; // 注入 window.atomslite
```

- [ ] **Step 1: 安装 Vitest 并写失败测试**

```ts
// tests/sandbox/assemble-srcdoc.test.ts
import { describe, it, expect } from "vitest";
import { assembleSrcdoc } from "@/lib/sandbox/assemble-srcdoc";

describe("assembleSrcdoc", () => {
  it("inlines css and js from one-level subdirs", () => {
    const { html, missing } = assembleSrcdoc([
      {
        path: "index.html",
        content: `<!doctype html><html><head>
<link rel="stylesheet" href="styles/main.css">
</head><body>
<script src="scripts/app.js"></script>
</body></html>`,
      },
      { path: "styles/main.css", content: "body{color:red}" },
      { path: "scripts/app.js", content: "window.__ok=true" },
    ]);
    expect(missing).toEqual([]);
    expect(html).toContain("body{color:red}");
    expect(html).toContain("window.__ok=true");
    expect(html).not.toContain('href="styles/main.css"');
    expect(html).toContain("window.atomslite");
  });

  it("reports missing references instead of silent drop", () => {
    const { missing } = assembleSrcdoc([
      {
        path: "index.html",
        content: `<link rel="stylesheet" href="styles/missing.css"><body></body>`,
      },
    ]);
    expect(missing).toContain("styles/missing.css");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
npx vitest run tests/sandbox/assemble-srcdoc.test.ts
```

Expected: FAIL（模块不存在或函数未实现）

- [ ] **Step 3: 实现 allowlist + bridge SDK 字符串 + assembleSrcdoc**

```ts
// lib/sandbox/cdn-allowlist.ts
export const CDN_ALLOWLIST = [
  "cdn.jsdelivr.net",
  "unpkg.com",
  "esm.sh",
] as const;

export function isAllowedCdnUrl(url: string): boolean {
  try {
    const u = new URL(url, "https://example.com");
    if (u.protocol !== "https:" && !url.startsWith("/")) return false;
    if (url.startsWith("/") || url.startsWith("./") || url.startsWith("../")) {
      return true; // local relative — handled by assembler
    }
    return CDN_ALLOWLIST.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}
```

```ts
// lib/sandbox/bridge-sdk.ts
export const BRIDGE_SDK_SOURCE = `
window.atomslite = {
  db: {
    list(collection) {
      return window.parent.postMessage({ type: 'atomslite:db', method: 'list', collection }, '*');
    },
    // 真实 Promise 桥在 Module F 用 requestId 补全；POC 只验证注入与 postMessage 发出
    insert(collection, doc) { return Promise.resolve(doc); },
    update(collection, id, patch) { return Promise.resolve({ id, ...patch }); },
    remove(collection, id) { return Promise.resolve(); },
  },
  toast(message) { console.log('[atomslite.toast]', message); },
  ready() { window.parent.postMessage({ type: 'atomslite:ready' }, '*'); }
};
`.trim();
```

实现 `assembleSrcdoc`：以 `index.html` 为骨架；解析相对路径（含 `./` `../`，最多 2 层）；`<link rel="stylesheet">` → `<style>`；本地 `<script src>` → 内联 `<script>`；外部 script/link 走 `isAllowedCdnUrl`；缺失文件写入 `missing` 并在 HTML 注入 `<!-- MISSING: path -->`；在业务脚本前注入 `BRIDGE_SDK_SOURCE`。

- [ ] **Step 4: 测试通过 + 浏览器 POC 页**

```bash
npx vitest run tests/sandbox/assemble-srcdoc.test.ts
```

Expected: PASS。另：`app/poc/bridge/page.tsx` 用 `srcdoc` 加载组装结果，父页 `message` 监听 `atomslite:ready`，截图/记录到 `docs/poc/poc-3-bridge.md`。

- [ ] **Step 5: Commit**

```bash
git add lib/sandbox tests/sandbox app/poc/bridge docs/poc/poc-3-bridge.md
git commit -m "feat: srcdoc assembler + bridge POC-3"
```

---

### Module A 完成门禁

- [ ] POC-1：主（或备）链接 + `/api/health` 国内可访问
- [ ] POC-2：结构化输出成功率可接受并有书面记录
- [ ] POC-3：组装测试全绿 + iframe ready 事件可见
- [ ] 三项 POC 文档齐备于 `docs/poc/`
