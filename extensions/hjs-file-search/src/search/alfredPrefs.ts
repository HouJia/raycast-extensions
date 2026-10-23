import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { INSTALLED_FILE_SEARCH } from "./paths";

/**
 * 读已安装 hjs-File Search 的 prefs.plist（ffg_include / ffw_include）。
 * Alfred Script Filter 会自动注入这些变量；Raycast spawn 需自行带上。
 */
export function loadFileSearchPrefs(workflowRoot?: string): Record<string, string> {
  const root = workflowRoot || INSTALLED_FILE_SEARCH;
  const prefsPath = join(root, "prefs.plist");
  if (!existsSync(prefsPath)) return {};
  const conv = spawnSync("/usr/bin/plutil", ["-convert", "json", "-o", "-", "--", prefsPath], {
    encoding: "utf8",
    timeout: 5_000,
  });
  if (conv.status !== 0 || !conv.stdout) {
    // 兜底：极少数环境无 plutil 时留空
    try {
      const raw = readFileSync(prefsPath);
      void raw;
    } catch {
      /* ignore */
    }
    return {};
  }
  try {
    const data = JSON.parse(conv.stdout) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        out[k] = String(v);
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** fcl 默认范围：ffg_include 非空用之，否则 ffw_include / ff_include（与 Alfred「留空＝ffw 白名单」一致） */
export function resolveContentIncludeDirs(prefs?: Record<string, string>): string[] {
  const p = prefs || loadFileSearchPrefs();
  const raw = (p.ffg_include || "").trim() || (p.ffw_include || "").trim() || (p.ff_include || "").trim();
  if (!raw) return [];
  const home = homedir();
  const dirs: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    let s = line.trim();
    if (!s) continue;
    if (s.startsWith("~/")) s = join(home, s.slice(2));
    else if (s === "~") s = home;
    dirs.push(s);
  }
  return dirs;
}
