import { describe, expect, it } from "vitest";
import { buildFileTree, type TreeNode } from "@/lib/code-view/tree";

function namesOf(nodes: TreeNode[]): string[] {
  return nodes.flatMap((node) =>
    node.kind === "dir" ? [node.name, ...namesOf(node.children)] : [node.name],
  );
}

describe("buildFileTree", () => {
  it("puts styles/main.css and scripts/app.js in their directories", () => {
    const tree = buildFileTree(["styles/main.css", "scripts/app.js", "index.html"]);

    const styles = tree.find((node) => node.kind === "dir" && node.name === "styles");
    const scripts = tree.find((node) => node.kind === "dir" && node.name === "scripts");
    expect(styles?.kind).toBe("dir");
    expect(scripts?.kind).toBe("dir");
    if (styles?.kind !== "dir" || scripts?.kind !== "dir") return;

    expect(styles.children).toContainEqual({
      kind: "file",
      name: "main.css",
      path: "styles/main.css",
    });
    expect(scripts.children).toContainEqual({
      kind: "file",
      name: "app.js",
      path: "scripts/app.js",
    });
    expect(tree).toContainEqual({
      kind: "file",
      name: "index.html",
      path: "index.html",
    });

    for (const name of namesOf(tree)) {
      expect(name.includes("/")).toBe(false);
    }
  });

  it("drops empty segments so a leading slash is not a directory name", () => {
    const tree = buildFileTree(["/styles/main.css"]);
    expect(tree.some((node) => node.name === "" || node.name.includes("/"))).toBe(false);
    const styles = tree.find((node) => node.kind === "dir" && node.name === "styles");
    expect(styles?.kind).toBe("dir");
    if (styles?.kind !== "dir") return;
    expect(styles.children[0]).toEqual({
      kind: "file",
      name: "main.css",
      path: "styles/main.css",
    });
  });
});
