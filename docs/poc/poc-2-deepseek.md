# POC-2: DeepSeek + AI SDK 结构化输出

**日期:** 2026-09-18  
**脚本:** `npx tsx scripts/poc-deepseek-structured.ts`  
**模型:** `LLM_MODEL_FLASH` → `deepseek-chat`（默认）  
**方式:** Vercel AI SDK `generateObject` + Zod `SpecSchema`

## 目标

对「极简记账本」功能规格做 5 次结构化生成，期望 ≥4/5 返回 `ok: true`，并记录 token usage 与粗算成本。

## 实现

| 文件 | 说明 |
|------|------|
| `lib/llm/client.ts` | `createOpenAI` 指向 DeepSeek OpenAI 兼容端点 |
| `scripts/poc-deepseek-structured.ts` | 循环 5 次 `generateObject`，输出 JSON 结果数组 |

Schema 字段：`appName`、`features[]`（id/title/acceptance，最多 6 项）、`pages[]`（最多 3 项）。

## 运行结果（2026-09-18）

| 轮次 | ok | appName | usage | 备注 |
|------|----|---------|-------|------|
| 1 | false | — | — | `AI_APICallError: Invalid token` |
| 2 | false | — | — | 同上 |
| 3 | false | — | — | 同上 |
| 4 | false | — | — | 同上 |
| 5 | false | — | — | 同上 |

**成功率:** **0/5**（未达 ≥4/5 门槛）

### 根因（认证）

本地 `.env` 已加载 `DEEPSEEK_API_KEY` 与 `DEEPSEEK_BASE_URL=https://api.deepseek.com`。对 `/chat/completions` 的直接探测与脚本结果一致，均返回 **Invalid token**（`new_api_error`），属 API Key 无效或已失效，**非** schema / SDK 集成问题。

在未通过认证前，无法验证 `generateObject` 的结构化成功率，也无法采集真实 `usage`。

## 成本粗算（参考价，待有效 usage 后回填）

DeepSeek 公开价（`deepseek-chat`，仅供参考，以账单为准）：

- 输入约 ¥1 / 百万 tokens
- 输出约 ¥2 / 百万 tokens

单次成功调用粗算：

```
cost ≈ (promptTokens × 1e-6 × 1) + (completionTokens × 1e-6 × 2)  （单位：元）
```

本次 5 次尝试均无 usage，**实际成本 ≈ ¥0**（请求在鉴权阶段失败）。

## 降级路径（brief 要求，未实测）

若 `generateObject` 在有效 Key 下仍不稳定，建议顺序：

1. 确认 DeepSeek 对 OpenAI 兼容 `response_format: json_schema` / structured outputs 的支持情况。
2. 降级为 `generateText`，在 prompt 中嵌入 JSON Schema 说明，要求仅输出 JSON。
3. `JSON.parse` 后用同一 `SpecSchema.safeParse` 校验；失败则重试或修复（最多 N 次）。

降级脚本可复用 `flashModel()` 与 `SpecSchema`，仅替换 `once()` 内调用链。

## 结论

- **代码路径:** 已按 brief 接好 `client` + POC 脚本，依赖 `ai`、`@ai-sdk/openai`、`zod`、`dotenv`、`tsx`。
- **验证:** 阻塞于 **DEEPSEEK_API_KEY 无效**；更换有效 Key 后重新运行脚本并更新上表与成功率即可。

## 复现

```bash
cd "/Users/lil_p/面试/atoms"
npx tsx scripts/poc-deepseek-structured.ts
```

勿将 `.env` 或 API Key 写入本文件或提交到 Git。
