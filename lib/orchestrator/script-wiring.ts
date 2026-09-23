function normalizePath(path: string): string {
  return path.replace(/^\.\//, "");
}

function isRemote(ref: string): boolean {
  return (
    ref.startsWith("http://") ||
    ref.startsWith("https://") ||
    ref.startsWith("//")
  );
}

export function htmlAssetRefs(indexHtml: string): { css: string[]; js: string[] } {
  const css: string[] = [];
  const js: string[] = [];
  const linkPattern = /<link\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkPattern.exec(indexHtml))) {
    const tag = match[0];
    if (!/\brel=["']stylesheet["']/i.test(tag)) continue;
    const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (href && !isRemote(href)) css.push(normalizePath(href));
  }
  const srcPattern = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  while ((match = srcPattern.exec(indexHtml))) {
    const src = match[1];
    if (src && !isRemote(src)) js.push(normalizePath(src));
  }
  return { css, js };
}

export function scriptWiringIssues(files: { path: string; content: string }[]): string[] {
  const index = files.find((file) => normalizePath(file.path) === "index.html");
  if (!index) return [];

  const present = new Set(files.map((file) => normalizePath(file.path)));
  const refs = htmlAssetRefs(index.content);
  const issues: string[] = [];

  for (const path of [...refs.css, ...refs.js]) {
    if (!present.has(path)) {
      issues.push(`缺少文件引用 ${path}`);
    }
  }

  const referencedJs = new Set(refs.js);
  for (const file of files) {
    const path = normalizePath(file.path);
    if (!path.endsWith(".js")) continue;
    if (!referencedJs.has(path)) {
      issues.push(`index.html 未引入 ${path}`);
    }
  }
  return issues;
}

export function atomsliteDbOverrideIssues(source: string): string[] {
  if (/atomslite\.db\s*=/.test(source)) {
    return ["不要覆盖 window.atomslite.db，平台会注入它"];
  }
  return [];
}

/** Paths mentioned as missing file refs in verify issue strings. */
export function missingPathsFromIssues(issues: string[]): string[] {
  const found: string[] = [];
  for (const issue of issues) {
    const match = issue.match(/缺少文件引用\s+(\S+)/);
    if (match?.[1]) found.push(normalizePath(match[1].replace(/[；。,.]+$/, "")));
  }
  return [...new Set(found)];
}

/**
 * Decide what to generate next during repair.
 * Prefer writing allowed missing assets, then rewrite index.html / entry js.
 */
export function repairTargets(args: {
  issues: string[];
  written: { path: string }[];
  allowedPaths: string[];
}): string[] {
  const writtenPaths = new Set(args.written.map((file) => normalizePath(file.path)));
  const allowed = new Set(args.allowedPaths.map(normalizePath));
  const missing = missingPathsFromIssues(args.issues).filter((path) => allowed.has(path));
  const toAdd = missing.filter((path) => !writtenPaths.has(path));
  const toRewrite = args.written
    .map((file) => normalizePath(file.path))
    .filter((path) => path === "index.html" || path.endsWith(".js"));
  return [...new Set([...toAdd, ...toRewrite])];
}
