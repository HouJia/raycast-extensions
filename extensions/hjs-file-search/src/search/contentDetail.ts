import type { SearchItem } from "./types";

/** 分组行 Detail：行号 + 片段（markdown 表格） */
export function formatGroupDetailMarkdown(
  group: SearchItem | undefined,
  lines: SearchItem[],
  opts?: { loading?: boolean; error?: string },
): string {
  if (!group) return "";
  const header = `# ${group.title || group.path || "命中"}\n\n\`${group.path || ""}\`\n\n`;
  if (opts?.error) return header + `> 展开失败：${opts.error}\n`;
  if (opts?.loading) return header + "_正在加载逐行命中…_\n";
  const hits = lines.filter((i) => i.kind === "file" && i.valid && i.line);
  if (!hits.length) {
    return header + "_暂无逐行命中（可 ⌃↩ 独立列表展开）_\n";
  }
  const rows = hits
    .slice(0, 80)
    .map((h) => {
      const ln = h.line ?? "?";
      const frag = (h.title || h.subtitle || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
      return `| ${ln} | ${frag} |`;
    })
    .join("\n");
  return `${header}| 行 | 片段 |\n| ---: | --- |\n${rows}\n`;
}

/** 非分组：路径元数据 */
export function formatPathDetailMarkdown(item: SearchItem | undefined): string {
  if (!item) return "";
  if (item.kind === "hint" || item.kind === "back") {
    return `**${item.title}**\n\n${item.subtitle || ""}`;
  }
  const bits = [`# ${item.title || item.path}`, "", `\`${item.path || ""}\``];
  if (item.line) bits.push("", `行 ${item.line}${item.col ? ` · 列 ${item.col}` : ""}`);
  if (item.subtitle) bits.push("", item.subtitle);
  return bits.join("\n");
}
