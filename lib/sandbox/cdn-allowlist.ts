export const CDN_ALLOWLIST = [
  "cdn.jsdelivr.net",
  "unpkg.com",
  "esm.sh",
] as const;

export function isAllowedCdnUrl(url: string): boolean {
  try {
    const u = new URL(url, "https://example.com");
    if (u.protocol !== "https:" && !url.startsWith("/")) return false;
    if (url.startsWith("/") || url.startsWith("./") || url.startsWith("../")) {
      return true;
    }
    return CDN_ALLOWLIST.some(
      (h) => u.hostname === h || u.hostname.endsWith(`.${h}`),
    );
  } catch {
    return false;
  }
}
