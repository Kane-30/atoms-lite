export type FileSnapshot = {
  path: string;
  content: string;
};

export type PathDiff = {
  added: string[];
  removed: string[];
  changed: string[];
  unchanged: string[];
};

export function normalize(content: string): string {
  const lines = content.split("\n").map((line) => line.replace(/[ \t\r]+$/g, ""));
  let end = lines.length;
  while (end > 0 && lines[end - 1] === "") end -= 1;
  return lines.slice(0, end).join("\n");
}

function indexByPath(files: FileSnapshot[]): Map<string, string> {
  return new Map(files.map((file) => [file.path, file.content]));
}

export function diffPaths(before: FileSnapshot[], after: FileSnapshot[]): PathDiff {
  const beforeMap = indexByPath(before);
  const afterMap = indexByPath(after);
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];
  const unchanged: string[] = [];

  for (const [path, content] of beforeMap) {
    if (!afterMap.has(path)) {
      removed.push(path);
      continue;
    }
    if (normalize(content) === normalize(afterMap.get(path) ?? "")) {
      unchanged.push(path);
    } else {
      changed.push(path);
    }
  }

  for (const path of afterMap.keys()) {
    if (!beforeMap.has(path)) added.push(path);
  }

  added.sort();
  removed.sort();
  changed.sort();
  unchanged.sort();

  return { added, removed, changed, unchanged };
}
