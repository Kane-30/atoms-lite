import dotenv from "dotenv";
dotenv.config({ override: true });

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
