export type ModifyPromptInput = {
  userPrompt: string;
  files: { path: string; content: string }[];
  written: { path: string; content: string }[];
  repair?: string;
};

function block(files: { path: string; content: string }[]): string {
  if (files.length === 0) return "（无）";
  return files.map((file) => `----- ${file.path} -----\n${file.content}`).join("\n\n");
}

export function buildModifyPrompt(input: ModifyPromptInput): string {
  return [
    "你是前端工程师。按用户这一句话，改已有应用里需要动的文件。",
    "一次只生成一个需要改的文件，输出该文件的完整内容，不要省略，不要用 markdown。",
    "如果还要改别的文件，stop 为 false。如果这就是最后一个要改的文件，stop 为 true，并带上 path 和 content。",
    "如果没有任何文件需要改，stop 为 true，path 和 content 都是空字符串。",
    "path 是相对路径，不超过两层，例如 index.html 或 scripts/app.js。禁止 .. 和绝对路径。",
    "入口始终是 index.html，不要把入口改成别的文件名。",
    "数据读写只能走 window.atomslite.db 的 list、insert、update、remove，它们都返回 Promise。",
    "禁止 localStorage、sessionStorage、indexedDB、cookie。",
    "保留所有已有的 data-feature 标记，不要删掉。",
    "只用浏览器原生 API。外链脚本或样式只能来自 cdn.jsdelivr.net、unpkg.com、esm.sh，能不用就不用。",
    "",
    `用户这句话：${input.userPrompt}`,
    "",
    "当前文件：",
    block(input.files),
    "",
    "这一轮已经改过的文件：",
    block(input.written),
    input.repair ? `上次输出不合格，按这个原因重写：${input.repair}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
