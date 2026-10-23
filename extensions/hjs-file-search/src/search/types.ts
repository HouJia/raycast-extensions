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

/** 与 Alfred 同名的列表入口 */
export type ListProfile =
  | "ff"
  | "ffw"
  | "fd"
  | "fc"
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
