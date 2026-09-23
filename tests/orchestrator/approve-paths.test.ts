import { describe, expect, it } from "vitest";
import { pathsFromBlueprintStep } from "@/lib/orchestrator/approve-spec";
import { CODE_PATHS } from "@/lib/prompts/code";

describe("pathsFromBlueprintStep", () => {
  it("reads file paths from a saved blueprint step output", () => {
    const paths = pathsFromBlueprintStep({
      summary: "demo",
      files: [
        { path: "index.html", purpose: "入口" },
        { path: "styles/main.css", purpose: "样式" },
        { path: "scripts/db.js", purpose: "数据" },
        { path: "scripts/calculator.js", purpose: "逻辑" },
        { path: "scripts/app.js", purpose: "交互" },
      ],
      collections: [],
      pages: ["index.html"],
    });
    expect(paths).toEqual([
      "index.html",
      "styles/main.css",
      "scripts/db.js",
      "scripts/calculator.js",
      "scripts/app.js",
    ]);
    expect(paths).not.toEqual([...CODE_PATHS]);
  });

  it("returns undefined when output is missing or empty", () => {
    expect(pathsFromBlueprintStep(null)).toBeUndefined();
    expect(pathsFromBlueprintStep({})).toBeUndefined();
    expect(pathsFromBlueprintStep({ files: [] })).toBeUndefined();
  });
});
