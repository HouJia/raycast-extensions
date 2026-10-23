import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { buildExpandQuery, stripExpandSuffix } from "../search/alfredJson";
import { runContentSearch } from "../search/runContentSearch";
import { runListSearch } from "../search/runListSearch";
import { runNameSearch } from "../search/runNameSearch";
import {
  DEFAULT_ENGINE_DIR,
  DEFAULT_FILE_SEARCH_ROOT,
  DEFAULT_QFA_DIR,
  DEFAULT_SYNTAX_DIR,
} from "../search/paths";

const hasEngine = existsSync(join(DEFAULT_ENGINE_DIR, "search.py"));
const hasFfg = existsSync(join(DEFAULT_FILE_SEARCH_ROOT, "src", "ffg-entry.sh"));
const hasFladded = existsSync(join(DEFAULT_SYNTAX_DIR, "fladded.py"));
const hasQfa = existsSync(join(DEFAULT_QFA_DIR, "scripts", "window.py"));

describe("R2 integration: bridge engines (no Raycast UI)", () => {
  it.skipIf(!hasEngine)("ff name search returns mapped items", () => {
    const res = runNameSearch({ query: "HANDOFF e md", profile: "ff" });
    expect(res.profile).toBe("ff");
    expect(res.items.length).toBeGreaterThan(0);
    const files = res.items.filter((i) => i.valid && i.path);
    expect(files.length, `valid files; sample=${JSON.stringify(res.items.slice(0, 3))}`).toBeGreaterThan(0);
    expect(files.some((i) => /handoff/i.test(i.path) || /handoff/i.test(i.title))).toBe(true);
    expect(files[0].kind === "file" || files[0].kind === "folder" || files[0].kind === "hint").toBe(true);
  });

  it.skipIf(!hasFfg)("fc group then expand returns detail lines + back row", () => {
    const q = 'hjs e md i "alfred-workflow-maintenance"';
    const grouped = runContentSearch({ query: q, timeoutMs: 90_000 });
    expect(grouped.items.length).toBeGreaterThan(0);
    const groups = grouped.items.filter((i) => i.kind === "group");
    expect(groups.length, "expect grouped rows").toBeGreaterThan(0);

    const g = groups[0];
    // 优先用自建 expand（与 group_fc.expand_query 同形）；若 mod 里带了 expand_query 也可
    const eq = buildExpandQuery(q, g.path);
    expect(eq).toContain("++");
    expect(eq).toContain(g.path.split("/").pop() || "");
    expect(stripExpandSuffix(eq)).toBe(q);
    if (g.variables?.expand_query) {
      expect(g.variables.expand_query).toContain("++");
      expect(stripExpandSuffix(g.variables.expand_query).length).toBeGreaterThan(0);
    }

    const expanded = runContentSearch({ query: eq, timeoutMs: 90_000 });
    const back = expanded.items.find((i) => i.kind === "back" || i.title.includes("返回分组"));
    expect(back, "expect back row").toBeTruthy();
    const lines = expanded.items.filter((i) => i.kind === "file" && i.valid && i.line);
    expect(lines.length, "expect detail lines").toBeGreaterThan(0);
    expect(lines[0].path).toBeTruthy();
  }, 120_000);

  it.skipIf(!hasFladded)("fldownload / fldesktop / flnewest spawn fladded.py", () => {
    for (const profile of ["fldownload", "fldesktop", "flnewest"] as const) {
      const res = runListSearch({ profile, query: "", timeoutMs: 30_000 });
      expect(res.profile).toBe(profile);
      expect(res.items.length).toBeGreaterThan(0);
      // 空目录也会有「没有结果」hint；有文件则 valid
      expect(res.items[0].title).toBeTruthy();
    }
  }, 90_000);

  it.skipIf(!hasQfa)("flwindows / flwindow return alfred JSON shape", () => {
    const all = runListSearch({ profile: "flwindows", query: "", timeoutMs: 20_000 });
    expect(all.items.length).toBeGreaterThan(0);
    const front = runListSearch({ profile: "flwindow", query: "", timeoutMs: 20_000 });
    expect(front.items.length).toBeGreaterThan(0);
  });

  it.skipIf(!hasQfa)("flrecent uses recent.py not ff", () => {
    const res = runListSearch({ profile: "flrecent", query: "t txt", timeoutMs: 60_000 });
    expect(res.profile).toBe("flrecent");
    expect(res.items.length).toBeGreaterThan(0);
  }, 90_000);

  it.skipIf(!hasQfa)("flfolder / fltag / fltrash register and run", () => {
    for (const profile of ["flfolder", "fltag", "fltrash"] as const) {
      const res = runListSearch({ profile, query: "", timeoutMs: 30_000 });
      expect(res.profile).toBe(profile);
      expect(Array.isArray(res.items)).toBe(true);
      expect(res.items.length).toBeGreaterThan(0);
    }
  }, 90_000);

  it("flfav reads favorites data dir", () => {
    const data = join(homedir(), "Library/Application Support/Alfred/Workflow Data/cc.houjia.favorites");
    if (!existsSync(join(data, "list.txt")) && !existsSync(data)) {
      return; // 无收藏数据时跳过硬断言
    }
    const res = runListSearch({ profile: "flfav", query: "", timeoutMs: 15_000 });
    expect(res.profile).toBe("flfav");
    expect(Array.isArray(res.items)).toBe(true);
  });
});
