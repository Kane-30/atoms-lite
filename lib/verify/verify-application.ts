import { extractAnchors } from "@/lib/verify/anchors";
import { diffPaths, type FileSnapshot } from "@/lib/verify/diff";

export type VerifyCode =
  | "OK"
  | "NO_FILE_CHANGED"
  | "IDENTICAL_CONTENT"
  | "REGRESSION";

export type VerifyResult = {
  code: VerifyCode;
  changed: string[];
  missingAnchors: string[];
};

function indexByPath(files: FileSnapshot[]): Map<string, string> {
  return new Map(files.map((file) => [file.path, file.content]));
}

function hasRawDifference(before: FileSnapshot[], after: FileSnapshot[]): boolean {
  const beforeMap = indexByPath(before);
  const afterMap = indexByPath(after);
  if (beforeMap.size !== afterMap.size) return true;
  for (const [path, content] of beforeMap) {
    if (afterMap.get(path) !== content) return true;
  }
  return false;
}

export function verifyApplication(input: {
  before: FileSnapshot[];
  after: FileSnapshot[];
  declaredRemovals: string[];
}): VerifyResult {
  const { before, after, declaredRemovals } = input;
  const diff = diffPaths(before, after);
  const changed = [...diff.added, ...diff.removed, ...diff.changed].sort();

  if (!hasRawDifference(before, after)) {
    return { code: "NO_FILE_CHANGED", changed: [], missingAnchors: [] };
  }

  if (changed.length === 0) {
    return { code: "IDENTICAL_CONTENT", changed: [], missingAnchors: [] };
  }

  const anchorsBefore = new Set(before.flatMap((file) => extractAnchors(file.content)));
  const anchorsAfter = new Set(after.flatMap((file) => extractAnchors(file.content)));
  const removals = new Set(declaredRemovals);
  const missingAnchors = [...anchorsBefore]
    .filter((id) => !removals.has(id) && !anchorsAfter.has(id))
    .sort();

  if (missingAnchors.length > 0) {
    return { code: "REGRESSION", changed, missingAnchors };
  }

  return { code: "OK", changed, missingAnchors: [] };
}
