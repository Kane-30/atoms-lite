import { describe, it, expect } from "vitest";
import { assembleSrcdoc } from "@/lib/sandbox/assemble-srcdoc";

describe("assembleSrcdoc", () => {
  it("inlines css and js from one-level subdirs", () => {
    const { html, missing } = assembleSrcdoc([
      {
        path: "index.html",
        content: `<!doctype html><html><head>
<link rel="stylesheet" href="styles/main.css">
</head><body>
<script src="scripts/app.js"></script>
</body></html>`,
      },
      { path: "styles/main.css", content: "body{color:red}" },
      { path: "scripts/app.js", content: "window.__ok=true" },
    ]);
    expect(missing).toEqual([]);
    expect(html).toContain("body{color:red}");
    expect(html).toContain("window.__ok=true");
    expect(html).not.toContain('href="styles/main.css"');
    expect(html).toContain("window.atomslite");
    expect(html).toContain("__atomsliteReady.then");
    expect(html).toContain("localStorage");
  });

  it("still injects the bridge when app code mentions window.atomslite", () => {
    const { html } = assembleSrcdoc([
      {
        path: "index.html",
        content: `<html><head></head><body><script src="scripts/app.js"></script></body></html>`,
      },
      { path: "scripts/app.js", content: "window.atomslite.db.list('notes')" },
    ]);
    expect(html).toContain("atomslite:req");
    expect(html.indexOf("atomslite:req")).toBeLessThan(html.indexOf("window.atomslite.db.list"));
  });

  it("reports missing references instead of silent drop", () => {
    const { missing } = assembleSrcdoc([
      {
        path: "index.html",
        content: `<link rel="stylesheet" href="styles/missing.css"><body></body>`,
      },
    ]);
    expect(missing).toContain("styles/missing.css");
  });
});
