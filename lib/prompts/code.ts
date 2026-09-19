import type { SpecOutput } from "@/lib/schemas/spec";

export const CODE_PATHS = ["index.html", "styles/main.css", "scripts/app.js"] as const;
export type CodePath = (typeof CODE_PATHS)[number];

export function buildCodePrompt(args: {
  spec: SpecOutput;
  path: string;
  written: { path: string; content: string }[];
  repair?: string;
}): string {
  const features = args.spec.features
    .map((feature) => `- ${feature.id}: ${feature.title}。验收：${feature.acceptance}`)
    .join("\n");
  const prior = args.written
    .map((file) => `----- ${file.path} -----\n${file.content}`)
    .join("\n\n");

  return [
    "你是前端工程师。只生成一个文件的完整内容。",
    `本次只写 ${args.path}。path 必须等于 ${args.path}。`,
    "index.html 是入口。相对路径不超过 2 层，只能引用 styles/main.css 和 scripts/app.js。",
    "只用浏览器原生 API。外链脚本或样式只能来自 cdn.jsdelivr.net、unpkg.com、esm.sh，能不用就不用。",
    "数据读写只能走 window.atomslite.db 的 list、insert、update、remove，它们都返回 Promise。页面加载先 list，写入成功后再改界面。",
    "禁止 localStorage、sessionStorage、IndexedDB、cookie。index.html 和脚本里都不要出现这些 API。数据库失败时不要改走本地存储，要把错误显示出来。不要写数据存在浏览器本地。",
    "每个功能都要有能点的界面，不能只写说明文字。按该功能的验收标准把交互做完，不能只写注释或占位。不要套固定的增删改模板。",
    "没有数据或还没开始时要有空状态。",
    "每个功能的主界面元素必须带 data-feature=\"功能id\"，并且写在 index.html 里。",
    "不要输出多个文件，不要省略内容，不要用 markdown。",
    "",
    `应用名：${args.spec.appName}`,
    "功能：",
    features,
    "",
    prior ? `已经写好的文件：\n${prior}` : "还没有其他文件。",
    args.repair ? `上次校验失败，按这个原因重写本文件：${args.repair}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
