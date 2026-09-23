import { describe, expect, it } from "vitest";
import {
  buildAskReplyPrompt,
  buildIntentClassifyPrompt,
  buildUnchangedExplainPrompt,
} from "@/lib/prompts/intent";

describe("intent prompts", () => {
  it("lets the model classify ask vs modify", () => {
    const prompt = buildIntentClassifyPrompt("这个导数功能怎么用？");
    expect(prompt).toContain("intent=ask");
    expect(prompt).toContain("intent=modify");
    expect(prompt).toContain("这个导数功能怎么用？");
  });

  it("builds a free-form ask reply prompt from current files", () => {
    const prompt = buildAskReplyPrompt({
      userPrompt: "这个导数功能怎么用？",
      files: [{ path: "index.html", content: "<button>d/dx</button>" }],
    });
    expect(prompt).toContain("不要改任何文件");
    expect(prompt).toContain("怎么组织回答由你自己决定");
    expect(prompt).toContain("index.html");
    expect(prompt).toContain("<button>d/dx</button>");
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
