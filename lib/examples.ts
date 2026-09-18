export const EXAMPLES = [
  {
    id: "todo",
    label: "待办清单",
    prompt: "帮我做一个待办清单：能添加、完成、删除事项，刷新后数据还在。",
  },
  {
    id: "ledger",
    label: "记账本",
    prompt: "帮我做一个记账本：记收入和支出，能看列表和合计，刷新后数据还在。",
  },
  {
    id: "habit",
    label: "习惯打卡",
    prompt: "帮我做一个习惯打卡：列出几个习惯，每天点一下打卡，能看到本周进度。",
  },
] as const;

export const PENDING_PROMPT_KEY = "atoms_pending_prompt";
