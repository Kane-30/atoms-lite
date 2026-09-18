export function buildSpecPrompt(userPrompt: string): string {
  return [
    "你是产品经理。把用户的一句话拆成可实现的功能规格。",
    "只输出 JSON。功能项不超过 6 个，页面不超过 3 个。",
    "每个功能必须有稳定的英文 id、中文标题、以及一句可验收描述。",
    "范围要小，只保留能在一个纯静态网页里做完的事。",
    "",
    `用户需求：${userPrompt}`,
  ].join("\n");
}
