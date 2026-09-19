import { z } from "zod";

export const ModifyRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(2000),
});

export const ModifyFileSchema = z.object({
  stop: z.boolean().describe("没有更多文件要改时为 true；这是最后一个文件时也为 true"),
  path: z.string().describe("要改的相对路径。没有文件要改时为空字符串"),
  content: z.string().describe("该文件改完后的全文。没有文件要改时为空字符串"),
});

export type ModifyFileOutput = z.infer<typeof ModifyFileSchema>;
