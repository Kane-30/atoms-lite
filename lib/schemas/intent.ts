import { z } from "zod";

export const WorkbenchIntentSchema = z.object({
  intent: z.enum(["ask", "modify"]).describe("ask=只回答不改文件；modify=需要改文件"),
  reason: z.string().min(1).describe("一句话说明为何如此分类"),
});

export type WorkbenchIntentOutput = z.infer<typeof WorkbenchIntentSchema>;

export const WorkbenchReplySchema = z.object({
  reply: z.string().min(1).describe("给用户的中文回复，2～6 句，不要用 markdown 代码块包整段"),
});

export type WorkbenchReplyOutput = z.infer<typeof WorkbenchReplySchema>;
