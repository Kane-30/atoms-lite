import { describe, expect, it } from "vitest";
import {
  buildAskReplyPrompt,
  buildIntentClassifyPrompt,
  buildUnchangedExplainPrompt,
} from "@/lib/prompts/intent";

describe("intent prompts", () => {
  it("tells the classifier to prefer ask on hybrid questions", () => {
    const prompt = buildIntentClassifyPrompt("清空有吗？没有就加上");
    expect(prompt).toContain("优先 ask");
    expect(prompt).toContain("清空有吗？没有就加上");
  });

  it("builds an ask reply prompt from current files", () => {
    const prompt = buildAskReplyPrompt({
      userPrompt: "清空在哪",
      files: [{ path: "index.html", content: "<button>C</button>" }],
    });
    expect(prompt).toContain("不要改文件");
    expect(prompt).toContain("index.html");
    expect(prompt).toContain("<button>C</button>");
  });

  it("builds an unchanged explain prompt", () => {
    const prompt = buildUnchangedExplainPrompt({
      userPrompt: "加清空",
      files: [],
      verifyCode: "NO_FILE_CHANGED",
    });
    expect(prompt).toContain("NO_FILE_CHANGED");
    expect(prompt).toContain("不是系统崩溃");
  });
});
