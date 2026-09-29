import { describe, expect, it } from "vitest";
import {
  alignIndexHtml,
  htmlAssetRefs,
  scriptWiringIssues,
} from "@/lib/orchestrator/script-wiring";
import { assembleSrcdoc } from "@/lib/sandbox/assemble-srcdoc";
import { outcomeOf, problemsOf } from "@/lib/orchestrator/run-code";
import type { SpecOutput } from "@/lib/schemas/spec";

const spec: SpecOutput = {
  appName: "计算器",
  features: [{ id: "calc", title: "计算", acceptance: "能算出结果" }],
  pages: ["home"],
};

/** Reproduce DB case a5029e40: blueprint files exist, index invents ghost css/js. */
function calculatorGhostIndex() {
  return `<!doctype html>
<html>
<head>
  <link rel="stylesheet" href="styles/main.css">
  <link rel="stylesheet" href="styles/calculator.css">
  <link rel="stylesheet" href="styles/history.css">
</head>
<body>
  <button data-feature="calc">7</button>
  <script src="scripts/store.js"></script>
  <script src="scripts/calculator.js"></script>
  <script src="scripts/history.js"></script>
  <script src="scripts/app.js"></script>
</body>
</html>`;
}

const written = [
  { path: "index.html", content: calculatorGhostIndex() },
  { path: "styles/main.css", content: "body{margin:0}" },
  { path: "scripts/db.js", content: "window.atomslite.db.list('history')" },
  { path: "scripts/calculator.js", content: "window.AtomsCalc={}" },
  { path: "scripts/app.js", content: "window.atomslite.db.list('history')" },
];

describe("alignIndexHtml", () => {
  it("rewrites ghost refs to the files that actually exist", () => {
    const aligned = alignIndexHtml(written[0].content, written);
    const refs = htmlAssetRefs(aligned);
    expect(refs.css).toEqual(["styles/main.css"]);
    expect(refs.js).toEqual(["scripts/db.js", "scripts/calculator.js", "scripts/app.js"]);
    expect(aligned).not.toContain("styles/calculator.css");
    expect(aligned).not.toContain("scripts/store.js");
    expect(aligned).not.toContain("scripts/history.js");
  });

  it("puts entry scripts after data and domain scripts even if files array is shuffled", () => {
    const shuffled = [
      { path: "index.html", content: "<html><body></body></html>" },
      { path: "scripts/app.js", content: "window.boot()" },
      { path: "styles/main.css", content: "body{}" },
      { path: "scripts/calculator.js", content: "window.Calc={}" },
      { path: "scripts/db.js", content: "window.DB={}" },
    ];
    const refs = htmlAssetRefs(alignIndexHtml(shuffled[0].content, shuffled));
    expect(refs.js).toEqual(["scripts/db.js", "scripts/calculator.js", "scripts/app.js"]);
  });

  it("makes problemsOf pass after alignment for the calculator ghost case", () => {
    const files = written.map((file) =>
      file.path === "index.html"
        ? { ...file, content: alignIndexHtml(file.content, written) }
        : file,
    );
    const { issues } = problemsOf(files, spec);
    expect(outcomeOf(issues)).toEqual({ status: "done", verifyResult: "ok" });
    expect(assembleSrcdoc(files).missing).toEqual([]);
  });

  it("keeps allowed CDN links and inline scripts", () => {
    const html = `<!doctype html><html><head>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/normalize.css@8/normalize.css">
<link rel="stylesheet" href="styles/ghost.css">
</head><body>
<script>window.__boot=1</script>
<script src="scripts/missing.js"></script>
</body></html>`;
    const files = [
      { path: "index.html", content: html },
      { path: "styles/main.css", content: "body{}" },
      { path: "scripts/app.js", content: "window.atomslite.db.list('x')" },
    ];
    const aligned = alignIndexHtml(html, files);
    expect(aligned).toContain("cdn.jsdelivr.net");
    expect(aligned).toContain("window.__boot=1");
    expect(htmlAssetRefs(aligned)).toEqual({
      css: ["styles/main.css"],
      js: ["scripts/app.js"],
    });
  });
});

describe("path normalization parity", () => {
  it("treats leading-slash refs as the same files assembleSrcdoc finds", () => {
    const files = [
      {
        path: "index.html",
        content: `<!doctype html><html><head><link rel="stylesheet" href="/styles/main.css"></head><body><button data-feature="calc">7</button><script src="/scripts/app.js"></script></body></html>`,
      },
      { path: "styles/main.css", content: "body{}" },
      { path: "scripts/app.js", content: "window.atomslite.db.list('x')" },
    ];
    expect(assembleSrcdoc(files).missing).toEqual([]);
    expect(scriptWiringIssues(files)).toEqual([]);
    expect(outcomeOf(problemsOf(files, spec).issues).status).toBe("done");
  });
});

describe("assembleSrcdoc unclosed script", () => {
  it("still inlines scripts when the closing tag is missing", () => {
    const { html, missing } = assembleSrcdoc([
      {
        path: "index.html",
        content: `<!doctype html><html><head><link rel="stylesheet" href="styles/main.css"></head><body><button>ok</button><script src="scripts/app.js"></body></html>`,
      },
      { path: "styles/main.css", content: "body{color:red}" },
      { path: "scripts/app.js", content: "window.__ok=true" },
    ]);
    expect(missing).toEqual([]);
    expect(html).toContain("window.__ok=true");
  });
});
