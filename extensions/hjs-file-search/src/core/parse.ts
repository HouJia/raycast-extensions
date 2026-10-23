import { taxonomy, knownTypeValues } from "./taxonomy.ts";

export type ParseResult = {
  main: string[][];
  dir: string[][];
  dir_all: string[][];
  file: string[][];
  ext: string[][];
  exts: string[];
  type: string[][];
  source: string[][];
  paths: string[];
  exclude: Record<string, string[]>;
  keywords: string[];
  empty_keywords: string[];
};

const EXT_PREFIX = /^(e|ext):(.+)$/i;
const AND = new Set(taxonomy.AND_WORDS);
const OR = new Set(taxonomy.OR_WORDS);

function cleanExt(text: string): string {
  return text.trim().replace(/^\.+/, "").toLowerCase();
}

function isPathScope(term: string): boolean {
  return term === "." || term === "~" || term.startsWith("~/") || term.startsWith("/");
}

type Quoted = boolean | "neg";

function scan(query: string): Array<[string, Quoted]> {
  const tokens: Array<[string, Quoted]> = [];
  let buf: string[] = [];
  let quoted: Quoted = false;
  let inside = false;
  let bangQuote = false;
  let q: string | null = null;
  const s = query || "";
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (q) {
      if (ch === "\\" && i + 1 < s.length && (s[i + 1] === q || s[i + 1] === "\\")) {
        buf.push(s[i + 1]);
        i += 2;
        continue;
      }
      if (ch === q) {
        q = null;
        i += 1;
        continue;
      }
      buf.push(ch);
      i += 1;
      continue;
    }
    if (/\s/.test(ch)) {
      if (inside) tokens.push([buf.join(""), bangQuote ? "neg" : quoted]);
      buf = [];
      quoted = false;
      inside = false;
      bangQuote = false;
      i += 1;
      continue;
    }
    inside = true;
    if (ch === "\\" && i + 1 < s.length && "\"'\\".includes(s[i + 1])) {
      buf.push(s[i + 1]);
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      if (buf.length === 1 && buf[0] === "!" && !quoted) bangQuote = true;
      q = ch;
      quoted = true;
      i += 1;
      continue;
    }
    buf.push(ch);
    i += 1;
  }
  if (inside) tokens.push([buf.join(""), bangQuote ? "neg" : quoted]);
  return tokens;
}

function splitTokens(query: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const [text, quoted] of scan(query)) {
    if (quoted === "neg") {
      out.push(["neg", text.slice(1)]);
      continue;
    }
    if (quoted) {
      out.push(["lit", text]);
      continue;
    }
    if (text.includes("|") && text !== "|") {
      const parts = text.split("|");
      parts.forEach((part, k) => {
        if (k) out.push(["word", "|"]);
        if (part) out.push(["word", part]);
      });
    } else {
      out.push(["word", text]);
    }
  }
  return out;
}

function groupEquals(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function parse(query: string, fullWords = true): ParseResult {
  const fields: Record<string, string[][]> = {
    main: [[]],
    dir: [[]],
    file: [[]],
    ext: [[]],
    type: [[]],
    source: [[]],
  };
  const exclude: Record<string, string[]> = {
    main: [],
    dir: [],
    file: [],
    ext: [],
    type: [],
    source: [],
  };
  const dirAll: string[][] = [[]];
  const paths: string[] = [];
  let mode = "main";
  const seen: string[] = [];
  const empty: string[] = [];
  let cur: string | null = null;
  let count = 0;
  let pending: string | null = null;

  const close = () => {
    if (cur && count === 0) empty.push(cur);
  };

  for (const tok of splitTokens(query)) {
    let kind = tok[0];
    let text = tok[1];
    if (kind === "neg" || (kind === "word" && text.startsWith("!") && text.length > 1)) {
      let term = kind === "neg" ? text : text.slice(1);
      if (mode === "ext") term = cleanExt(term);
      else if (mode === "type") term = taxonomy.TYPE_ALIASES[term.toLowerCase()] ?? term.toLowerCase();
      if (term && !exclude[mode].includes(term)) exclude[mode].push(term);
      if (term) count += 1;
      pending = null;
      continue;
    }
    if (
      kind === "word" &&
      fullWords &&
      Object.prototype.hasOwnProperty.call(taxonomy.WORD_ALIASES, text) &&
      !(mode === "type" && Object.prototype.hasOwnProperty.call(taxonomy.TYPE_ALIASES, text.toLowerCase()))
    ) {
      text = taxonomy.WORD_ALIASES[text];
    }
    if (kind === "word") {
      const m = EXT_PREFIX.exec(text);
      if (m && ["e", "ext"].includes(text.split(":")[0].toLowerCase())) {
        for (const raw of m[2].split(",")) {
          if (raw.startsWith("!") && raw.length > 1) {
            const negativeExt = cleanExt(raw.slice(1));
            if (negativeExt && !exclude.ext.includes(negativeExt)) exclude.ext.push(negativeExt);
            continue;
          }
          const e = cleanExt(raw);
          if (e && !fields.ext.some((g) => groupEquals(g, [e]))) {
            if (fields.ext[fields.ext.length - 1].length) fields.ext.push([]);
            fields.ext[fields.ext.length - 1].push(e);
          }
        }
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(taxonomy.KEYWORDS, text)) {
        close();
        mode = taxonomy.KEYWORDS[text];
        cur = text;
        count = 0;
        pending = null;
        seen.push(text);
        continue;
      }
      if (AND.has(text)) {
        pending = "and";
        continue;
      }
      if (OR.has(text)) {
        if (fields[mode][fields[mode].length - 1].length || (mode === "dir" && dirAll[dirAll.length - 1].length)) {
          fields[mode].push([]);
          if (mode === "dir") dirAll.push([]);
        }
        pending = "or";
        continue;
      }
    }
    if (!text) continue;
    if (mode === "ext") {
      text = cleanExt(text);
      if (!text) continue;
      const groups = fields.ext;
      if (groups[groups.length - 1].length && pending !== "and") groups.push([]);
    } else if (mode === "type") {
      text = taxonomy.TYPE_ALIASES[text.toLowerCase()] ?? text.toLowerCase();
    } else if (mode === "dir") {
      dirAll[dirAll.length - 1].push(text);
      if (kind === "word" && isPathScope(text)) {
        paths.push(text);
        pending = null;
        count += 1;
        continue;
      }
    }
    const groups = fields[mode];
    groups[groups.length - 1].push(text);
    pending = null;
    count += 1;
  }
  close();

  const r: Record<string, string[][]> = {};
  for (const [k, v] of Object.entries(fields)) {
    r[k] = v.filter((g) => g.length);
  }
  const extGroups: string[][] = [];
  for (const g of r.ext) {
    const uniq = [...new Set(g)];
    if (!extGroups.some((x) => groupEquals(x, uniq))) extGroups.push(uniq);
  }
  const exts: string[] = [];
  for (const g of extGroups) for (const e of g) if (!exts.includes(e)) exts.push(e);

  return {
    main: r.main,
    dir: r.dir,
    dir_all: dirAll.filter((g) => g.length),
    file: r.file,
    ext: extGroups,
    exts,
    type: r.type,
    source: r.source,
    paths,
    exclude,
    keywords: seen,
    empty_keywords: empty,
  };
}

export function invalidTypes(parsed: ParseResult): string[] {
  const bad: string[] = [];
  for (const g of parsed.type || []) {
    for (const t of g) {
      if (!knownTypeValues.has(t)) bad.push(t);
    }
  }
  for (const t of parsed.exclude?.type || []) {
    if (!knownTypeValues.has(t)) bad.push(t);
  }
  return bad;
}
