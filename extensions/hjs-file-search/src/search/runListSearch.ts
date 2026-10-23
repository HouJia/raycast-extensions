import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { mapAlfredOut, type AlfredOut } from "./alfredJson";
import {
  resolveFavoritesData,
  resolveFavoritesDir,
  resolveQfaDir,
  resolveSyntaxDir,
} from "./paths";
import type { ListProfile, SearchResponse } from "./types";

export type FlProfile = Exclude<ListProfile, "ff" | "ffw" | "fd" | "fc">;

function hint(profile: string, title: string, subtitle: string, query: string): SearchResponse {
  return {
    query,
    profile,
    items: [{ id: `${profile}-hint`, title, subtitle, path: "", kind: "hint", valid: false }],
  };
}

function parseOut(raw: string, profile: string, query: string, stderr: string, status: number | null): SearchResponse {
  const text = (raw || "").trim();
  if (!text) {
    return hint(profile, `${profile} 无输出`, stderr.slice(0, 200) || `code=${status}`, query);
  }
  try {
    return mapAlfredOut(JSON.parse(text) as AlfredOut, query, profile);
  } catch {
    return hint(profile, `${profile} JSON 解析失败`, text.slice(0, 180), query);
  }
}

function runZshPipeline(opts: {
  cwd: string;
  script: string;
  env?: Record<string, string>;
  timeoutMs?: number;
}): { stdout: string; stderr: string; status: number | null } {
  const proc = spawnSync("/bin/zsh", ["-c", opts.script], {
    cwd: opts.cwd,
    env: { ...process.env, ...(opts.env || {}) },
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    timeout: opts.timeoutMs ?? 120_000,
  });
  return { stdout: proc.stdout || "", stderr: proc.stderr || "", status: proc.status };
}

/** fl* 列表入口：桥接 Alfred/QFA/Favorites 脚本，同语法过滤。 */
export function runListSearch(opts: {
  profile: FlProfile;
  query: string;
  qfaDir?: string;
  timeoutMs?: number;
}): SearchResponse {
  const q = opts.query || "";
  const profile = opts.profile;
  const qfa = resolveQfaDir(opts.qfaDir);
  const syntax = resolveSyntaxDir();

  if (profile === "fldownload" || profile === "fldesktop" || profile === "flnewest") {
    const mode = profile === "fldownload" ? "download" : profile === "fldesktop" ? "desktop" : "newest";
    const script = existsSync(join(syntax, "fladded.py"))
      ? join(syntax, "fladded.py")
      : join(qfa, "scripts", "fladded.py");
    const proc = spawnSync("/usr/bin/python3", [script, mode, q], {
      cwd: syntax,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
      timeout: opts.timeoutMs ?? 60_000,
      env: { ...process.env },
    });
    return parseOut(proc.stdout || "", profile, q, proc.stderr || "", proc.status);
  }

  if (profile === "flrecent") {
    const recent = existsSync(join(qfa, "scripts", "recent.py"))
      ? join(qfa, "scripts", "recent.py")
      : join(syntax, "flrecent.py");
    const proc = spawnSync("/usr/bin/python3", [recent, q], {
      cwd: existsSync(join(qfa, "scripts", "recent.py")) ? qfa : syntax,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
      timeout: opts.timeoutMs ?? 90_000,
      env: {
        ...process.env,
        alfred_workflow_cache:
          process.env.alfred_workflow_cache ||
          join(
            process.env.HOME || "",
            "Library/Caches/com.runningwithcrayons.Alfred/Workflow Data/cc.houjia.quick-file-access",
          ),
      },
    });
    return parseOut(proc.stdout || "", profile, q, proc.stderr || "", proc.status);
  }

  if (profile === "flwindows" || profile === "flwindow") {
    const mode = profile === "flwindows" ? "all" : "front";
    const win = join(qfa, "scripts", "window.py");
    const filter = join(qfa, "scripts", "qsyntax.py");
    if (!existsSync(win)) return hint(profile, "window.py 未找到", win, q);
    const script = existsSync(filter)
      ? `/usr/bin/python3 ./scripts/window.py ${mode} | /usr/bin/python3 ./scripts/qsyntax.py filter ${JSON.stringify(q)} ${profile}`
      : `/usr/bin/python3 ./scripts/window.py ${mode}`;
    const r = runZshPipeline({
      cwd: qfa,
      script,
      env: { allwin_keyword: "flwindows", alfred_workflow_keyword: profile },
      timeoutMs: opts.timeoutMs ?? 30_000,
    });
    return parseOut(r.stdout, profile, q, r.stderr, r.status);
  }

  if (profile === "flfolder" || profile === "fltag" || profile === "fltrash") {
    const finder = join(qfa, "scripts", "file-finder.js");
    const filter = join(qfa, "scripts", "qsyntax.py");
    if (!existsSync(finder)) return hint(profile, "file-finder.js 未找到", finder, q);
    const script = existsSync(filter)
      ? `./scripts/file-finder.js | /usr/bin/python3 ./scripts/qsyntax.py filter ${JSON.stringify(q)} ${profile}`
      : `./scripts/file-finder.js`;
    const r = runZshPipeline({
      cwd: qfa,
      script,
      env: {
        alfred_workflow_keyword: profile,
        // file-finder 用 getenv 读这些；与 Alfred 默认对齐
        custom_folder_keyword: "flfolder",
        tag_keyword: "fltag",
        trash_keyword: "fltrash",
        recent_keyword: "flrecent",
        frontwin_keyword: "flwindow",
        custom_folder: process.env.custom_folder || "~/Downloads",
        tag_to_search: process.env.tag_to_search || "wip",
        tag_prefix: process.env.tag_prefix || "🟠",
        alfred_preferences:
          process.env.alfred_preferences ||
          join(process.env.HOME || "", "Library/Application Support/Alfred/Alfred.alfredpreferences"),
        alfred_workflow_uid: "user.workflow.54763281-43B8-4F45-B7F4-367F4C930CBF",
      },
      timeoutMs: opts.timeoutMs ?? 60_000,
    });
    return parseOut(r.stdout, profile, q, r.stderr, r.status);
  }

  if (profile === "flfav") {
    const favDir = resolveFavoritesDir();
    const data = resolveFavoritesData();
    mkdirSync(data, { recursive: true });
    const script = join(favDir, "scripts", "flfav.py");
    const proc = spawnSync("/usr/bin/python3", [script, q], {
      cwd: favDir,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
      timeout: opts.timeoutMs ?? 30_000,
      env: { ...process.env, alfred_workflow_data: data },
    });
    return parseOut(proc.stdout || "", profile, q, proc.stderr || "", proc.status);
  }

  return hint(profile, `未知列表档位 ${profile}`, "", q);
}
