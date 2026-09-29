import { describe, expect, it } from "vitest";
import {
  ensureFeatureAnchors,
  isMetaFeature,
  normalizeSpecFeatures,
  restoreFeatureAnchors,
} from "@/lib/orchestrator/feature-anchors";
import { problemsOf, outcomeOf } from "@/lib/orchestrator/run-code";
import { settleModify } from "@/lib/orchestrator/run-modify";
import type { SpecOutput } from "@/lib/schemas/spec";

const spec: SpecOutput = {
  appName: "待办",
  features: [
    { id: "add-todo", title: "添加待办", acceptance: "能添加" },
    { id: "persist-across-reload", title: "跨刷新保留", acceptance: "用 atomslite.db" },
    { id: "split-style-and-logic", title: "样式逻辑分文件", acceptance: "css/js 分开" },
  ],
  pages: ["home"],
};

describe("normalizeSpecFeatures", () => {
  it("drops meta/process features and keeps interactive ones", () => {
    const normalized = normalizeSpecFeatures(spec);
    expect(normalized.features.map((feature) => feature.id)).toEqual(["add-todo"]);
  });

  it("keeps validate-input as a real UI feature", () => {
    const normalized = normalizeSpecFeatures({
      ...spec,
      features: [
        { id: "validate-input", title: "校验输入", acceptance: "空值不能提交" },
        { id: "persist-across-reload", title: "持久化", acceptance: "刷新还在" },
      ],
    });
    expect(normalized.features.map((feature) => feature.id)).toEqual(["validate-input"]);
  });
});

describe("isMetaFeature", () => {
  it("flags persistence and file-splitting as meta", () => {
    expect(isMetaFeature({ id: "persist-across-reload", title: "跨刷新", acceptance: "x" })).toBe(
      true,
    );
    expect(isMetaFeature({ id: "split-style-and-logic", title: "分文件", acceptance: "x" })).toBe(
      true,
    );
    expect(isMetaFeature({ id: "add-todo", title: "添加", acceptance: "x" })).toBe(false);
  });
});

describe("ensureFeatureAnchors", () => {
  it("stamps missing data-feature ids into index.html so problemsOf passes", () => {
    const html = `<!doctype html><html><body>
<button>添加</button>
<script src="scripts/app.js"></script>
</body></html>`;
    const next = ensureFeatureAnchors(html, [
      { id: "add-todo", title: "添加待办", acceptance: "能添加" },
      { id: "validate-input", title: "校验输入", acceptance: "空值提示" },
    ]);
    expect(next).toContain('data-feature="add-todo"');
    expect(next).toContain('data-feature="validate-input"');
    const files = [
      { path: "index.html", content: next },
      { path: "scripts/app.js", content: "window.atomslite.db.list('todos')" },
      { path: "styles/main.css", content: "body{}" },
    ];
    expect(outcomeOf(problemsOf(files, {
      appName: "待办",
      features: [
        { id: "add-todo", title: "添加待办", acceptance: "能添加" },
        { id: "validate-input", title: "校验输入", acceptance: "空值提示" },
      ],
      pages: ["home"],
    }).issues)).toEqual({ status: "done", verifyResult: "ok" });
  });
});

describe("restoreFeatureAnchors", () => {
  it("puts back data-feature nodes removed during modify", () => {
    const before = `<!doctype html><html><body>
<button data-feature="add-record">记</button>
<button data-feature="filter-by-station">筛选</button>
</body></html>`;
    const after = `<!doctype html><html><body>
<button data-feature="add-record">记一笔</button>
</body></html>`;
    const restored = restoreFeatureAnchors(before, after);
    expect(restored).toContain('data-feature="filter-by-station"');
    expect(restored).toContain('data-feature="add-record"');
  });
});

describe("settleModify with anchor restore", () => {
  it("restores dropped anchors instead of failing as REGRESSION", () => {
    const before = [
      {
        path: "index.html",
        content: '<button data-feature="add-record">记</button><button data-feature="filter-by-station">筛</button>',
      },
    ];
    const settled = settleModify(before, [
      {
        path: "index.html",
        content: '<button data-feature="add-record">记一笔</button>',
      },
    ]);
    expect(settled.code).toBe("OK");
    expect(settled.status).toBe("done");
    expect(settled.after[0].content).toContain('data-feature="filter-by-station"');
  });
});
