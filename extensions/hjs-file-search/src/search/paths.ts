import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const HOME = homedir();
const WIKI_PROJ = join(
  HOME,
  "Documents/iCreated/hjs-ai-wiki/personal/projects/active/20261014-alfred-workflow-maintenance",
);
const ALFRED_WF = join(HOME, "Library/Application Support/Alfred/Alfred.alfredpreferences/workflows");

export const DEFAULT_ENGINE_DIR = join(WIKI_PROJ, "tools/hjs-file-search/engine");
export const DEFAULT_FILE_SEARCH_ROOT = join(WIKI_PROJ, "tools/hjs-file-search");
export const DEFAULT_SYNTAX_DIR = join(WIKI_PROJ, "tools/hjs-search-syntax");
export const DEFAULT_QFA_DIR = join(ALFRED_WF, "user.workflow.54763281-43B8-4F45-B7F4-367F4C930CBF");
export const DEFAULT_FAV_DIR = join(ALFRED_WF, "user.workflow.EFC39FB1-4743-4AA3-8F90-41F7E47A278F");
export const DEFAULT_FAV_DATA = join(HOME, "Library/Application Support/Alfred/Workflow Data/cc.houjia.favorites");
export const DEFAULT_FILEMANAGER = join(WIKI_PROJ, "tools/hjs-filemanager/hjs-filemanager.sh");
export const INSTALLED_FILE_SEARCH = join(ALFRED_WF, "user.workflow.49E886C7-E47E-43B8-A1DE-E88C777DDE45");

export function resolveEngineDir(pref?: string): string {
  const cand = (pref || "").trim() || DEFAULT_ENGINE_DIR;
  if (!existsSync(join(cand, "search.py"))) {
    throw new Error(`找不到 search.py：${cand}（在扩展偏好里设「Alfred 引擎目录」）`);
  }
  return cand;
}

/** tools/hjs-file-search 或已安装 hjs-File Search 工作流根（含 src/ffg-entry.sh） */
export function resolveFileSearchRoot(enginePref?: string): string {
  const engine = resolveEngineDir(enginePref);
  const fromEngine = dirname(engine);
  const candidates = [fromEngine, DEFAULT_FILE_SEARCH_ROOT, INSTALLED_FILE_SEARCH];
  for (const root of candidates) {
    if (existsSync(join(root, "src", "ffg-entry.sh")) || existsSync(join(root, "src", "grep.sh"))) {
      return root;
    }
  }
  throw new Error(`找不到 ffg-entry.sh / grep.sh（试过 ${candidates.join(" · ")}）`);
}

export function resolveSyntaxDir(): string {
  if (existsSync(join(DEFAULT_SYNTAX_DIR, "fladded.py"))) return DEFAULT_SYNTAX_DIR;
  throw new Error(`找不到 tools/hjs-search-syntax：${DEFAULT_SYNTAX_DIR}`);
}

export function resolveQfaDir(pref?: string): string {
  const cand = (pref || "").trim() || DEFAULT_QFA_DIR;
  if (existsSync(join(cand, "scripts", "window.py")) || existsSync(join(cand, "scripts", "fladded.py"))) {
    return cand;
  }
  if (existsSync(join(DEFAULT_QFA_DIR, "scripts", "window.py"))) return DEFAULT_QFA_DIR;
  throw new Error(`找不到 hjs-Quick File Access 工作流：${cand}`);
}

export function resolveFavoritesDir(): string {
  if (existsSync(join(DEFAULT_FAV_DIR, "scripts", "flfav.py"))) return DEFAULT_FAV_DIR;
  throw new Error(`找不到 hjs-Favorites 工作流：${DEFAULT_FAV_DIR}`);
}

export function resolveFavoritesData(): string {
  return DEFAULT_FAV_DATA;
}

export function resolveFileManager(): string {
  if (!existsSync(DEFAULT_FILEMANAGER)) {
    throw new Error(`找不到 hjs-filemanager.sh：${DEFAULT_FILEMANAGER}`);
  }
  return DEFAULT_FILEMANAGER;
}
