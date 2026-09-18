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
