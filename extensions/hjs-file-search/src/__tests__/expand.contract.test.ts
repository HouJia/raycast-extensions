import { describe, expect, it } from "vitest";
import { buildExpandQuery, mapAlfredItem, stripExpandSuffix } from "../search/alfredJson";

describe("R2 contract: fc expand query ↔ Alfred", () => {
  it("buildExpandQuery matches group_fc.expand_query shape", () => {
    expect(buildExpandQuery("培养 学习 t txt", "/tmp/foo/【滴滴五面】.md")).toBe(
      '培养 学习 t txt ++ f "【滴滴五面】.md"',
    );
    expect(buildExpandQuery("", "/a/b.txt")).toBe('++ f "b.txt"');
  });

  it("stripExpandSuffix restores group query", () => {
    expect(stripExpandSuffix('hjs e md ++ f "HANDOFF.md"')).toBe("hjs e md");
    expect(stripExpandSuffix("hjs e md")).toBe("hjs e md");
  });

  it("maps hjs_fc_group and back row kinds; lifts expand_query from ctrl mod", () => {
    const group = mapAlfredItem(
      {
        title: "2 处 · a.md",
        arg: "/tmp/a.md",
        hjs_fc_group: true,
        variables: { filepath: "/tmp/a.md", linenum: "10" },
        mods: {
          ctrl: {
            variables: {
              expand_query: 'q ++ f "a.md"',
              expand_keyword: "fc",
              open_action: "expand",
            },
          },
        },
      },
      "fc",
    );
    expect(group.kind).toBe("group");
    expect(group.line).toBe(10);
    expect(group.variables?.expand_query).toBe('q ++ f "a.md"');

    const back = mapAlfredItem(
      { title: "← 返回分组列表", valid: true, variables: { open_action: "expand" } },
      "fc",
    );
    expect(back.kind).toBe("back");

    const line = mapAlfredItem(
      {
        title: "hit",
        arg: "/tmp/a.md",
        variables: { filepath: "/tmp/a.md", linenum: "12", colnum: "3" },
      },
      "fc",
    );
    expect(line.kind).toBe("file");
    expect(line.line).toBe(12);
    expect(line.col).toBe(3);
  });
});
