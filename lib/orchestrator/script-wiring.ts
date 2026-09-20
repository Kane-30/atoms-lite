function normalizePath(path: string): string {
  return path.replace(/^\.\//, "");
}

export function scriptWiringIssues(files: { path: string; content: string }[]): string[] {
  const index = files.find((file) => normalizePath(file.path) === "index.html");
  if (!index) return [];

  const referenced = new Set<string>();
  const srcPattern = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = srcPattern.exec(index.content))) {
    referenced.add(normalizePath(match[1]));
  }

  const issues: string[] = [];
  for (const file of files) {
    const path = normalizePath(file.path);
    if (!path.endsWith(".js")) continue;
    if (!referenced.has(path)) {
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
