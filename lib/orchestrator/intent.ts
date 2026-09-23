export type WorkbenchIntent = "ask" | "modify";

export type IntentDecision = {
  intent: WorkbenchIntent;
  source: "model" | "default";
  reason: string;
};

export type ModelIntentClassifier = (prompt: string) => Promise<{
  intent: WorkbenchIntent;
  reason: string;
}>;

/**
 * Always classify with the model. If the model is missing or fails, default to modify.
 */
export async function classifyWorkbenchIntent(
  prompt: string,
  classifyWithModel?: ModelIntentClassifier,
): Promise<IntentDecision> {
  if (!classifyWithModel) {
    return { intent: "modify", source: "default", reason: "无分类模型，默认改文件" };
  }
  try {
    const judged = await classifyWithModel(prompt.trim());
    if (judged.intent === "ask" || judged.intent === "modify") {
      return {
        intent: judged.intent,
        source: "model",
        reason: judged.reason || "模型判断",
      };
    }
  } catch {
    // fall through
  }
  return { intent: "modify", source: "default", reason: "分类失败，默认改文件" };
}
