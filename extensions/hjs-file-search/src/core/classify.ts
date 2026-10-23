import { readFileSync, statSync } from "node:fs";
import { taxonomy } from "./taxonomy.ts";

const LEAF_EXT: Record<string, string> = {};
for (const [leaf, exts] of Object.entries(taxonomy.LEAF_EXTENSIONS)) {
  for (const e of exts) {
    if (!(e in LEAF_EXT)) LEAF_EXT[e] = leaf;
  }
}

const PKG = taxonomy.PACKAGE_EXTENSIONS.map((e) => e.toLowerCase());
const PKG_SUFFIXES = Array.from(new Set([".framework", ...PKG]));
const PKG_SUFFIX_SET = new Set(PKG_SUFFIXES);
const CODE_NAMES = new Set(taxonomy.CODE_NAMES);
const DATA_DOTFILES = new Set(taxonomy.DATA_DOTFILES);
const MOD_TAGS = new Set(["M.K.", "M!K!", "FLT4", "FLT8", "4CHN", "6CHN", "8CHN"]);
const SNIFF_BYTES = 16384;
const sniffCache = new Map<string, string>();

const LEGACY_PRIMARY: Record<string, string> = {
  rtf: "rtf",
  html: "html",
  word: "office",
  sheet: "office",
  slide: "office",
  office: "office",
};

/** 对齐 Python：ext = lower.rsplit(".", 1)[-1] if "." in lower.lstrip(".") else "" */
function fileExt(lowerBase: string): string {
  const lstrip = lowerBase.replace(/^\.+/, "");
  if (!lstrip.includes(".")) return "";
  const i = lowerBase.lastIndexOf(".");
  return i >= 0 ? lowerBase.slice(i + 1) : "";
}

function looksText(data: Buffer): boolean {
  if (data.length >= 2 && ((data[0] === 0xff && data[1] === 0xfe) || (data[0] === 0xfe && data[1] === 0xff))) {
    try {
      const decoded = data.toString("utf16le");
      // BOM path: Python uses utf-16 which handles BOM; Node utf16le keeps BOM char — strip
      const text = decoded.replace(/^\uFEFF/, "");
      return text.length > 0 && [...text].every((c) => {
        const code = c.codePointAt(0)!;
        return (
          (code >= 0x20 && code !== 0x7f) ||
          c === "\n" ||
          c === "\r" ||
          c === "\t" ||
          c === "\f" ||
          c === "\x1b" ||
          code > 0x7f
        );
      });
    } catch {
      return false;
    }
  }
  if (data.includes(0)) return false;
  try {
    let start = 0;
    if (data.length >= 3 && data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf) start = 3;
    const text = data.subarray(start).toString("utf8");
    // validate round-trip for strictness approximating Python strict decoder
    const rebuilt = Buffer.from(text, "utf8");
    if (!rebuilt.equals(data.subarray(start))) return false;
    return text.length > 0 && [...text].every((c) => {
      const code = c.codePointAt(0)!;
      return (
        (c >= " " && c !== "\x7f") ||
        c === "\n" ||
        c === "\r" ||
        c === "\t" ||
        c === "\f" ||
        c === "\x1b" ||
        code > 0x7f
      );
    });
  } catch {
    return false;
  }
}

function tsSync(data: Buffer): boolean {
  for (const stride of [188, 192, 204]) {
    for (let offset = 0; offset < Math.min(stride, data.length); offset++) {
      let ok = true;
      for (let n = 0; n < 4; n++) {
        const i = offset + stride * n;
        if (i + 3 >= data.length || data[i] !== 0x47 || (data[i + 3] & 0x30) === 0) {
          ok = false;
          break;
        }
      }
      if (ok && offset + stride * 3 + 3 < data.length) return true;
    }
  }
  return false;
}

/** 公开：对已读头部分类（金样与宿主共用）。 */
export function classifyHead(data: Buffer, ext: string, fallback: string): string {
  if (!data.length) return fallback === "text" ? "text" : "other";
  if (data.subarray(0, 4).equals(Buffer.from(".RMF"))) return "video";
  if (
    data.length >= 8 &&
    data.subarray(0, 8).equals(Buffer.from([0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11]))
  ) {
    return "video";
  }
  if (data.length >= 12 && data.subarray(0, 4).equals(Buffer.from("RIFF")) && data.subarray(8, 12).equals(Buffer.from("CDXA"))) {
    return "video";
  }
  if (data.length >= 1084) {
    const tag = data.subarray(1080, 1084).toString("binary");
    if (MOD_TAGS.has(tag)) return "audio";
  }
  if (data.length >= 4 && data.subarray(0, 4).equals(Buffer.from([0x00, 0x00, 0x01, 0xba]))) return "video";
  if (data.length >= 4 && data.subarray(0, 4).equals(Buffer.from([0x00, 0x00, 0x01, 0xb3]))) return "video";
  if (looksText(data)) return "text";
  if (tsSync(data)) return "video";
  return "other";
}

export function sniffContentType(path: string, ext: string): string {
  const fallback = taxonomy.AMBIGUOUS_DEFAULT[ext] ?? "other";
  let st: { size: number; mtimeMs: number };
  try {
    const s = statSync(path);
    st = { size: s.size, mtimeMs: s.mtimeMs };
  } catch {
    return fallback;
  }
  const key = `${path}\t${st.size}\t${st.mtimeMs}`;
  const hit = sniffCache.get(key);
  if (hit) return hit;
  let data: Buffer;
  try {
    // read at most SNIFF_BYTES
    const fd = readFileSync(path);
    data = fd.subarray(0, SNIFF_BYTES);
  } catch {
    return fallback;
  }
  const result = classifyHead(data, ext, fallback);
  if (sniffCache.size > 4096) sniffCache.clear();
  sniffCache.set(key, result);
  return result;
}

export function candidateLeaf(path: string, kind: string | null = null, sniff = false): string {
  const base = (path || "").replace(/\/+$/, "").split("/").pop() || "";
  const lower = base.toLowerCase();
  if (lower.endsWith(".app")) return "app";
  if (lower.endsWith(".rtfd")) return "rtf";
  if (PKG_SUFFIXES.some((s) => lower.endsWith(s)) && !PKG_SUFFIX_SET.has(lower)) {
    if (lower.endsWith(".pages")) return "word";
    if (lower.endsWith(".numbers")) return "sheet";
    if (lower.endsWith(".key")) return "slide";
    return "package";
  }
  if (kind === "d") return "folder";
  if (CODE_NAMES.has(lower)) return "code";
  if (DATA_DOTFILES.has(lower)) return "data";
  const ext = fileExt(lower);
  if (ext in taxonomy.AMBIGUOUS_DEFAULT) {
    const t = sniff ? sniffContentType(path, ext) : taxonomy.AMBIGUOUS_DEFAULT[ext];
    if (t === "text") return taxonomy.SNIFF_TEXT_LEAF[ext] ?? "plain";
    return t;
  }
  return LEAF_EXT[ext] ?? "other";
}

export function leafClasses(leaf: string, path = ""): Set<string> {
  const classes = new Set<string>([leaf]);
  const parent = taxonomy.LEAF_PARENT[leaf];
  if (parent) classes.add(parent);
  const base = (path || "").split("/").pop() || "";
  const lower = base.toLowerCase();
  const ext = lower.includes(".") ? lower.split(".").pop()! : "";
  for (const c of taxonomy.EXTRA_CLASSES[ext] || []) classes.add(c);
  return classes;
}

export function candidateClasses(path: string, kind: string | null = null, sniff = false): string[] {
  return [...leafClasses(candidateLeaf(path, kind, sniff), path)].sort();
}

export function primaryOf(leaf: string): string {
  if (leaf in LEGACY_PRIMARY) return LEGACY_PRIMARY[leaf];
  return taxonomy.LEAF_PARENT[leaf] ?? leaf;
}
