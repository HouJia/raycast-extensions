import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { mapAlfredOut, type AlfredOut } from "./alfredJson";
import { resolveFileSearchRoot } from "./paths";
import type { SearchResponse } from "./types";

function hint(title: string, subtitle: string, query: string): SearchResponse {
  return {
    query,
    profile: "fc",
    items: [{ id: "fc-hint", title, subtitle, path: "", kind: "hint", valid: false }],
  };
}

/**
 * 内容检索：走 Alfred 同路径 ffg-entry.sh（内含分组 / ++ 展开 / 展开缓存）。
 * 不要直接调 search_content.py（那是 grep.sh 的子步骤，不会吐 Alfred JSON）。
 */
export function runContentSearch(opts: {
  query: string;
  engineDir?: string;
  timeoutMs?: number;
}): SearchResponse {
  const root = resolveFileSearchRoot(opts.engineDir);
  const entry = [join(root, "src", "ffg-entry.sh"), join(root, "src", "grep.sh")].find((p) =>
    existsSync(p),
  );
  if (!entry) {
    return hint("内容搜索脚本未找到", `期望 ${root}/src/ffg-entry.sh`, opts.query);
  }

  const cache =
    process.env.alfred_workflow_cache ||
    join(homedir(), "Library/Caches/com.runningwithcrayons.Alfred/Workflow Data/cc.houjia.file-search");

  const proc = spawnSync("/bin/zsh", [entry, opts.query || ""], {
    env: {
      ...process.env,
      profile: "fc",
      hjs_reopen_kw: "fc",
      hjs_profile: "fc",
      alfred_workflow_cache: cache,
      // 无 Alfred 调试噪声
      alfred_debug: "0",
    },
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
    );
  }

  let data: AlfredOut;
  try {
    data = JSON.parse(raw);
  } catch {
    return hint("内容搜索 JSON 解析失败", raw.slice(0, 180), opts.query);
  }
  return mapAlfredOut(data, opts.query || "", "fc");
}
