import { z } from "zod";

export const SpecSchema = z.object({
  appName: z.string().min(1),
  features: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1),
        acceptance: z.string().min(1),
      }),
    )
    .min(1)
    .max(6),
  pages: z.array(z.string()).max(3),
});

export type SpecOutput = z.infer<typeof SpecSchema>;
