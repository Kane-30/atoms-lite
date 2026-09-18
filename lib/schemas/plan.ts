import { z } from "zod";

export const PlanSchema = z.object({
  goal: z.string().min(1),
  scope: z.array(z.string().min(1)).min(1).max(6),
  outOfScope: z.array(z.string()).max(6),
  steps: z
    .array(
      z.object({
        agent: z.enum(["产品经理", "架构师", "工程师"]),
        task: z.string().min(1),
      }),
    )
    .min(1)
    .max(3),
  approvalQuestion: z.string().min(1),
});

export type PlanOutput = z.infer<typeof PlanSchema>;
