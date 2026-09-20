export function dbCallIssues(source: string): string[] {
  const issues: string[] = [];
  if (/\.list\s*\(\s*\)/.test(source)) {
    issues.push('list 必须传入集合名，例如 list("notes")');
  }
  if (/\.insert\s*\(\s*(\)|\{)/.test(source)) {
    issues.push("insert 第一个参数必须是集合名字符串");
  }
  if (/\.update\s*\(\s*(\)|\{)/.test(source)) {
    issues.push("update 第一个参数必须是集合名字符串");
  }
  if (/\.remove\s*\(\s*(\)|\{)/.test(source)) {
    issues.push("remove 第一个参数必须是集合名字符串");
  }
  return issues;
}
