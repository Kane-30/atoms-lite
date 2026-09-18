# Module K: Acceptance · Docs · Delivery — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Index:** [2026-09-18-atoms-lite-index.md](./2026-09-18-atoms-lite-index.md) · **Depends on:** A–J · **Spec:** §9.8 §14 · G0–G6

**Goal:** 跑通验收脚本与检查表；README + 说明文档 + 录屏；主备链接可交付。

**Architecture:** 无新业务功能；产出证明完整可用。

**Tech Stack:** 文档 Markdown · 录屏工具自选

## Global Constraints

见 index §5。明确写出 P2/W 未做项及原因。

---

### Task 1: 自动化回归确认

**Files:**
- Modify: `package.json` scripts
- Test: 全量 vitest

- [ ] **Step 1: 确保 scripts**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:verify": "vitest run tests/verify"
  }
}
```

- [ ] **Step 2: `npm test` 全绿（至少 verify/intent/sandbox/schemas/code-view）**

- [ ] **Step 3: Commit**

```bash
git commit -m "test: ensure acceptance unit suite passes"
```

---

### Task 2: §9.8 人工脚本 T1–T9

**Files:**
- Create: `docs/acceptance/t1-t9-results.md`

- [ ] **Step 1: 在同一 project 连续执行 T1→T9（不清空）**
- [ ] **Step 2: 逐项记录：通过 / 失败原因 / 截图链接**
- [ ] **Step 3: 任一项失败 → 回对应模块修复 → 重跑该用例**
- [ ] **Step 4: Commit 结果文档**

```bash
git commit -m "docs: record T1-T9 acceptance results"
```

---

### Task 3: §14.2 / G0–G6 检查表

**Files:**
- Create: `docs/acceptance/gate-checklist.md`

勾选并实证：

| 门禁 | 证据 |
|---|---|
| G0 | 主备 URL + 4G 实测记录 |
| G1 | 六步录屏时间码 |
| G2 | A/B/C/D 四层操作步骤记录 |
| G3 | vitest + T1–T9 |
| G4 | 工作台/代码视图截图 |
| G5 | S1/S2/S3 截图 |
| G6 | README + 说明文档路径 |

- [ ] **Step 1: 填表全部打勾或列出阻塞**
- [ ] **Step 2: Commit**

```bash
git commit -m "docs: complete G0-G6 gate checklist"
```

---

### Task 4: README + 说明文档 + 录屏

**Files:**
- Create: `README.md`
- Create: `docs/说明文档.md`（结构按 spec §14.3）
- Create: `docs/demo.mp4` 或外链

**README 必须含：**
1. 一句话介绍  
2. 主/备在线链接  
3. 本地运行（env 变量）  
4. 架构图（可 mermaid）  
5. 关键决策摘要（唯一写路径、机械校验、为何不用 Sandpack/Vercel 主链）  
6. 未完成：P2/W 列表  
7. 录屏置顶  

- [ ] **Step 1: 写 README 与说明文档**
- [ ] **Step 2: 录制完整流程（含增量修改成功+失败返工）**
- [ ] **Step 3: GitHub public 确认（若尚未建远端，按用户要求创建）**
- [ ] **Step 4: Commit**

```bash
git commit -m "docs: README, writeup, and demo recording links"
```

---

### Task 5: 最终部署确认

- [ ] **Step 1: main 部署 EdgeOne + Cloudflare**
- [ ] **Step 2: 无痕 + 4G 再跑一遍最短路径**
- [ ] **Step 3: 死链检查**
- [ ] **Step 4: 在 index 执行清单全部勾选完成**

---

### Module K 完成门禁 = 产品完成

- [ ] G0–G6 全过
- [ ] T1–T9 全过（或仅记录已修复的已知问题且无 P0 阻塞）
- [ ] 交付物清单 §14.1 齐备
