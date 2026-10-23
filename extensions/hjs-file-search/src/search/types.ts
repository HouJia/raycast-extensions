export type SearchItem = {
  id: string;
  title: string;
  subtitle: string;
  path: string;
  kind: "file" | "folder" | "hint" | "group" | "back";
  line?: number;
  col?: number;
  valid: boolean;
  variables?: Record<string, string>;
};

export type SearchResponse = {
  items: SearchItem[];
  query: string;
  profile: string;
};

/** 内容检索档位（与 Alfred fc / fct / fcl / fclt 对齐） */
export type ContentProfile = "fc" | "fct" | "fcl" | "fclt";

/** 与 Alfred 同名的列表入口 */
export type ListProfile =
  | "ff"
  | "ffw"
  | "fd"
  | ContentProfile
  | "flrecent"
  | "flnewest"
  | "fldownload"
  | "fldesktop"
  | "flfolder"
  | "fltag"
  | "fltrash"
  | "flwindows"
  | "flwindow"
  | "flfav";

export function isContentProfile(p: string): p is ContentProfile {
  return p === "fc" || p === "fct" || p === "fcl" || p === "fclt";
}
