export type SearchItem = {
  id: string;
  title: string;
  subtitle: string;
  path: string;
  kind: "file" | "folder" | "hint" | "group";
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
