export function buildIntentClassifyPrompt(userPrompt: string): string {
  return [
    "你在给 atoms-lite 工作台分流用户这句话。",
    "只输出结构化字段：intent 与 reason。",
    "intent=ask：用户在提问、查现状、问有没有/在哪/怎么用，这一轮只需要文字回答，不要改文件。",
    "intent=modify：用户要求加、改、删、修功能或界面，需要改文件。",
    "混合句（例如「有吗？没有就帮我加上」）：优先 ask——先根据现有代码回答有没有、在哪；不要这一轮直接改文件。",
    "拿不准时选 modify。",
    "",
    `用户这句话：${userPrompt}`,
  ].join("\n");
}

function fileBlock(files: { path: string; content: string }[]): string {
  if (files.length === 0) return "（当前没有文件）";
  return files
    .map((file) => {
      const body = file.content.length > 4000 ? `${file.content.slice(0, 4000)}\n…(截断)` : file.content;
      return `----- ${file.path} -----\n${body}`;
    })
    .join("\n\n");
}

export function buildAskReplyPrompt(input: {
  userPrompt: string;
  files: { path: string; content: string }[];
}): string {
  return [
    "你是 atoms-lite 里的前端助手。用户在问当前应用的问题，不要改文件，只根据现有代码回答。",
    "用中文，2～6 句。若功能已有，明确说出在界面哪里（按钮文案）以及大致在哪个文件。",
    "若确实没有，如实说没有，并提示用户可以再说「帮我加上…」。",
    "不要编造不存在的按钮或文件。",
    "",
    `用户这句话：${input.userPrompt}`,
    "",
    "当前文件：",
    fileBlock(input.files),
  ].join("\n");
}

export function buildUnchangedExplainPrompt(input: {
  userPrompt: string;
  files: { path: string; content: string }[];
  verifyCode: "NO_FILE_CHANGED" | "IDENTICAL_CONTENT";
}): string {
  return [
    "你是 atoms-lite 里的前端助手。用户想改应用，但这一轮文件没有发生有效变化。",
    "用中文 2～5 句解释：不是系统崩溃；更可能是需求已在当前代码里，或改动未真正落地。",
    "若能从代码里看出相关功能，指出在界面哪里、哪个文件。",
    "最后给一句可执行的下一句示例（例如「把 C 按钮改成灰色」），方便用户再说。",
    `校验码：${input.verifyCode}`,
    "",
    `用户这句话：${input.userPrompt}`,
    "",
    "当前文件：",
    fileBlock(input.files),
  ].join("\n");
}
