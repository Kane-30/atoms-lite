import { describe, expect, it } from "vitest";
import { conversationBlocks, processStartsOpen } from "@/lib/workbench/thread";

describe("conversationBlocks", () => {
  it("puts the process between the user and the assistant in each round", () => {
    expect(
      conversationBlocks(
        [
          { id: "u1", role: "user", roundId: "r1", content: { text: "做一个游戏" } },
          { id: "a1", role: "assistant", roundId: "r1", content: { summary: "写完了" } },
          { id: "u2", role: "user", roundId: "r2", content: { text: "加个音效" } },
          { id: "a2", role: "assistant", roundId: "r2", content: { summary: "音效加上了" } },
        ],
        ["r1", "r2"],
      ),
    ).toEqual([
      { type: "user", id: "u1", text: "做一个游戏" },
      { type: "process", roundId: "r1" },
      { type: "assistant", id: "a1", text: "写完了" },
      { type: "user", id: "u2", text: "加个音效" },
      { type: "process", roundId: "r2" },
      { type: "assistant", id: "a2", text: "音效加上了" },
    ]);
  });
});

describe("processStartsOpen", () => {
  it("stays closed after every step has settled", () => {
    expect(processStartsOpen([{ status: "done" }, { status: "failed" }])).toBe(false);
  });

  it("opens while a step is still running or waiting", () => {
    expect(processStartsOpen([{ status: "done" }, { status: "waiting_approval" }])).toBe(true);
  });
});
