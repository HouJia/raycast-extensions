import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

describe("contract: action key map + Detail A", () => {
  it("SearchList declares cmd+return reveal and opt+return copy", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "../components/SearchList.tsx"), "utf8");
    expect(src).toMatch(/modifiers:\s*\["cmd"\]/);
    expect(src).toMatch(/modifiers:\s*\["opt"\]/);
    expect(src).toMatch(/在文件管理器中显示/);
    expect(src).toMatch(/复制路径/);
    expect(src).toMatch(/filtering=\{false\}/);
  });

  it("scheme A: isShowingDetail + group Detail markdown; Push expand is secondary", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "../components/SearchList.tsx"), "utf8");
    expect(src).toMatch(/isShowingDetail=\{showDetail\}/);
    expect(src).toMatch(/List\.Item\.Detail/);
    expect(src).toMatch(/formatGroupDetailMarkdown/);
    expect(src).toMatch(/打开最佳行/);
    expect(src).toMatch(/打开第 \$\{h\.line\} 行/);
    expect(src).toMatch(/modifiers:\s*\["ctrl"\]/);
    expect(src).toMatch(/在独立列表展开/);
    expect(src).toMatch(/Action\.Push/);
    expect(src).toMatch(/FcExpandList/);
    expect(src).toMatch(/buildExpandQuery/);
  });

  it("FcExpandList has back + path:line copy (secondary)", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "../components/FcExpandList.tsx"), "utf8");
    expect(src).toMatch(/返回分组列表/);
    expect(src).toMatch(/copyPathLine/);
    expect(src).toMatch(/路径:行号/);
    expect(src).toMatch(/filtering=\{false\}/);
  });

  it("fileActions uses shared hjs-filemanager for reveal", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "../actions/fileActions.ts"), "utf8");
    expect(src).toMatch(/resolveFileManager/);
    expect(src).toMatch(/reveal/);
    expect(src).toMatch(/Clipboard\.copy/);
    expect(src).toMatch(/copyPathLine/);
  });
});
