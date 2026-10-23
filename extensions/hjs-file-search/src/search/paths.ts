import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const DEFAULT_ENGINE_DIR = join(
  homedir(),
  "Documents/iCreated/hjs-ai-wiki/personal/projects/active/20261014-alfred-workflow-maintenance/tools/hjs-file-search/engine",
);

export const DEFAULT_FILEMANAGER = join(
  homedir(),
  "Documents/iCreated/hjs-ai-wiki/personal/projects/active/20261014-alfred-workflow-maintenance/tools/hjs-filemanager/hjs-filemanager.sh",
);

export function resolveEngineDir(pref?: string): string {
  const cand = (pref || "").trim() || DEFAULT_ENGINE_DIR;
  if (!existsSync(join(cand, "search.py"))) {
    throw new Error(`找不到 search.py：${cand}（在扩展偏好里设「Alfred 引擎目录」）`);
  }
  return cand;
}

export function resolveFileManager(): string {
  if (!existsSync(DEFAULT_FILEMANAGER)) {
    throw new Error(`找不到 hjs-filemanager.sh：${DEFAULT_FILEMANAGER}`);
  }
  return DEFAULT_FILEMANAGER;
}
