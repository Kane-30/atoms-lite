import "dotenv/config";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createLlmProvider, flashModel } from "../lib/llm/client";

async function main() {
  console.log("keylen", (process.env.DEEPSEEK_API_KEY || "").length);

  // A: inline provider (known working pattern)
  try {
    const provider = createOpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY!,
      baseURL: "https://api.deepseek.com/v1",
      fetch: async (input, init) => globalThis.fetch(input, init),
    });
    const r = await generateText({
      model: provider("deepseek-chat"),
      prompt: "hi",
      maxTokens: 5,
    });
    console.log("INLINE_OK", r.text);
  } catch (e) {
    console.log("INLINE_FAIL", String(e).slice(0, 200));
  }

  // B: shared client
  try {
    const r = await generateText({
      model: createLlmProvider()("deepseek-chat"),
      prompt: "hi",
      maxTokens: 5,
    });
    console.log("CLIENT_OK", r.text);
  } catch (e) {
    console.log("CLIENT_FAIL", String(e).slice(0, 200));
  }

  // C: flashModel
  try {
    const r = await generateText({
      model: flashModel(),
      prompt: "hi",
      maxTokens: 5,
    });
    console.log("FLASH_OK", r.text);
  } catch (e) {
    console.log("FLASH_FAIL", String(e).slice(0, 200));
  }
}

main();
