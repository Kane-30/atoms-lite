function normalizePath(path: string): string {
  return path.replace(/^\.\//, "").replace(/^\//, "");
}

function isRemote(ref: string): boolean {
  return (
    ref.startsWith("http://") ||
    ref.startsWith("https://") ||
    ref.startsWith("//")
  );
}

export function normalizeAssetPath(path: string): string {
  return normalizePath(path);
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

/**
 * Stable load order: data layer → domain → everything else → entry (app/main/ui).
 * Prevents Preview crashes when entry scripts call globals defined in later files.
 */
export function orderScriptPaths(paths: string[]): string[] {
  const score = (path: string) => {
    if (/(^|\/)(db|store|storage|data|atoms-db-facade)\.js$/i.test(path)) return 0;
    if (/(^|\/)(calculator|engine|game|model|core|lib)\.js$/i.test(path)) return 1;
    if (/(^|\/)atoms-calc-guard\.js$/i.test(path)) return 4;
    if (/(^|\/)(app|main|ui|index|bootstrap)\.js$/i.test(path)) return 3;
    return 2;
  };
  return [...paths].sort((a, b) => score(a) - score(b) || a.localeCompare(b));
}

/**
 * Force index.html local css/js refs to equal files that actually exist.
 * Keeps remote CDN links and inline scripts. Closes script tags.
 * JS tags are emitted in dependency-friendly order (entry last).
 */
export function alignIndexHtml(indexHtml: string, files: { path: string }[]): string {
  const ordered = files.map((file) => normalizePath(file.path));
  const css = ordered.filter((path) => path.endsWith(".css"));
  const js = orderScriptPaths(ordered.filter((path) => path.endsWith(".js")));

  let html = indexHtml;

  html = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/\brel=["']stylesheet["']/i.test(tag)) return tag;
    const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (!href || isRemote(href)) return tag;
    return "";
  });

  html = html.replace(
    /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*(?:<\/script>)?/gi,
    (full, src: string) => (isRemote(src) ? full : ""),
  );

  const cssTags = css.map((path) => `<link rel="stylesheet" href="${path}">`).join("\n");
  const jsTags = js.map((path) => `<script src="${path}"></script>`).join("\n");

  if (cssTags) {
    if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, `${cssTags}\n</head>`);
    } else if (/<head\b[^>]*>/i.test(html)) {
      html = html.replace(/<head\b[^>]*>/i, (open) => `${open}\n${cssTags}`);
    } else {
      html = `${cssTags}\n${html}`;
    }
  }

  if (jsTags) {
    if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, `${jsTags}\n</body>`);
    } else {
      html = `${html}\n${jsTags}`;
    }
  }

  return html;
}

export function alignWrittenFiles<T extends { path: string; content: string }>(files: T[]): T[] {
  const next = files.map((file) => ({ ...file }));
  const index = next.findIndex((file) => normalizePath(file.path) === "index.html");
  if (index < 0) return next;
  next[index] = {
    ...next[index],
    content: alignIndexHtml(next[index].content, next),
  };
  return next;
}
