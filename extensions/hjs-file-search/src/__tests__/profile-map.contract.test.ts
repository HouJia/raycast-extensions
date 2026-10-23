import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { contentBridgeEnv } from "../search/runContentSearch";
import { resolveContentIncludeDirs } from "../search/alfredPrefs";

const EXPECTED = [
  "fc",
  "fcl",
  "fclt",
  "fct",
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

describe("contract: commands ↔ Alfred profiles", () => {
  it("package.json exposes ff/ffw/fd/fc/fct/fcl/fclt + fl* series", () => {
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

  it("contentBridgeEnv maps window/shallow like Alfred", () => {
    expect(contentBridgeEnv("fc")).toEqual({ needDefaultActionInput: false });
    expect(contentBridgeEnv("fct")).toEqual({ hjs_scope: "window", needDefaultActionInput: false });
    expect(contentBridgeEnv("fcl")).toEqual({ search_mode: "shallow", needDefaultActionInput: true });
    expect(contentBridgeEnv("fclt")).toEqual({
      hjs_scope: "window",
      search_mode: "shallow",
      needDefaultActionInput: false,
    });
  });

  it("resolveContentIncludeDirs prefers ffg then ffw", () => {
    expect(resolveContentIncludeDirs({ ffg_include: "~/A\n~/B", ffw_include: "~/C" })).toEqual([
      `${process.env.HOME}/A`,
      `${process.env.HOME}/B`,
    ]);
    expect(resolveContentIncludeDirs({ ffw_include: "~/C" })).toEqual([`${process.env.HOME}/C`]);
    expect(resolveContentIncludeDirs({})).toEqual([]);
  });
});
