import type { SpecOutput } from "@/lib/schemas/spec";

export function buildBlueprintPrompt(spec: SpecOutput): string {
  const features = spec.features
    .map((feature) => `- ${feature.id}: ${feature.title}`)
    .join("\n");
  return [
    "你是架构师。为这个静态网页设计文件和数据集合。",
    "入口必须是 index.html。路径最多两层，例如 styles/main.css、scripts/app.js。",
    "不要设计后端服务。数据集合只会通过 window.atomslite.db 存在。",
    "files 最多 6 个，pages 最多 3 个。",
    "",
    `应用名：${spec.appName}`,
    "功能：",
    features,
  ].join("\n");
}
