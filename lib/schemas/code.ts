import { z } from "zod";

export const CodeFileSchema = z.object({
  path: z.string().min(1),
  content: z.string().min(1),
});

export type CodeFileOutput = z.infer<typeof CodeFileSchema>;
