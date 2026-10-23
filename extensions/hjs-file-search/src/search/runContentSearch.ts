import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { mapAlfredOut, type AlfredOut } from "./alfredJson";
import { loadFileSearchPrefs, resolveContentIncludeDirs } from "./alfredPrefs";
import { resolveFileSearchRoot, INSTALLED_FILE_SEARCH } from "./paths";
import type { ContentProfile, SearchResponse } from "./types";

function hint(title: string, subtitle: string, query: string, profile: ContentProfile): SearchResponse {
  return {
    query,
    profile,
    items: [{ id: `${profile}-hint`, title, subtitle, path: "", kind: "hint", valid: false }],
  };
}

/**
 * 与 Alfred Script Filter 对齐的环境变量：
 * - fct  → hjs_scope=window（递归，当前窗口）
 * - fcl  → search_mode=shallow；默认范围＝ffg_include / ffw 白名单（经 action_input）
 * - fclt → hjs_scope=window + search_mode=shallow
 * - fc   → 默认 deep + 默认范围
 */
export function contentBridgeEnv(profile: ContentProfile): {
  hjs_scope?: string;
  search_mode?: string;
  needDefaultActionInput: boolean;
} {
  switch (profile) {
    case "fct":
      return { hjs_scope: "window", needDefaultActionInput: false };
    case "fcl":
      return { search_mode: "shallow", needDefaultActionInput: true };
    case "fclt":
      return { hjs_scope: "window", search_mode: "shallow", needDefaultActionInput: false };
    default:
      return { needDefaultActionInput: false };
  }
}

/**
 * 内容检索：走 Alfred 同路径 ffg-entry.sh（内含分组 / ++ 展开 / 展开缓存）。
 * 不要直接调 search_content.py（那是 grep.sh 的子步骤，不会吐 Alfred JSON）。
 */
export function runContentSearch(opts: {
  query: string;
  profile?: ContentProfile;
  engineDir?: string;
  timeoutMs?: number;
  /** 测试可注入 prefs，避免读本机 plist */
  prefs?: Record<string, string>;
}): SearchResponse {
  const profile: ContentProfile = opts.profile || "fc";
  const root = resolveFileSearchRoot(opts.engineDir);
  const entry = [join(root, "src", "ffg-entry.sh"), join(root, "src", "grep.sh")].find((p) =>
    existsSync(p),
  );
  if (!entry) {
    return hint("内容搜索脚本未找到", `期望 ${root}/src/ffg-entry.sh`, opts.query, profile);
  }

  const cache =
    process.env.alfred_workflow_cache ||
    join(homedir(), "Library/Caches/com.runningwithcrayons.Alfred/Workflow Data/cc.houjia.file-search");

  const bridge = contentBridgeEnv(profile);
  const prefs = opts.prefs || loadFileSearchPrefs(INSTALLED_FILE_SEARCH);
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    profile,
    hjs_reopen_kw: profile,
    hjs_profile: profile,
    alfred_workflow_cache: cache,
    alfred_debug: "0",
  };

  // 把 Alfred 工作流配置注入（Raycast 不会自动带）
  for (const key of [
    "ffg_include",
    "ffw_include",
    "ff_include",
    "ffg_open_with",
    "ffgl_open_with",
    "ffg_max",
    "ffgl_max",
    "hard_line_cap",
    "subtext_style",
    "curate_preview",
  ]) {
    if (prefs[key] != null && prefs[key] !== "" && env[key] == null) {
      env[key] = prefs[key];
    }
  }

  if (bridge.hjs_scope) env.hjs_scope = bridge.hjs_scope;
  if (bridge.search_mode) env.search_mode = bridge.search_mode;

  // fcl：浅层需要 action_input；无窗口时用默认白名单目录（与「默认范围同 fc」对齐）
  if (bridge.needDefaultActionInput && !env.action_input) {
    const dirs = resolveContentIncludeDirs(prefs);
    if (dirs.length) {
      env.action_input = dirs.join("\t");
    }
  }

  const proc = spawnSync("/bin/zsh", [entry, opts.query || ""], {
    env,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: opts.timeoutMs ?? 180_000,
    cwd: root,
  });

  const raw = (proc.stdout || "").trim();
  if (!raw) {
    return hint(
      "内容搜索无输出",
      (proc.stderr || "").slice(0, 200) || `code=${proc.status}`,
      opts.query,
      profile,
    );
  }

  let data: AlfredOut;
  try {
    data = JSON.parse(raw);
  } catch {
    return hint("内容搜索 JSON 解析失败", raw.slice(0, 180), opts.query, profile);
  }
  return mapAlfredOut(data, opts.query || "", profile);
}
