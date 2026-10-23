import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { invalidTypes, parse } from "../core/parse";
import { matches, typeRank } from "../core/match";
import { hintInfo } from "../core/hint";

const here = dirname(fileURLToPath(import.meta.url));
const coreRoot = join(here, "../../../../../hjs-launcher-core");

function loadGolden(rel: string) {
  return JSON.parse(readFileSync(join(coreRoot, "tests/golden", rel), "utf8"));
}

describe("R2 contract: embedded core ≡ launcher-core golden", () => {
  it("parse golden cases", () => {
    const g = loadGolden("parse/qsyntax-parse.json");
    let n = 0;
    for (const c of g.cases as Array<{
      id: string;
      query: string;
      full_words?: boolean;
      expect: Record<string, unknown>;
      invalid_types?: string[];
    }>) {
      const got = parse(c.query, c.full_words !== false) as unknown as Record<string, unknown>;
      for (const [k, v] of Object.entries(c.expect || {})) {
        expect(got[k], `${c.id}.${k}`).toEqual(v);
      }
      if (c.invalid_types) {
        expect(invalidTypes(parse(c.query, c.full_words !== false)), `${c.id}.invalid_types`).toEqual(
          c.invalid_types,
        );
      }
      n++;
    }
    expect(n).toBeGreaterThan(10);
  });

  it("matches + typeRank smoke", () => {
    const p = parse("t plain");
    expect(matches("/tmp/readme.md", p)).toBe(true);
    expect(typeRank("/tmp/readme.md", p)).toBeTypeOf("number");
  });

  it("hintInfo smoke", () => {
    const p = parse("t plain");
    const info = hintInfo(["/a/x.md", "/b/y.md"], p, "file");
    expect(info === null || typeof info?.title === "string").toBe(true);
  });
});
