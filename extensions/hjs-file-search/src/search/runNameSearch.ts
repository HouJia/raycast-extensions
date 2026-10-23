import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { mapAlfredOut, type AlfredOut } from "./alfredJson";
import { resolveEngineDir } from "./paths";
import type { SearchResponse } from "./types";

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
  return mapAlfredOut(data, opts.query || "", opts.profile);
}
