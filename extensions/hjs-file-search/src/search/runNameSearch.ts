import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { resolveEngineDir } from "./paths";
import type { SearchItem, SearchResponse } from "./types";

type AlfredItem = {
  uid?: string;
  title?: string;
  subtitle?: string;
  arg?: string;
  valid?: boolean;
  type?: string;
  variables?: Record<string, string>;
  hjs_hint_row?: boolean;
  hjs_fc_group?: boolean;
};

type AlfredOut = { items?: AlfredItem[] };

function mapItem(it: AlfredItem, profile: string): SearchItem {
  const path = (it.arg || it.variables?.filepath || "").trim();
  const isHint = Boolean(it.hjs_hint_row) || (it.valid === false && !path);
  const isGroup = Boolean(it.hjs_fc_group);
  let kind: SearchItem["kind"] = "file";
  if (isHint) kind = "hint";
  else if (isGroup) kind = "group";
  else if (profile === "fd" || (it.type || "").includes("folder")) kind = "folder";
  return {
    id: it.uid || path || it.title || Math.random().toString(36),
    title: it.title || path || "(无标题)",
    subtitle: it.subtitle || "",
    path,
    kind,
    line: it.variables?.linenum ? Number(it.variables.linenum) : undefined,
    col: it.variables?.colnum ? Number(it.variables.colnum) : undefined,
    valid: it.valid !== false && Boolean(path),
    variables: it.variables,
  };
}

export function runNameSearch(opts: {
  query: string;
  profile: "ff" | "ffw" | "fd";
  engineDir?: string;
}): SearchResponse {
  const engineDir = resolveEngineDir(opts.engineDir);
  const script = join(engineDir, "search.py");
  const proc = spawnSync("/usr/bin/python3", [script, opts.query || ""], {
    env: { ...process.env, profile: opts.profile },
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    timeout: 120_000,
  });
  if (proc.error) throw proc.error;
  const raw = (proc.stdout || "").trim();
  if (!raw) {
    throw new Error((proc.stderr || "").trim() || `search.py 无输出 (code=${proc.status})`);
  }
  const data = JSON.parse(raw) as AlfredOut;
  return {
    items: (data.items || []).map((it) => mapItem(it, opts.profile)),
    query: opts.query || "",
    profile: opts.profile,
  };
}
