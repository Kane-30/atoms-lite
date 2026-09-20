import { describe, expect, it } from "vitest";
import { buildModifyPrompt } from "@/lib/prompts/modify";
import {
  collectModifyWrites,
  MODIFY_RUNNING_WINDOW_MS,
  modifyBlocked,
  settleModify,
  type GenerateModifyFile,
} from "@/lib/orchestrator/run-modify";

function file(path: string, content: string) {
  return { path, content };
}

function scripted(drafts: { stop: boolean; path: string; content: string }[]): GenerateModifyFile {
  let index = 0;
  return async () => {
    const file = drafts[index] ?? { stop: true, path: "", content: "" };
    index += 1;
    return { file, tokens: { in: 0, out: 0 } };
  };
}

const before = [file("index.html", '<button data-feature="add-record">记</button>')];

describe("settleModify", () => {
  it("turns NO_FILE_CHANGED into a failed step", () => {
    const settled = settleModify(before, []);
    expect(settled.code).toBe("NO_FILE_CHANGED");
    expect(settled.status).toBe("failed");
    expect(settled.verifyResult).toContain("没改到");
    expect(settled.verifyResult).toContain("NO_FILE_CHANGED");
    expect(settled.changedFiles).toEqual([]);
  });

  it("turns IDENTICAL_CONTENT into a failed step", () => {
    const settled = settleModify(before, [
      file("index.html", '<button data-feature="add-record">记</button>  \n\n'),
    ]);
    expect(settled.code).toBe("IDENTICAL_CONTENT");
    expect(settled.status).toBe("failed");
    expect(settled.verifyResult).toContain("没改到");
    expect(settled.verifyResult).toContain("IDENTICAL_CONTENT");
    expect(settled.status).not.toBe("done");
  });

  it("turns REGRESSION into a failed step and keeps the write", () => {
    const broken = '<button data-feature="export">导出</button>';
    const settled = settleModify(before, [file("index.html", broken)]);
    expect(settled.code).toBe("REGRESSION");
    expect(settled.status).toBe("failed");
    expect(settled.verifyResult).toContain("data-feature");
    expect(settled.verifyResult).toContain("add-record");
    expect(settled.after).toEqual([file("index.html", broken)]);
    expect(settled.changedFiles).toEqual(["index.html"]);
  });

  it("turns OK into a done step", () => {
    const settled = settleModify(before, [
      file("index.html", '<button data-feature="add-record">记一笔</button>'),
    ]);
    expect(settled.code).toBe("OK");
    expect(settled.status).toBe("done");
    expect(settled.verifyResult).toBe("ok");
    expect(settled.changedFiles).toEqual(["index.html"]);
  });
});

describe("collectModifyWrites", () => {
  it("uses the injected generator and does not call a model", async () => {
    const calls: number[] = [];
    const { writes } = await collectModifyWrites("把按钮文案改短", before, async ({ written }) => {
      calls.push(written.length);
      if (calls.length === 1) {
        return {
          file: {
            stop: false,
            path: "index.html",
            content: '<button data-feature="add-record">记一笔</button>',
          },
          tokens: { in: 1, out: 1 },
        };
      }
      return { file: { stop: true, path: "", content: "" }, tokens: { in: 0, out: 0 } };
    });
    expect(calls).toEqual([0, 1]);
    const settled = settleModify(before, writes);
    expect(settled.status).toBe("done");
    expect(settled.verifyResult).toBe("ok");
  });

  it("maps a no-op generator to NO_FILE_CHANGED", async () => {
    const { writes } = await collectModifyWrites("改一下", before, scripted([{ stop: true, path: "", content: "" }]));
    const settled = settleModify(before, writes);
    expect(settled.code).toBe("NO_FILE_CHANGED");
    expect(settled.status).toBe("failed");
  });

  it("drops illegal paths and empty list() instead of writing them", async () => {
    const { writes } = await collectModifyWrites(
      "改一下",
      before,
      scripted([
        { stop: false, path: "../../secret", content: "nope" },
        { stop: false, path: "scripts/app.js", content: "window.atomslite.db.list()" },
        { stop: true, path: "", content: "" },
      ]),
    );
    expect(writes).toEqual([]);
  });
});

describe("modifyBlocked", () => {
  const now = 1_000_000;

  it("blocks a plan still waiting for approval", () => {
    expect(
      modifyBlocked([{ key: "plan", status: "waiting_approval", createdAt: new Date(now) }], now),
    ).toBe(true);
  });

  it("blocks a running step younger than three minutes", () => {
    expect(
      modifyBlocked(
        [{ key: "code", status: "running", createdAt: new Date(now - MODIFY_RUNNING_WINDOW_MS + 1) }],
        now,
      ),
    ).toBe(true);
  });

  it("allows a running step that is already three minutes old", () => {
    expect(
      modifyBlocked(
        [{ key: "code", status: "running", createdAt: new Date(now - MODIFY_RUNNING_WINDOW_MS) }],
        now,
      ),
    ).toBe(false);
  });
});

describe("buildModifyPrompt", () => {
  it("keeps the modify contract without a hardcoded app", () => {
    const prompt = buildModifyPrompt({
      userPrompt: "再加一个删除按钮",
      files: before,
      written: [],
    });
    expect(prompt).toContain("window.atomslite.db");
    expect(prompt).toContain("集合名");
    expect(prompt).toContain('list("');
    expect(prompt).not.toContain("禁止 localStorage");
    expect(prompt).toContain("index.html");
    expect(prompt).toContain("data-feature");
    expect(prompt).not.toContain("跳一跳");
  });
});
