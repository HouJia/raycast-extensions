import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED = [
  "fc",
  "fd",
  "ff",
  "ffw",
  "fldesktop",
  "fldownload",
  "flfav",
  "flfolder",
  "flnewest",
  "flrecent",
  "fltag",
  "fltrash",
  "flwindow",
  "flwindows",
].sort();

describe("R2 contract: commands ↔ Alfred profiles", () => {
  it("package.json exposes ff/ffw/fd/fc + fl* series", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(join(here, "../../package.json"), "utf8"));
    const names = (pkg.commands as Array<{ name: string }>).map((c) => c.name).sort();
    expect(names).toEqual(EXPECTED);
  });

  it("each command wires SearchList profile", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    for (const name of EXPECTED) {
      const srcPath = join(here, `../${name}.tsx`);
      expect(existsSync(srcPath), srcPath).toBe(true);
      const src = readFileSync(srcPath, "utf8");
      expect(src).toContain(`profile="${name}"`);
    }
  });
});
