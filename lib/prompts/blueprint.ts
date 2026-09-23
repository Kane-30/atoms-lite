import type { SpecOutput } from "@/lib/schemas/spec";

export function buildBlueprintPrompt(spec: SpecOutput): string {
  const features = spec.features
    .map((feature) => `- ${feature.id}: ${feature.title}`)
    .join("\n");
  return [
    "你是架构师。为这个静态网页设计文件和数据集合。",
    "入口必须是 index.html。路径最多两层，例如 styles/main.css、scripts/app.js。",
    "不要设计后端服务。数据集合只会通过平台注入的 window.atomslite.db 存在，读写时第一个参数是集合名。",
    "每个文件只写一种职责：页面结构、样式、数据访问、交互逻辑不要在多个脚本里各写一整套。",
    "files 列表是唯一真相：工程师只会按这个列表写文件；不要列入写不出来的幽灵路径。",
    "index.html 必须按依赖顺序引入列表里的全部 .js 与样式；不要设计会覆盖 window.atomslite.db 的假数据库文件。",
    "files 最多 6 个，pages 最多 3 个。",
    "",
    `应用名：${spec.appName}`,
    "功能：",
    features,
  ].join("\n");
}
