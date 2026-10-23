import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

describe("R2 contract: commands ↔ Alfred profiles", () => {
  it("package.json exposes ff/ffw/fd/fc/flrecent", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(join(here, "../../package.json"), "utf8"));
    const names = (pkg.commands as Array<{ name: string }>).map((c) => c.name).sort();
    expect(names).toEqual(["fc", "fd", "ff", "ffw", "flrecent"].sort());
  });

  it("each command wires SearchList profile", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    for (const name of ["ff", "ffw", "fd", "fc", "flrecent"]) {
      const src = readFileSync(join(here, `../${name}.tsx`), "utf8");
      expect(src).toContain(`profile="${name}"`);
    }
  });
});
