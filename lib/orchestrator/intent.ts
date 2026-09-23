export type WorkbenchIntent = "ask" | "modify";

export type RuleIntentResult =
  | { intent: WorkbenchIntent; source: "rule"; reason: string }
  | { intent: null; source: "ambiguous"; reason: string };

const MODIFY_STRONG =
  /帮我加|帮我改|帮我删|帮我修|加一个|加个|加上|增加|添加|改成|修改一下|修改|删掉|删除|去掉|修一下|修复|实现一下|实现|做成|换成|移除/;

const ASK_STRONG =
  /有吗|有没有|在哪[里儿]|在哪个|是什么|怎么[存用看找写]|如何[存用看找写]|如何实现|解释一下|解释|告诉我|什么意思|哪[里儿]有|现有.*吗/;

function hasModify(text: string) {
  return MODIFY_STRONG.test(text);
}

function hasAsk(text: string) {
  return ASK_STRONG.test(text);
}

/** Strong keyword gate. Returns null intent when ambiguous so the model can decide. */
export function ruleClassifyIntent(prompt: string): RuleIntentResult {
  const text = prompt.trim();
  const modify = hasModify(text);
  const ask = hasAsk(text);

  if (modify && ask) {
    return { intent: null, source: "ambiguous", reason: "同时含提问与改动信号" };
  }
  if (modify) {
    return { intent: "modify", source: "rule", reason: "强改动信号" };
  }
  if (ask) {
    return { intent: "ask", source: "rule", reason: "强提问信号" };
  }
  return { intent: null, source: "ambiguous", reason: "无明显信号" };
}

export type IntentDecision = {
  intent: WorkbenchIntent;
  source: "rule" | "model" | "default";
  reason: string;
};

export type ModelIntentClassifier = (prompt: string) => Promise<{
  intent: WorkbenchIntent;
  reason: string;
}>;

/**
 * Hybrid: strong rules first → model for ambiguous → default modify.
 */
export async function classifyWorkbenchIntent(
  prompt: string,
  classifyWithModel?: ModelIntentClassifier,
): Promise<IntentDecision> {
  const ruled = ruleClassifyIntent(prompt);
  if (ruled.intent) {
    return { intent: ruled.intent, source: "rule", reason: ruled.reason };
  }
  if (classifyWithModel) {
    try {
      const judged = await classifyWithModel(prompt);
      if (judged.intent === "ask" || judged.intent === "modify") {
        return {
          intent: judged.intent,
          source: "model",
          reason: judged.reason || "模型判断",
        };
      }
    } catch {
      // fall through to default
    }
  }
  return { intent: "modify", source: "default", reason: "不确定时默认改文件" };
}
