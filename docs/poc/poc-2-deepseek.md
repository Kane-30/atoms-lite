# POC-2: DeepSeek + AI SDK structured output

## Result

| Attempt | ok | appName | totalTokens |
|---|---|---|---|
| 1 | true | 极简记账本 | 799 |
| 2 | true | 极简记账本 | 828 |
| 3 | true | 极简记账本 | 757 |
| 4 | true | 极简记账本 | 786 |
| 5 | true | 极简记账本 | 778 |

**Success rate: 5/5** after fixing base URL resolution.

## Root cause of initial 0/5

Shell exported `DEEPSEEK_BASE_URL=https://one-api.sd.sieiot.com/v1` (company gateway).
`dotenv` does not override existing env vars by default, so the DeepSeek-native key
was sent to the gateway → `Invalid token`.

Balance/`curl` against `api.deepseek.com` worked; AI SDK via polluted base URL failed.

## Fix

1. POC scripts: `dotenv.config({ override: true })`
2. `lib/llm/client.ts`: ignore one-api/sieiot hosts unless `ATOMS_DEEPSEEK_BASE_URL` is set; append `/v1`

## Reproduce

```bash
npx tsx scripts/poc-deepseek-structured.ts
```

Do not commit `.env`. If shell still exports a gateway URL, either `unset DEEPSEEK_BASE_URL` or set `ATOMS_DEEPSEEK_BASE_URL=https://api.deepseek.com`.
