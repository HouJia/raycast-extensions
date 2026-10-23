import { taxonomy } from "./taxonomy.ts";
import type { ParseResult } from "./parse.ts";
import { candidateLeaf } from "./classify.ts";

const LEAF_SHORT: Record<string, string> = taxonomy.LEAF_SHORT ?? {
  plain: "plain",
  rtf: "rtf",
  subtitle: "sub",
  mail: "mail",
  html: "html",
  data: "data",
  log: "log",
  code: "code",
  word: "word",
  sheet: "sheet",
  slide: "slide",
  office: "office",
};

function width(text: string): number {
  let w = 0;
  for (const c of text) w += c.codePointAt(0)! > 0x2e7f ? 2 : 1;
  return w;
}

function displayBudget(kind: "title" | "subtitle"): number {
  const widthPt = Number(process.env.fs_result_width || 2000) || 2000;
  const size = kind === "title" ? 18 : 12;
  const overhead = 110;
  return Math.max(20, Math.floor(((widthPt - overhead) / (size / 2.0)) * 0.9));
}

function fit(head: string, parts: string[], budget: number): string {
  let out = head;
  for (let n = 0; n < parts.length; n++) {
    const piece = (n === 0 ? "" : " · ") + parts[n];
    if (n && width(out + piece) > budget - 2) return out + " …";
    out += piece;
  }
  return out;
}

export type HintInfo = { title: string; subtitle: string };

export function hintInfo(paths: string[], parsed: ParseResult, kind: string | null = null): HintInfo | null {
  const list = (paths || []).filter(Boolean);
  if (!list.length) return null;
  const typed = Boolean(parsed?.type?.length);
  const leaves = new Map<string, number>();
  const exts = new Map<string, number>();
  for (const p of list) {
    const leaf = candidateLeaf(p, kind, typed);
    const short = LEAF_SHORT[leaf] ?? leaf;
    leaves.set(short, (leaves.get(short) || 0) + 1);
    const name = p.replace(/\/+$/, "").split("/").pop()!.toLowerCase();
    if (name.replace(/^\.+/, "").includes(".")) {
      const ext = name.split(".").pop()!;
      exts.set(ext, (exts.get(ext) || 0) + 1);
    }
  }
  if (!(typed || (parsed?.ext?.length) || leaves.size > 1)) return null;
  const total = list.length;
  const leafParts = [...leaves.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(
    ([k, v]) => `${k} ${v}`,
  );
  // Python Counter.most_common is by count then insertion order; for golden we used insertion from path order.
  // Rebuild with first-seen order for ties: iterate paths again.
  const leafOrder: string[] = [];
  const leafCount = new Map<string, number>();
  for (const p of list) {
    const leaf = candidateLeaf(p, kind, typed);
    const short = LEAF_SHORT[leaf] ?? leaf;
    if (!leafCount.has(short)) leafOrder.push(short);
    leafCount.set(short, (leafCount.get(short) || 0) + 1);
  }
  const leafSorted = [...leafOrder].sort((a, b) => (leafCount.get(b)! - leafCount.get(a)!) || 0);
  // stable by first-seen when counts equal: sort is not stable for equal in all engines the same way —
  // use explicit: most_common style
  const leafMost = [...leafCount.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return leafOrder.indexOf(a[0]) - leafOrder.indexOf(b[0]);
  });

  let title: string;
  if (leafMost.length > 1) {
    title = fit(
      "可再缩小 t：",
      leafMost.map(([k, v]) => `${k} ${v}`),
      displayBudget("title"),
    );
  } else {
    const [[only, n]] = leafMost;
    title = `全部是 t ${only}（${n} 个），类型已是最细一层`;
  }

  const extOrder: string[] = [];
  const extCount = new Map<string, number>();
  for (const p of list) {
    const name = p.replace(/\/+$/, "").split("/").pop()!.toLowerCase();
    if (name.replace(/^\.+/, "").includes(".")) {
      const ext = name.split(".").pop()!;
      if (!extCount.has(ext)) extOrder.push(ext);
      extCount.set(ext, (extCount.get(ext) || 0) + 1);
    }
  }
  const extMost = [...extCount.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return extOrder.indexOf(a[0]) - extOrder.indexOf(b[0]);
  });

  let subtitle: string;
  if (extMost.length > 1) {
    subtitle =
      fit(
        "e：",
        extMost.map(([k, v]) => `${k} ${v}`),
        displayBudget("subtitle") - 14,
      ) + `（共 ${total} 个）`;
  } else if (extMost.length === 1) {
    subtitle = `扩展名都是 .${extMost[0][0]}（${total} 个）；可加 f 文件名或 i 目录继续缩小 · 这一行不可打开`;
  } else {
    subtitle = "没有扩展名；可加 f 文件名或 i 目录继续缩小 · 这一行不可打开";
  }
  return { title, subtitle };
}

export function refineHint(paths: string[], parsed: ParseResult, kind: string | null = null): string {
  const info = hintInfo(paths, parsed, kind);
  return info ? info.title : "";
}
