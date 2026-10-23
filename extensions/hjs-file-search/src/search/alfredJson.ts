import type { SearchItem, SearchResponse } from "./types";

export type AlfredItem = {
  uid?: string;
  title?: string;
  subtitle?: string;
  arg?: string | string[];
  valid?: boolean | string | number;
  type?: string;
  variables?: Record<string, string>;
  hjs_hint_row?: boolean;
  hjs_fc_group?: boolean;
  mods?: Record<string, { arg?: string; subtitle?: string; variables?: Record<string, string> }>;
};

export type AlfredOut = { items?: AlfredItem[] };

function argPath(it: AlfredItem): string {
  const a = it.arg;
  if (Array.isArray(a)) return String(a[0] || "").trim();
  return String(a || it.variables?.filepath || "").trim();
}

export function mapAlfredItem(it: AlfredItem, profile: string, index = 0): SearchItem {
  const path = argPath(it);
  const isHint = Boolean(it.hjs_hint_row) || (it.valid === false && !path);
  const isGroup = Boolean(it.hjs_fc_group);
  const isBack = (it.title || "").includes("返回分组");
  let kind: SearchItem["kind"] = "file";
  if (isBack) kind = "back";
  else if (isHint) kind = "hint";
  else if (isGroup) kind = "group";
  else if (profile === "fd" || (it.type || "").includes("folder")) kind = "folder";

  const vars = { ...(it.variables || {}) };
  const expandFromMod = it.mods?.ctrl?.variables?.expand_query;
  if (expandFromMod && !vars.expand_query) vars.expand_query = expandFromMod;
  if (it.mods?.ctrl?.variables?.expand_keyword && !vars.expand_keyword) {
    vars.expand_keyword = it.mods.ctrl.variables.expand_keyword;
  }

  return {
    id: String(it.uid || path || it.title || `${profile}-${index}`),
    title: it.title || path || "(无标题)",
    subtitle: it.subtitle || "",
    path,
    kind,
    line: vars.linenum ? Number(vars.linenum) : undefined,
    col: vars.colnum ? Number(vars.colnum) : undefined,
    valid: it.valid !== false && it.valid !== "false" && it.valid !== 0 && (Boolean(path) || isBack),
    variables: vars,
  };
}

export function mapAlfredOut(data: AlfredOut, query: string, profile: string): SearchResponse {
  return {
    items: (data.items || []).map((it, i) => mapAlfredItem(it, profile, i)),
    query: query || "",
    profile,
  };
}

/** 与 Alfred group_fc.expand_query 对齐：在原查询后加「 ++ f "文件名"」 */
export function buildExpandQuery(baseQuery: string, filePath: string): string {
  const name = filePath.split("/").pop() || filePath;
  const safe = name.replace(/"/g, "");
  const q = (baseQuery || "").trim();
  return `${q} ++ f "${safe}"`.trim();
}

/** 去掉 ++ 及之后的展开后缀，回到分组查询 */
export function stripExpandSuffix(query: string): string {
  const q = query || "";
  const idx = q.search(/\s\+\+(?:\s|$)/);
  if (idx >= 0) return q.slice(0, idx).trim();
  if (q.trimStart().startsWith("++")) return "";
  return q.trim();
}
