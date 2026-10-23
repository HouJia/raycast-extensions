import { taxonomy } from "./taxonomy.ts";
import type { ParseResult } from "./parse.ts";
import { candidateClasses, candidateLeaf } from "./classify.ts";

const SNIFF_RELEVANT = new Set(["text", "plain", "code", "subtitle", "data", "video", "audio", "other"]);

function pathNeedle(term: string): string {
  const parts: string[] = [];
  for (const part of (term || "").split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") return "";
    parts.push(part);
  }
  return parts.join("/");
}

function parentPath(path: string): string {
  const p = (path || "").replace(/\/+$/, "");
  const i = p.lastIndexOf("/");
  return i >= 0 ? p.slice(0, i) : "";
}

export function pathHasSegment(path: string, term: string): boolean {
  const needle = pathNeedle(term);
  if (!needle) return false;
  return parentPath(path).toLowerCase().includes(needle.toLowerCase());
}

export function extractExtensions(base: string): string[] {
  if (!base || !base.includes(".")) return [];
  if (base.startsWith(".") && (base.match(/\./g) || []).length === 1) return [];
  const parts = base.split(".");
  const exts = [parts[parts.length - 1]];
  for (let start = parts.length - 2; start > 0; start--) {
    if (parts[start]) exts.push(parts.slice(start).join("."));
  }
  return exts;
}

export function extMatches(base: string, term: string): boolean {
  const candidates = extractExtensions(base);
  if (!candidates.length) return false;
  const needle = term.toLowerCase().replace(/^\.+/, "");
  if (!needle) return false;
  return candidates.some((c) => c.includes(needle));
}

export function fieldsMatch(value: string, groups: string[][], excludedTerms: string[] = []): boolean {
  const v = value.toLowerCase();
  const posOk = !groups.length || groups.some((g) => g.every((t) => v.includes(t.toLowerCase())));
  const negOk = !excludedTerms.some((t) => v.includes(t.toLowerCase()));
  return posOk && negOk;
}

export function metadataMatches(
  parsed: ParseResult,
  metadata: Record<string, string> | null = null,
  path = "",
  kind: string | null = null,
): boolean {
  const meta = metadata || {};
  const valueSource = meta.source;
  const neg = parsed.exclude || { type: [], source: [] };
  if ((parsed.type && parsed.type.length) || (neg.type && neg.type.length)) {
    const involved = new Set<string>([
      ...((parsed.type || []).flat()),
      ...(neg.type || []),
    ]);
    const sniff = [...involved].some((t) => SNIFF_RELEVANT.has(t));
    let types: Set<string>;
    if (meta.type) {
      let v = taxonomy.TYPE_ALIASES[String(meta.type).toLowerCase()] ?? String(meta.type).toLowerCase();
      if (!knownHas(v)) v = "other";
      types = leafClassesLocal(v, path);
    } else {
      types = new Set(candidateClasses(path, kind, sniff));
    }
    if (parsed.type?.length && !parsed.type.some((g) => g.every((t) => types.has(t)))) return false;
    if ((neg.type || []).some((t) => types.has(t))) return false;
  }
  if ((parsed.source && parsed.source.length) || (neg.source && neg.source.length)) {
    if (valueSource == null) return false;
    if (!fieldsMatch(String(valueSource), parsed.source, neg.source || [])) return false;
  }
  return true;
}

function knownHas(v: string): boolean {
  return new Set(Object.values(taxonomy.TYPE_ALIASES)).has(v);
}

function leafClassesLocal(leaf: string, path: string): Set<string> {
  const classes = new Set<string>([leaf]);
  const parent = taxonomy.LEAF_PARENT[leaf];
  if (parent) classes.add(parent);
  const base = (path || "").split("/").pop() || "";
  const lower = base.toLowerCase();
  const ext = lower.includes(".") ? lower.split(".").pop()! : "";
  for (const c of taxonomy.EXTRA_CLASSES[ext] || []) classes.add(c);
  return classes;
}

export function filenameMatches(
  base: string,
  parsed: ParseResult,
  includeMain = true,
  metadata: Record<string, string> | null = null,
  kind: string | null = null,
  path = "",
): boolean {
  const negative = parsed.exclude || {};
  const fields: Array<"main" | "file"> = includeMain ? ["main", "file"] : ["file"];
  for (const field of fields) {
    if (!fieldsMatch(base, parsed[field] || [], negative[field] || [])) return false;
  }
  const extOk =
    !parsed.ext.length || parsed.ext.some((g) => g.every((e) => extMatches(base.toLowerCase(), e)));
  const extNeg = !(negative.ext || []).some((e) => extMatches(base.toLowerCase(), e));
  return extOk && extNeg && metadataMatches(parsed, metadata, path || base, kind);
}

export function directoryMatches(path: string, parsed: ParseResult): boolean {
  const groups = parsed.dir || [];
  const posOk = !groups.length || groups.some((g) => g.every((t) => pathHasSegment(path, t)));
  const negOk = !(parsed.exclude?.dir || []).some((t) => pathHasSegment(path, t));
  return posOk && negOk;
}

export function matches(
  path: string,
  parsed: ParseResult,
  dirs: string[] | null = null,
  name: string | null = null,
  metadata: Record<string, string> | null = null,
  kind: string | null = null,
): boolean {
  if (dirs && dirs.length) {
    const ok = dirs.some((d) => path === d || path.startsWith(d.replace(/\/+$/, "") + "/"));
    if (!ok) return false;
  }
  const base = (name != null ? name : path.replace(/\/+$/, "").split("/").pop() || "").toLowerCase();
  return filenameMatches(base, parsed, true, metadata, kind, path) && directoryMatches(path, parsed);
}

export function typeRank(path: string, parsed: ParseResult, kind: string | null = null): number {
  const wanted = new Set((parsed?.type || []).flat());
  const order = wanted.has("text")
    ? taxonomy.TEXT_RANK
    : wanted.has("office")
      ? taxonomy.OFFICE_RANK
      : null;
  if (!order) return 0;
  const leaf = candidateLeaf(path, kind, true);
  const idx = order.indexOf(leaf);
  return idx >= 0 ? idx : order.length;
}
