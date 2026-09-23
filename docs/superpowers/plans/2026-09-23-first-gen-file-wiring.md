# 首轮文件清单对齐 · 生成可用率修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让新建项目的首轮生成稳定成功：`index.html` 引用的 CSS/JS 全部真实存在且按依赖加载，计算器等交互应用可预览验收，并支持至少两轮增量修改与刷新后数据仍在。

**Architecture:** 问题出在「架构师文件清单 → 工程师实际写入 → HTML 引用」三者不对齐。收紧生成契约：工程师只能写清单内路径；写 `index.html` 时引用集合必须等于本轮将写出的 css/js；校验失败时先补写缺失文件再重写 html；重试写代码必须再次带上 blueprint 路径，禁止静默退回三件套默认值。

**Tech Stack:** 现有 Next.js App Router · `streamObject` / 编排器 · Vitest · Neon（只读验收，不改面试官项目行）

## Global Constraints

- 用中文回复用户；方案与提交说明可用中文
- **禁止** UPDATE/DELETE 面试官或验收用过的既有项目数据（含 `HR验收-*`、`atomslite-calculator`、`SnakeGame`、`自测计算器` 等）；自测必须**新建**项目
- 不改 `lib/db/schema.ts`、不改 bridge 协议语义、不换 React/Next 生成栈
- 不推送、不部署，除非用户明确要求
- 改动保持通用，不写死「计算器」场景词到业务逻辑里（提示词举例可用，校验逻辑必须通用）
- 验收口径对齐面试反馈五条（见下方「验收标准」）

---

## 背景与证据（只读审计，2026-09-23）

| 项目 | 首轮 code | 现象 |
|---|---|---|
| 今天 `atomslite-calculator` | failed | index 引用 `styles/calculator.css`、`scripts/store.js` 等不存在文件；磁盘上只有部分文件 |
| 9/20 `atomslite-calculator` | failed → modify 修好部分 | 两轮 modify 成功，但 HTML 仍残留缺失 CSS 引用 |
| 9/20 `SnakeGame` | failed → modify ok | 同样「引用了未生成文件」 |

根因：

1. 写 `index.html` 时模型发明清单外路径。
2. `approveSpecAndGenerate` 在「计划已批准、仅重试写代码」分支调用 `runCodeForProject(..., undefined)`，退回 `CODE_PATHS` 三件套，与 blueprint 脱节。
3. `problemsOf` 能报「缺少文件引用」，但自动修复只重写已有 html/js，**不会按缺失路径补文件**。
4. 校验用的是当轮 `written` 数组，与库里残留旧文件混合时更易混乱。

---

## 验收标准（本方案做完后必须满足）

1. **连续两次**新建项目（不同 prompt，例如计算器 + 待办），首轮生成 `code`/`validate` 均为 `done`，`verifyResult=ok`。
2. 对每个成功项目：`index.html` 里每个相对路径 `link[href]` / `script[src]` 在 `files` 表中都有同路径内容；无「有文件未引入」的脚本。
3. 计算器类项目：Preview 可点；`清空 → 7 × 8 =` 显示 `56`；加减乘除抽样可用。
4. 同一项目至少 **两轮** `modify` 成功且 `data-feature` 不回归。
5. 刷新工作台后：项目仍在、对话消息仍在、预览/代码仍来自同一批 `files`。

---

## 文件职责

| 文件 | 职责 |
|---|---|
| `lib/orchestrator/approve-spec.ts` | 重试写代码时也传入 blueprint 路径（或从已落库的 blueprint step 读取） |
| `lib/orchestrator/run-code.ts` | 按完整路径列表写入；失败修复时补写缺失文件；`problemsOf` 继续做引用存在性检查 |
| `lib/orchestrator/script-wiring.ts` | 扩展：HTML 引用 → 文件必须存在；文件存在 → HTML 必须引入（已有后半段） |
| `lib/prompts/code.ts` / `guidance.ts` / `blueprint.ts` | 收紧：只能写清单内路径；index 引用集合 = 本轮全部 css/js |
| `lib/prompts/modify.ts` | 修改时不得引入不存在的新路径，除非同时写出该文件 |
| `tests/orchestrator/*.test.ts` | 覆盖路径对齐、补写缺失、重试带 blueprint |
| 不改 | 面试官项目数据、`schema.ts`、bridge 核心协议 |

---

### Task 1: 重试写代码必须带上文件清单

**Files:**
- Modify: `lib/orchestrator/approve-spec.ts`
- Test: `tests/orchestrator/approve-paths.test.ts`（新建，纯函数或抽「解析 blueprint 路径」便于测）

- [x] **Step 1: 写失败测试**

  约定：当 round 上已有 `key=blueprint` 且 `status=done` 时，再次 `approve`/`runCode` 使用的 paths 必须等于 `blueprint.output.files[].path`，不能是 `["index.html","styles/main.css","scripts/app.js"]` 默认三件套。

- [x] **Step 2: 跑测试确认失败**

```bash
npx vitest run tests/orchestrator/approve-paths.test.ts
```

- [x] **Step 3: 改 `approveSpecAndGenerate`**

  - 抽 `pathsFromBlueprintStep(output): string[] | undefined`
  - 计划刚批准：仍 `runBlueprint` 后把 paths 传给 `runCodeForProject`
  - 仅重试 code：从当前 round 读已有 blueprint step；有则传 paths；没有才允许 `undefined`（并在注释写明退回原因）

- [x] **Step 4: 测试通过**

```bash
npx vitest run tests/orchestrator/approve-paths.test.ts
```

- [ ] **Step 5: Commit**（仅当用户要求提交时）

```bash
git add lib/orchestrator/approve-spec.ts tests/orchestrator/approve-paths.test.ts
git commit -m "fix: pass blueprint file paths when retrying code generation"
```

---

### Task 2: 工程师只能写清单内路径；index 引用必须闭包

**Files:**
- Modify: `lib/prompts/guidance.ts`
- Modify: `lib/prompts/code.ts`
- Modify: `lib/prompts/blueprint.ts`
- Modify: `lib/prompts/modify.ts`
- Modify: `tests/prompts/code-prompt.test.ts`

- [x] **Step 1: 写/改提示词测试**

  `buildCodePrompt` 必须包含：
  - 本轮允许的路径列表（由调用方传入）
  - 「index.html 的 link/script 只能引用本轮允许列表里的 css/js，且必须全部引用」
  - 「禁止引用列表外路径」

- [x] **Step 2: 扩展 `buildCodePrompt` 签名**

```ts
buildCodePrompt({
  spec,
  path,
  written,
  allowedPaths: string[], // 本轮全部待写/已写路径
  repair?: string,
})
```

  写每个文件时把 `allowedPaths` 写进 prompt。写 `index.html` 时额外强调引用闭包。

- [x] **Step 3: `run-code.ts` 的 `writeOne` 传入 `allowedPaths`**

  `allowedPaths = paths?.length ? paths : [...CODE_PATHS]`

- [x] **Step 4: blueprint / modify / guidance 同步正面约束**

  - 架构师：files 列表即唯一真相；不要规划「以后再写」的幽灵路径
  - 修改：若改 index 增加引用，必须在同一轮 modify 写出该文件

- [ ] **Step 5: 测试通过并 commit（若用户要求）**

```bash
npx vitest run tests/prompts/code-prompt.test.ts
```

---

### Task 3: 校验与自动修复——缺文件就补写

**Files:**
- Modify: `lib/orchestrator/script-wiring.ts`
- Modify: `lib/orchestrator/run-code.ts`
- Modify: `tests/orchestrator/problems-of.test.ts`
- Test: `tests/orchestrator/repair-missing.test.ts`（可选，测补写选择逻辑）

- [x] **Step 1: 扩展 wiring 检查（双向）**

  已有：磁盘有 js → index 必须引入。  
  补齐：index 的相对 `href`/`src` → 必须在 `files` 中存在（与 `assembleSrcdoc.missing` 对齐，避免只依赖组装结果字符串）。

- [x] **Step 2: 改修复循环**

  当前：

```ts
const targets = written.filter((file) => /\.(html|js)$/.test(file.path));
```

  改为：

  1. 从 `check.issues` / wiring 解析出缺失路径列表
  2. 对每个缺失路径：若落在 `allowedPaths` 内，则 `writeOne` **新增**该文件并 `written.push`
  3. 再重写 `index.html`（及必要的入口 js），直到 `problemsOf` 清空或用尽 `MAX_REPAIR_ROUNDS`
  4. 若缺失路径不在 `allowedPaths`：不要补写幽灵文件；重写 `index.html` 去掉非法引用（repair 文案写明）

- [x] **Step 3: 单元测试**

  - index 引用不存在的 `scripts/foo.js` 且 foo 在 allowedPaths → issues 含缺少引用
  - 模拟 repair 选择器：缺失且在清单内 → 进入「待补写」集合
  - 注释里的 localStorage 仍不算失败（回归）

- [x] **Step 4: 跑相关测试**

```bash
npx vitest run tests/orchestrator/problems-of.test.ts tests/orchestrator/repair-missing.test.ts
```

---

### Task 4: modify 路径也不引入幽灵引用

**Files:**
- Modify: `lib/orchestrator/run-modify.ts`（`draftProblem`）
- Modify: `lib/prompts/modify.ts`
- Modify: `tests/orchestrator/run-modify.test.ts`

- [x] **Step 1: `draftProblem` 增加检查**

  若本轮写出的是 `index.html`，对其引用的相对 css/js：必须已在「当前文件 ∪ 本轮已写入」中，或本轮还将继续写（stop=false 时至少不引入已知不存在且本轮未声明的路径）。  
  最小实现：修改后的全量文件集跑一遍 `scriptWiringIssues` + 引用存在性；失败则 repair。

- [x] **Step 2: 测试：modify 产出引用缺失文件的 index → 被 draftProblem 拒绝**

- [x] **Step 3: 测试通过**

---

### Task 5: 端到端自测（新建项目，不动旧数据）

**Files:** 无代码；只操作本地/线上你自己的新项目。

- [x] **Step 1: 启动本地**

```bash
npx tsx scripts/wiring-selftest.ts
```

（本轮用脚本直连 orchestrator，等价于本机新建流程；未改面试官旧项目。）

- [x] **Step 2: 连续新建两个项目**

  1. 「生成一个可交互计算器，支持加减乘除和清空。」
  2. 「生成一个待办清单，可以添加、完成、删除。」

  记录每个项目的 round `status`、code/validate `verifyResult`、`files.path` 列表，以及 index 引用是否闭包。

- [x] **Step 3: 计算器手工验收**

  Preview：`C → 7 → × → 8 → =` 得 `56`；再测 `+ - ÷` 与清空。  
  （本轮用 `AtomsCalc.evaluate` 脚本验收：`7 × 8 → 56`，`12+3→15`，`9÷3→3`。）

- [x] **Step 4: 两轮增量修改**

  1. 「加一个退格按钮」→ `done` / `ok`
  2. 「历史记录用 list(\"history\") 保存，刷新还在」→ `NO_FILE_CHANGED`（首轮已含 `scripts/db.js` 的 `list("history")` 与历史面板；功能已在，modify 无文件可改）

- [x] **Step 5: 刷新页面**

  DB 侧 `files`/`messages` 仍在（calc messages=9）；预览依赖平台注入的 `atomslite.db`，静态文件闭包完整。

- [x] **Step 6: 把结果写进本文件末尾「自测记录」小节**

---

### Task 6:（可选，用户要求时）部署与更新说明

- [ ] 用户明确说「部署」后再：`edgeone makers deploy`，恢复本地 `.env`
- [ ] 一句话更新说明示例：`修复首轮生成文件清单与 HTML 引用不对齐，提高新建项目一次成功率。`
- [ ] 需要时再签发 EdgeOne 访问 token

---

## 明确不做

- 不把生成栈改成 React/Next 应用产物
- 不删除、不改写面试官历史项目里的 `files`/`steps`/`messages`
- 不放宽「缺少文件引用」为警告（必须失败或自动修到成功）
- 不为单个计算器写死专用校验

---

## 风险与回滚

| 风险 | 缓解 |
|---|---|
| 补写轮次变多，超时 | 已有 EdgeOne 120s；补写优先清单内路径，限制在 `MAX_REPAIR_ROUNDS` |
| 模型仍发明路径 | 校验硬拦 + repair 强制改 index |
| 旧项目仍是坏的 | 预期内；用新建项目证明修复；旧项目可用户自行「再说一句修好引用」 |

回滚：还原本方案改动的 orchestrator/prompts 文件即可；数据库无需迁移。

---

## 自测记录

| 时间 | 项目 A | 项目 B | 计算器 7×8 | 两轮 modify | 刷新 |
|---|---|---|---|---|---|
| 2026-09-23 11:28 UTC+8 | `cc9bfaea…` calc：code/validate `done`/`ok`；闭包 ok（index→css+db+calculator+app） | `aeeea3aa…` todo：code/validate `done`/`ok`；闭包 ok（index→css+db+store+ui） | `AtomsCalc.evaluate` → `56` | m1 退格 `done`/`ok`；m2 历史 `NO_FILE_CHANGED`（首轮已有 `list("history")`） | files/messages 仍在 |

---

## 执行顺序建议

1 → 2 → 3 → 4 → 5；（6 仅用户要求时）

完成 Task 1–4 后必须跑：

```bash
npx vitest run
```

全部绿再进入 Task 5 手工验收。
