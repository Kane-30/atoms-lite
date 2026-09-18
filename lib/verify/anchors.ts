const ANCHOR_PATTERN = /data-feature="([^"]+)"/g;

export function extractAnchors(content: string): string[] {
  const ids = new Set<string>();
  for (const match of content.matchAll(ANCHOR_PATTERN)) {
    const id = match[1];
    if (id) ids.add(id);
  }
  return [...ids].sort();
}
