# atoms-lite 模块拆分与任务索引

> **Spec**：`docs/atoms-demo落地方案规划设计.md` v4.4  
> **方法**：superpowers `writing-plans`（多子系统 → 分模块独立计划）  
> **成功标准**：完整可用基线 = Must（M1–M11）+ 延展 S1/S2/S3 + 全量代码视图；P2/W 不进验收  
> **执行**：每个模块计划独立可测；按依赖顺序执行；推荐 `subagent-driven-development` 逐任务推进

---

## 1. 模块依赖图

```
A 脚手架·部署·POC
        │
        ▼
B 数据模型·认证·项目 CRUD
        │
        ▼
C Schema·Prompt·srcdoc 组装器
        │
        ├──────────────────┐
        ▼                  ▼
D 编排器（首轮生成）    I-前置：机械校验纯函数（可与 D 并行）
        │                  │
        ▼                  │
E 双栏工作台·流式·消息落库 │
        │                  │
        ▼                  │
F 沙箱·Bridge·app_data     │
        │                  │
        ▼                  │
G 全量代码视图             │
        │                  │
        ▼                  │
H 一键发布                 │
        │                  │
        └────────┬─────────┘
                 ▼
        I 增量修改全闸门（接校验器）
                 │
                 ▼
        J 延展 1/2·成本·版本卡片·改动卡
                 │
                 ▼
        K 验收·README·说明文档·录屏
```

---

## 2. 计划文件清单

| 模块 | 文件 | 覆盖需求 | 质量门禁 |
|---|---|---|---|
| **A** | [2026-09-18-atoms-lite-a-scaffold-deploy-poc.md](./2026-09-18-atoms-lite-a-scaffold-deploy-poc.md) | 部署可达、技术假设 | G0 前置 |
| **B** | [2026-09-18-atoms-lite-b-data-auth-projects.md](./2026-09-18-atoms-lite-b-data-auth-projects.md) | M1 M2；持久化 A 层基础 | G2 部分 |
| **C** | [2026-09-18-atoms-lite-c-schemas-prompts-assembler.md](./2026-09-18-atoms-lite-c-schemas-prompts-assembler.md) | D7 D19；组装器 | R13 前置 |
| **D** | [2026-09-18-atoms-lite-d-orchestrator-first-gen.md](./2026-09-18-atoms-lite-d-orchestrator-first-gen.md) | M4 M6；首轮 Loop | G1 部分 |
| **E** | [2026-09-18-atoms-lite-e-workbench-streaming.md](./2026-09-18-atoms-lite-e-workbench-streaming.md) | M3 M5；持久化 B/C | G2 G4 部分 |
| **F** | [2026-09-18-atoms-lite-f-sandbox-bridge-appdata.md](./2026-09-18-atoms-lite-f-sandbox-bridge-appdata.md) | M7；持久化 D | G1 G2 |
| **G** | [2026-09-18-atoms-lite-g-code-view.md](./2026-09-18-atoms-lite-g-code-view.md) | M11 | G4 |
| **H** | [2026-09-18-atoms-lite-h-publish.md](./2026-09-18-atoms-lite-h-publish.md) | M10 | G1 |
| **I** | [2026-09-18-atoms-lite-i-incremental-modify.md](./2026-09-18-atoms-lite-i-incremental-modify.md) | M9；§9 全闸门 | G3 |
| **J** | [2026-09-18-atoms-lite-j-extensions-cost-versions.md](./2026-09-18-atoms-lite-j-extensions-cost-versions.md) | S1 S2 S3；改动卡/版本卡 | G5 |
| **K** | [2026-09-18-atoms-lite-k-acceptance-docs.md](./2026-09-18-atoms-lite-k-acceptance-docs.md) | R8–R11；§14 | G0–G6 |

---

## 3. 仓库目标文件结构

应用代码与 `docs/` 并列，位于仓库根目录（绿场新建）：

```
atoms/
├── docs/
│   ├── atoms-demo落地方案规划设计.md
│   ├── Atoms平台调研报告.md
│   └── superpowers/plans/          ← 本目录
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # 落地页 + 大输入框 + 示例
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── projects/page.tsx
│   ├── p/[id]/page.tsx            # 工作台
│   ├── published/[slug]/page.tsx
│   └── api/
│       ├── auth/{register,login,logout}/route.ts
│       ├── projects/route.ts
│       ├── projects/[id]/route.ts
│       ├── projects/[id]/rounds/route.ts
│       ├── projects/[id]/publish/route.ts
│       ├── projects/[id]/app-data/route.ts
│       ├── steps/[id]/approve/route.ts
│       ├── steps/[id]/rerun/route.ts
│       └── rounds/[id]/rollback/route.ts
├── components/
│   ├── landing/
│   ├── workbench/                  # 双栏、步骤卡、版本卡、改动卡
│   ├── preview/                    # iframe + bridge host
│   └── code-view/                  # 文件树 + 只读高亮
├── lib/
│   ├── db/{schema.ts,client.ts,index.ts}
│   ├── auth/{session.ts,password.ts}
│   ├── orchestrator/{types.ts,state-machine.ts,run-step.ts,metering.ts}
│   ├── prompts/{spec.ts,code.ts,validate.ts,intent.ts,modify.ts}
│   ├── schemas/{spec.ts,code.ts,intent.ts,change-plan.ts}
│   ├── sandbox/{assemble-srcdoc.ts,cdn-allowlist.ts,bridge-sdk.ts}
│   ├── verify/{diff.ts,anchors.ts,verify-application.ts}
│   ├── intent/{rules.ts,route.ts}
│   └── pricing.ts
├── drizzle/
├── tests/
│   ├── verify/
│   ├── sandbox/
│   └── intent/
├── package.json
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
├── .env.example
└── README.md
```

---

## 4. 需求覆盖矩阵

| 需求 | 模块 |
|---|---|
| M1 注册登录 | B |
| M2 项目列表/还原 | B E |
| M3 Prompt + 示例 | E |
| M4 三步 Agent | D E |
| M5 双栏工作台 | E |
| M6 计划审批 | D E |
| M7 沙箱预览 | F |
| M8 四层持久化 | B E F |
| M9 增量修改可靠 | I |
| M10 一键发布 | H |
| M11 全量代码视图 | G（改动标记依赖 I 的 diff） |
| S1 步骤编辑重跑 | J |
| S2 回滚 | J（快照在 D） |
| S3 成本可见 | D 计量 + J UI |
| §9.8 T1–T9 | I + K |
| G0–G6 | K |

---

## 5. Global Constraints（所有模块共用）

从 spec v4.4 原文约束，每个任务默认遵守：

1. **唯一写路径是对话** — 代码视图只读；不做 Visual Editor / 真 Theme 面板（W13/D20）
2. **只承认文件系统真实变化** — 完成判定看 diff + 锚点，不看模型文字（§9.0）
3. **生成物** = 纯 HTML/CSS/JS 多文件，路径 ≤2 层，入口 `index.html`（D2/D19）
4. **预览** = `iframe srcdoc` + `sandbox="allow-scripts allow-forms"`，无 `allow-same-origin`（D3）
5. **CDN 白名单** = `cdn.jsdelivr.net` / `unpkg.com` / `esm.sh`（仅 https）
6. **数据** = Neon + Drizzle；应用数据走 `app_data` + `window.atomslite.db` bridge（D4/D5）
7. **编排** = 自研线性状态机，不用 LangChain/LangGraph（D6）
8. **LLM** = Vercel AI SDK + DeepSeek；OpenAI 兼容 `baseURL` 可切换（D8）
9. **发布** = 用户点击触发，不是编排末步（v4.3）
10. **部署** = EdgeOne Pages 主 + Cloudflare Pages 备；不用 Vercel 作提交主链接（D16）
11. **验收集合不因赶工缩小**；P2 仅 C1、C3–C6 不进本次验收。**C2 终端已升入 M5**（右栏第三页，不是系统 shell）
12. **语言** = TypeScript strict；UI = Tailwind + shadcn/ui

---

## 6. 执行顺序（检查清单）

- [ ] A 脚手架·部署·POC
- [ ] B 数据·认证·项目
- [ ] C Schema·Prompt·组装器
- [ ] D 编排器首轮（可与 I 校验器纯函数并行启动）
- [ ] E 工作台·流式
- [ ] F 沙箱·Bridge
- [ ] G 代码视图
- [ ] H 发布
- [ ] I 增量修改
- [ ] J 延展·成本·版本
- [ ] K 验收·文档

**并行建议**：C 完成后，`I` 的 Task 1–3（`verifyApplication` 纯函数 + 单测）可与 D 并行，互不阻塞。

---

## 7. 执行方式（完成后选择）

Plan 拆分完成后可选：

1. **Subagent-Driven（推荐）** — 每任务新 subagent，任务间人工/主 agent 评审  
2. **Inline Execution** — 本会话按 `executing-plans` 批量执行并设检查点
