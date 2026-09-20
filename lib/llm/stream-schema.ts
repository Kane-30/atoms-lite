import { streamObject, type LanguageModelUsage } from "ai";
import type { z } from "zod";
import { flashModel } from "@/lib/llm/client";

export async function streamSchema<T>(args: {
  schema: z.Schema<T>;
  prompt: string;
  onPartial?: (partial: unknown) => void;
}): Promise<{ object: T; usage: LanguageModelUsage }> {
  const result = streamObject({
    model: flashModel(),
    schema: args.schema,
    prompt: args.prompt,
  });
  for await (const partial of result.partialObjectStream) {
    args.onPartial?.(partial);
  }
  return { object: await result.object, usage: await result.usage };
}
