import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { resolveEngineDir } from "./paths";
import type { SearchItem, SearchResponse } from "./types";

export function runContentSearch(opts: { query: string; engineDir?: string }): SearchResponse {
  const engineDir = resolveEngineDir(opts.engineDir);
  const root = dirname(engineDir);
  const candidates = [join(root, "src", "search_content.py"), join(root, "src", "grep.sh")];
  const script = candidates.find((p) => existsSync(p));
  if (!script) {
    return {
      query: opts.query,
      profile: "fc",
      items: [
        {
          id: "fc-missing",
          title: "内容搜索脚本未找到",
          subtitle: `期望 ${candidates[0]}`,
          path: "",
          kind: "hint",
          valid: false,
        },
      ],
    };
  }
  const isPy = script.endsWith(".py");
  const proc = spawnSync(
    isPy ? "/usr/bin/python3" : "/bin/zsh",
    isPy ? [script, opts.query || ""] : [script, opts.query || ""],
    {
      env: { ...process.env, profile: "fc", hjs_reopen_kw: "fc" },
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      timeout: 180_000,
      cwd: dirname(script),
    },
  );
  const raw = (proc.stdout || "").trim();
  if (!raw) {
    return {
      query: opts.query,
      profile: "fc",
      items: [
        {
          id: "fc-empty",
          title: "内容搜索无输出",
          subtitle: (proc.stderr || "").slice(0, 200) || `code=${proc.status}`,
          path: "",
          kind: "hint",
          valid: false,
        },
      ],
    };
  }
  let data: { items?: Array<Record<string, unknown>> };
  try {
    data = JSON.parse(raw);
  } catch {
    return {
      query: opts.query,
      profile: "fc",
      items: [
        {
          id: "fc-bad-json",
          title: "内容搜索 JSON 解析失败",
          subtitle: raw.slice(0, 180),
          path: "",
          kind: "hint",
          valid: false,
        },
      ],
    };
  }
  const items: SearchItem[] = (data.items || []).map((it, i) => {
    const vars = (it.variables || {}) as Record<string, string>;
    const path = String(it.arg || vars.filepath || "");
    return {
      id: String(it.uid || path || i),
      title: String(it.title || path || "(无标题)"),
      subtitle: String(it.subtitle || ""),
      path,
      kind: it.hjs_hint_row ? "hint" : it.hjs_fc_group ? "group" : "file",
      line: vars.linenum ? Number(vars.linenum) : undefined,
      col: vars.colnum ? Number(vars.colnum) : undefined,
      valid: it.valid !== false && Boolean(path),
      variables: vars,
    };
  });
  return { items, query: opts.query || "", profile: "fc" };
}
