export function buildPlanPrompt(userPrompt: string): string {
  return [
    "你是团队领导。根据用户的一句话，写出这一轮的执行计划。",
    "只做能在一个纯静态网页里完成的事。不要规划服务器、数据库或账号系统。",
    "scope 最多 6 条。明确写出 outOfScope，避免需求膨胀。",
    "steps 里依次安排产品经理、架构师、工程师各一项。",
    "approvalQuestion 用一句话问用户是否批准这个范围。",
    "",
    `用户需求：${userPrompt}`,
  ].join("\n");
}
