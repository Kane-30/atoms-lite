import { createOpenAI } from "@ai-sdk/openai";

/**
 * Prefer project .env over a polluted shell `DEEPSEEK_BASE_URL`
 * (e.g. company one-api gateways that reject DeepSeek-native keys).
 */
export function createLlmProvider() {
  const raw =
    process.env.ATOMS_DEEPSEEK_BASE_URL ||
    process.env.DEEPSEEK_BASE_URL ||
    "https://api.deepseek.com";
  const trimmed = raw.replace(/\/$/, "");
  // If someone exported a one-api gateway by accident, force official host
  // unless ATOMS_DEEPSEEK_BASE_URL is explicitly set.
  const official = "https://api.deepseek.com";
  const chosen =
    !process.env.ATOMS_DEEPSEEK_BASE_URL &&
    /one-api|sieiot/i.test(trimmed)
      ? official
      : trimmed;
  const baseURL = chosen.endsWith("/v1") ? chosen : `${chosen}/v1`;

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is missing");
  }

  return createOpenAI({
    apiKey,
    baseURL,
    fetch: async (input, init) => globalThis.fetch(input, init),
  });
}

export function flashModel() {
  return createLlmProvider()(
    process.env.LLM_MODEL_FLASH ?? "deepseek-chat",
  );
}
