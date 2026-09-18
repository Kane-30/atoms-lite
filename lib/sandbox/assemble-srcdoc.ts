import { isAllowedCdnUrl } from "./cdn-allowlist";
import { BRIDGE_SDK_SOURCE } from "./bridge-sdk";

export type ProjectFile = { path: string; content: string };

export { BRIDGE_SDK_SOURCE };

const MAX_RELATIVE_DEPTH = 2;

function normalizeFilePath(path: string): string {
  return path.replace(/^\.\//, "");
}

function dirname(filePath: string): string {
  const i = filePath.lastIndexOf("/");
  return i === -1 ? "" : filePath.slice(0, i);
}

function joinPath(base: string, ref: string): string | null {
  const segments = [
    ...(base ? base.split("/") : []),
    ...ref.split("/"),
  ];
  const out: string[] = [];
  let ups = 0;
  for (const seg of segments) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") {
      ups += 1;
      if (ups > MAX_RELATIVE_DEPTH) return null;
      if (out.length > 0) out.pop();
      continue;
    }
    ups = 0;
    out.push(seg);
  }
  if (out.length > MAX_RELATIVE_DEPTH + 1) return null;
  return out.join("/");
}

function isRemoteUrl(ref: string): boolean {
  return (
    ref.startsWith("http://") ||
    ref.startsWith("https://") ||
    ref.startsWith("//")
  );
}

function resolveReference(fromFile: string, ref: string): string | null {
  if (isRemoteUrl(ref)) return ref;
  const base = dirname(normalizeFilePath(fromFile));
  if (ref.startsWith("/")) {
    return normalizeFilePath(ref.slice(1));
  }
  return joinPath(base, ref);
}

function buildFileMap(files: ProjectFile[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const f of files) {
    map.set(normalizeFilePath(f.path), f.content);
  }
  return map;
}

function findIndexHtml(files: ProjectFile[]): ProjectFile | undefined {
  return (
    files.find((f) => normalizeFilePath(f.path) === "index.html") ??
    files.find((f) => f.path.endsWith("/index.html"))
  );
}

const LINK_STYLESHEET =
  /<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi;
const SCRIPT_SRC =
  /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi;

function hrefFromLinkTag(tag: string): string | null {
  const m = tag.match(/\bhref=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function deferAppScripts(html: string): string {
  return html.replace(/<script>([\s\S]*?)<\/script>/gi, (full, body: string) => {
    if (body.includes("atomslite:req") || body.includes("__atomsliteReady.then")) return full;
    return `<script>window.__atomsliteReady.then(function(){\n${body}\n});</script>`;
  });
}

function injectBridgeSdk(html: string): string {
  const bridgeTag = `<script>${BRIDGE_SDK_SOURCE}</script>`;
  if (html.includes("atomslite:req")) return html;
  const headClose = html.match(/<\/head>/i);
  if (headClose && headClose.index !== undefined) {
    return (
      html.slice(0, headClose.index) +
      bridgeTag +
      html.slice(headClose.index)
    );
  }
  const bodyOpen = html.match(/<body[^>]*>/i);
  if (bodyOpen && bodyOpen.index !== undefined) {
    const insertAt = bodyOpen.index + bodyOpen[0].length;
    return html.slice(0, insertAt) + bridgeTag + html.slice(insertAt);
  }
  return bridgeTag + html;
}

export function assembleSrcdoc(files: ProjectFile[]): {
  html: string;
  missing: string[];
  blockedCdns: string[];
} {
  const missing: string[] = [];
  const blockedCdns: string[] = [];
  const fileMap = buildFileMap(files);
  const indexFile = findIndexHtml(files);

  if (!indexFile) {
    return {
      html: "",
      missing: ["index.html"],
      blockedCdns: [],
    };
  }

  const indexPath = normalizeFilePath(indexFile.path);
  let html = indexFile.content;

  html = html.replace(LINK_STYLESHEET, (tag) => {
    const href = hrefFromLinkTag(tag);
    if (!href) return tag;

    if (isRemoteUrl(href)) {
      if (isAllowedCdnUrl(href)) return tag;
      try {
        const host = new URL(href).hostname;
        if (!blockedCdns.includes(host)) blockedCdns.push(host);
      } catch {
        /* ignore */
      }
      return `<!-- BLOCKED CDN: ${href} -->`;
    }

    const resolved = resolveReference(indexPath, href);
    if (!resolved) {
      missing.push(href);
      return `<!-- MISSING: ${href} -->`;
    }

    const content = fileMap.get(resolved);
    if (content === undefined) {
      if (!missing.includes(resolved)) missing.push(resolved);
      return `<!-- MISSING: ${resolved} -->`;
    }
    return `<style>${content}</style>`;
  });

  html = html.replace(SCRIPT_SRC, (full, src: string) => {
    if (isRemoteUrl(src)) {
      if (isAllowedCdnUrl(src)) return full;
      try {
        const host = new URL(src, "https://example.com").hostname;
        if (!blockedCdns.includes(host)) blockedCdns.push(host);
      } catch {
        /* ignore */
      }
      return `<!-- BLOCKED CDN: ${src} -->`;
    }

    const resolved = resolveReference(indexPath, src);
    if (!resolved) {
      missing.push(src);
      return `<!-- MISSING: ${src} -->`;
    }

    const content = fileMap.get(resolved);
    if (content === undefined) {
      if (!missing.includes(resolved)) missing.push(resolved);
      return `<!-- MISSING: ${resolved} -->`;
    }
    return `<script>${content}</script>`;
  });

  html = injectBridgeSdk(html);
  if (html.includes("__atomsliteReady")) {
    html = deferAppScripts(html);
  }

  return { html, missing, blockedCdns };
}
