import { z } from "zod";

export const BlueprintSchema = z.object({
  summary: z.string().min(1),
  files: z
    .array(
      z.object({
        path: z.string().min(1),
        purpose: z.string().min(1),
      }),
    )
    .min(1)
    .max(6),
  collections: z
    .array(
      z.object({
        name: z.string().min(1),
        fields: z.array(z.string().min(1)).min(1).max(8),
      }),
    )
    .max(4),
  pages: z.array(z.string()).max(3),
});

export type BlueprintOutput = z.infer<typeof BlueprintSchema>;

export function normalizeBlueprintFiles(files: { path: string; purpose: string }[]) {
  const kept = files
    .map((file) => ({ ...file, path: file.path.replace(/^\.\//, "") }))
    .filter((file) => file.path.split("/").length <= 2);
  if (!kept.some((file) => file.path === "index.html")) {
    kept.unshift({ path: "index.html", purpose: "入口页面" });
  }
  return kept;
}
