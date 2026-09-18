import { PENDING_PROMPT_KEY } from "@/lib/examples";

export async function resumePendingPrompt(): Promise<string> {
  const pending = sessionStorage.getItem(PENDING_PROMPT_KEY);
  if (!pending) return "/projects";
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: pending }),
  });
  sessionStorage.removeItem(PENDING_PROMPT_KEY);
  if (!res.ok) return "/projects";
  const data = (await res.json()) as { projectId: string };
  return `/p/${data.projectId}`;
}
