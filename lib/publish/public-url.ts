export function publishedUrl(slug: string, env: NodeJS.ProcessEnv = process.env): string {
  const configured = (env.APP_PUBLIC_URL ?? "").trim();
  const app = (env.NEXT_PUBLIC_APP_URL ?? "").trim();
  const base = (configured || app).replace(/\/$/, "");
  return `${base}/published/${slug}`;
}
