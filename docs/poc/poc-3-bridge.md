# POC-3: Bridge + srcdoc 组装

**日期:** 2026-09-18  
**路由:** `/poc/bridge`（开发：`npm run dev` 后访问）  
**测试:** `npm test` → `tests/sandbox/assemble-srcdoc.test.ts`

## 目标

验证多文件 mini-app（`index.html` + 相对路径 CSS/JS）可组装为单一 `srcdoc`，并在 iframe 内注入 `window.atomslite`，父页能收到 `atomslite:ready` postMessage。

## 实现

| 文件 | 说明 |
|------|------|
| `lib/sandbox/assemble-srcdoc.ts` | 解析 `index.html`，内联本地 stylesheet/script，记录 `missing` / `blockedCdns` |
| `lib/sandbox/cdn-allowlist.ts` | jsDelivr / unpkg / esm.sh HTTPS 白名单 |
| `lib/sandbox/bridge-sdk.ts` | `BRIDGE_SDK_SOURCE` 注入 `window.atomslite` |
| `app/poc/bridge/page.tsx` | iframe `srcDoc` + 父页 `message` 监听 |

## 自动化测试

```bash
cd "/Users/lil_p/面试/atoms"
npm test
```

| 用例 | 结果 |
|------|------|
| 一层子目录 CSS/JS 内联 + bridge 注入 | PASS |
| 缺失引用写入 `missing` | PASS |

**Vitest:** 2/2 通过（2026-09-18）

## 浏览器验证（手动）

1. `npm run dev`
2. 打开 `http://localhost:3000/poc/bridge`
3. 期望：
   - iframe 内文案为 `iframe ok`
   - 父页 **Parent received ready: yes**
   - **Last message type:** `atomslite:ready`

（本环境未自动截图；请在本地打开上述 URL 确认 UI 状态。）

## 结论

- **组装器:** 相对路径资源内联、缺失文件显式报告、bridge SDK 注入 — 单测覆盖。
- **通信:** POC 页监听 `atomslite:ready`；完整 Promise 型 DB 桥接留待 Module F。

## 复现

```bash
npm test
npm run dev
# 浏览器 → /poc/bridge
```
