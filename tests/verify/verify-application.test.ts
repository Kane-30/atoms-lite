import { describe, expect, it } from "vitest";
import { extractAnchors } from "@/lib/verify/anchors";
import { diffPaths, normalize } from "@/lib/verify/diff";
import { verifyApplication } from "@/lib/verify/verify-application";

function file(path: string, content: string) {
  return { path, content };
}

describe("normalize", () => {
  it("strips trailing whitespace and extra blank lines at the end", () => {
    expect(normalize("a  \r\n")).toBe("a");
    expect(normalize("a\n")).toBe("a");
    expect(normalize("a\n\n\n")).toBe("a");
    expect(normalize("a \n b\t\n")).toBe("a\n b");
  });
});

describe("diffPaths", () => {
  it("counts normalized-equal content as unchanged", () => {
    const diff = diffPaths(
      [file("a.tsx", "x\n")],
      [file("a.tsx", "x  \n\n")],
    );
    expect(diff).toEqual({
      added: [],
      removed: [],
      changed: [],
      unchanged: ["a.tsx"],
    });
  });
});

describe("extractAnchors", () => {
  it("dedupes and sorts data-feature ids", () => {
    expect(
      extractAnchors(
        '<b data-feature="b"></b><b data-feature="a"></b><b data-feature="b"></b>',
      ),
    ).toEqual(["a", "b"]);
  });
});

describe("verifyApplication", () => {
  it("returns NO_FILE_CHANGED when files are identical", () => {
    const files = [file("app.tsx", '<button data-feature="add">x</button>\n')];
    const result = verifyApplication({
      before: files,
      after: files.map((item) => ({ ...item })),
      declaredRemovals: [],
    });
    expect(result).toEqual({
      code: "NO_FILE_CHANGED",
      changed: [],
      missingAnchors: [],
    });
  });

  it("returns IDENTICAL_CONTENT when only trailing whitespace changes", () => {
    const result = verifyApplication({
      before: [file("app.tsx", '<button data-feature="add">x</button>\n')],
      after: [file("app.tsx", '<button data-feature="add">x</button>  \n\n')],
      declaredRemovals: [],
    });
    expect(result).toEqual({
      code: "IDENTICAL_CONTENT",
      changed: [],
      missingAnchors: [],
    });
  });

  it("returns REGRESSION when an undeclared anchor disappears", () => {
    const result = verifyApplication({
      before: [
        file("app.tsx", '<button data-feature="add-record">记</button>\n<p>old</p>'),
      ],
      after: [
        file("app.tsx", '<button data-feature="export">导出</button>\n<p>new</p>'),
      ],
      declaredRemovals: [],
    });
    expect(result.code).toBe("REGRESSION");
    expect(result.missingAnchors).toEqual(["add-record"]);
    expect(result.changed).toEqual(["app.tsx"]);
  });

  it("returns OK when content changes and anchors stay", () => {
    const result = verifyApplication({
      before: [file("app.tsx", '<button data-feature="add-record">记</button>')],
      after: [
        file(
          "app.tsx",
          '<button data-feature="add-record">记一笔</button><button data-feature="export">导出</button>',
        ),
      ],
      declaredRemovals: [],
    });
    expect(result).toEqual({
      code: "OK",
      changed: ["app.tsx"],
      missingAnchors: [],
    });
  });

  it("returns OK when a removed anchor is declared", () => {
    const result = verifyApplication({
      before: [
        file(
          "app.tsx",
          '<button data-feature="add-record">记</button><button data-feature="filter">筛</button>',
        ),
      ],
      after: [file("app.tsx", '<button data-feature="filter">筛选</button>')],
      declaredRemovals: ["add-record"],
    });
    expect(result.code).toBe("OK");
    expect(result.missingAnchors).toEqual([]);
    expect(result.changed).toEqual(["app.tsx"]);
  });

  it("keeps an anchor that moved into another file", () => {
    const result = verifyApplication({
      before: [
        file("a.tsx", '<button data-feature="add">x</button>'),
        file("b.tsx", "old"),
      ],
      after: [
        file("a.tsx", "<div>gone</div>"),
        file("b.tsx", '<button data-feature="add">x</button>'),
      ],
      declaredRemovals: [],
    });
    expect(result.code).toBe("OK");
    expect(result.missingAnchors).toEqual([]);
  });
});
