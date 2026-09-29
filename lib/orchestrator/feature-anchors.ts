import type { SpecOutput } from "@/lib/schemas/spec";
import { extractAnchors } from "@/lib/verify/anchors";

type Feature = SpecOutput["features"][number];

const META_ID =
  /(persist|reload|storage|split|style.?and.?logic|file.?struct|wiring|architecture|across.?reload|pure.?static|分文件)/i;
const META_TITLE =
  /(持久化|跨刷新|分文件|样式与逻辑|文件拆分|样式.?逻辑|工程化|架构约束|纯静态)/;

export function isMetaFeature(feature: Pick<Feature, "id" | "title" | "acceptance">): boolean {
  const blob = `${feature.id} ${feature.title} ${feature.acceptance}`;
  if (META_ID.test(feature.id) || META_TITLE.test(feature.title)) return true;
  // Acceptance-only persistence notes are fine on real features; whole-feature meta:
  if (/^(跨刷新|持久化|分文件)/.test(feature.title.trim())) return true;
  if (/只.*分文件|不要.*后端|纯静态网页约束/.test(blob) && !/添加|删除|编辑|开始|投票|筛选|打卡/.test(blob)) {
    return META_ID.test(blob) || META_TITLE.test(blob);
  }
  return false;
}

export function normalizeSpecFeatures(spec: SpecOutput): SpecOutput {
  const kept = spec.features.filter((feature) => !isMetaFeature(feature));
  if (kept.length > 0) return { ...spec, features: kept };
  // Never leave an empty feature list — fall back to first original item.
  return { ...spec, features: spec.features.slice(0, 1) };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hasFeatureAnchor(html: string, id: string): boolean {
  return html.includes(`data-feature="${id}"`);
}

/** Try to stamp data-feature onto an existing tag whose text mentions the title. */
function stampOntoMatchingTag(html: string, feature: Feature): string | null {
  const title = feature.title.trim();
  if (title.length < 1) return null;
  const pattern = new RegExp(
    `<([a-zA-Z][\\w-]*)([^>]*?)>([^<]*${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^<]*)<\\/\\1>`,
    "i",
  );
  if (!pattern.test(html)) return null;
  return html.replace(pattern, (full, tag: string, attrs: string, body: string) => {
    if (/\bdata-feature=/.test(attrs)) return full;
    return `<${tag}${attrs} data-feature="${feature.id}">${body}</${tag}>`;
  });
}

function appendFeatureSection(html: string, feature: Feature): string {
  const block = `<section data-feature="${feature.id}" data-anchored="ensure"><h2>${escapeHtml(feature.title)}</h2></section>`;
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${block}\n</body>`);
  return `${html}\n${block}`;
}

/**
 * Guarantee every interactive feature id appears as data-feature in index.html.
 * Prefer stamping an existing label match; otherwise append a visible section.
 */
export function ensureFeatureAnchors(indexHtml: string, features: Feature[]): string {
  let html = indexHtml;
  for (const feature of features) {
    if (hasFeatureAnchor(html, feature.id)) continue;
    const stamped = stampOntoMatchingTag(html, feature);
    html = stamped ?? appendFeatureSection(html, feature);
  }
  return html;
}

function extractAnchorElement(html: string, id: string): string | null {
  const openClose = new RegExp(
    `<([a-zA-Z][\\w-]*)([^>]*\\bdata-feature="${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*)>([\\s\\S]*?)<\\/\\1>`,
    "i",
  );
  const matched = html.match(openClose);
  if (matched) return matched[0];
  const voidish = new RegExp(
    `<([a-zA-Z][\\w-]*)([^>]*\\bdata-feature="${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*)/?>`,
    "i",
  );
  const single = html.match(voidish);
  return single ? single[0] : null;
}

/**
 * If modify dropped data-feature nodes, copy the missing elements back from before.
 */
export function restoreFeatureAnchors(beforeHtml: string, afterHtml: string): string {
  const beforeIds = extractAnchors(beforeHtml);
  const afterIds = new Set(extractAnchors(afterHtml));
  let html = afterHtml;
  for (const id of beforeIds) {
    if (afterIds.has(id)) continue;
    const snippet = extractAnchorElement(beforeHtml, id);
    if (!snippet) continue;
    if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `${snippet}\n</body>`);
    else html = `${html}\n${snippet}`;
    afterIds.add(id);
  }
  return html;
}

export function ensureFeatureAnchorsInFiles<T extends { path: string; content: string }>(
  files: T[],
  features: Feature[],
): T[] {
  const next = files.map((file) => ({ ...file }));
  const index = next.findIndex((file) => file.path.replace(/^\.\//, "") === "index.html");
  if (index < 0) return next;
  next[index] = {
    ...next[index],
    content: ensureFeatureAnchors(next[index].content, features),
  };
  return next;
}

export function restoreFeatureAnchorsInFiles<T extends { path: string; content: string }>(
  before: T[],
  after: T[],
): T[] {
  const beforeIndex = before.find((file) => file.path.replace(/^\.\//, "") === "index.html");
  const next = after.map((file) => ({ ...file }));
  const index = next.findIndex((file) => file.path.replace(/^\.\//, "") === "index.html");
  if (!beforeIndex || index < 0) return next;
  next[index] = {
    ...next[index],
    content: restoreFeatureAnchors(beforeIndex.content, next[index].content),
  };
  return next;
}
