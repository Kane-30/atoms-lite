export type FileNode = {
  kind: "file";
  name: string;
  path: string;
};

export type DirNode = {
  kind: "dir";
  name: string;
  path: string;
  children: TreeNode[];
};

export type TreeNode = FileNode | DirNode;

export function buildFileTree(paths: string[]): TreeNode[] {
  const root: DirNode = { kind: "dir", name: "", path: "", children: [] };

  for (const raw of paths) {
    const parts = raw.split("/").filter((part) => part.length > 0);
    if (parts.length === 0) continue;

    let parent = root;
    for (let index = 0; index < parts.length; index += 1) {
      const name = parts[index];
      if (!name) continue;
      const path = parts.slice(0, index + 1).join("/");
      const last = index === parts.length - 1;

      if (last) {
        const exists = parent.children.some(
          (child) => child.kind === "file" && child.path === path,
        );
        if (!exists) parent.children.push({ kind: "file", name, path });
        continue;
      }

      let dir = parent.children.find(
        (child): child is DirNode => child.kind === "dir" && child.name === name,
      );
      if (!dir) {
        dir = { kind: "dir", name, path, children: [] };
        parent.children.push(dir);
      }
      parent = dir;
    }
  }

  return sortTree(root.children);
}

function sortTree(nodes: TreeNode[]): TreeNode[] {
  const sorted = [...nodes].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name, "en");
  });
  return sorted.map((node) =>
    node.kind === "dir" ? { ...node, children: sortTree(node.children) } : node,
  );
}
