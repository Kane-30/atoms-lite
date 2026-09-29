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

  it("keeps JS HTML entities intact so &quot; does not break strings after inline", () => {
    const { html } = assembleSrcdoc([
      {
        path: "index.html",
        content: `<html><body><script src="scripts/app.js"></script></body></html>`,
      },
      {
        path: "scripts/app.js",
        content: `var s = "&quot;" + "&nbsp;" + "&lt;" + "&amp;"; window.__entityProbe = s;`,
      },
    ]);
    // After HTML entity decode in browser, script text must still contain the entity *names*
    // as JS source — so we must amp-escape when inlining.
    expect(html).toContain("&amp;quot;");
    expect(html).toContain("&amp;nbsp;");
    expect(html).toContain("&amp;lt;");
    expect(html).toContain("&amp;amp;");
  });
});
