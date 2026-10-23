import { Action, ActionPanel, Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { parse } from "../core/parse";
import { hintInfo } from "../core/hint";
import { copyPath, openPath, revealInFileManager } from "../actions/fileActions";
import { runNameSearch } from "../search/runNameSearch";
import { runContentSearch } from "../search/runContentSearch";
import type { SearchItem } from "../search/types";

type Profile = "ff" | "ffw" | "fd" | "fc" | "flrecent";

type Prefs = {
  engineRoot?: string;
  openWithEditor?: string;
  fileManagerPrefer?: "qspace" | "finder";
};

function iconFor(it: SearchItem) {
  if (it.kind === "hint") return { source: Icon.Info, tintColor: Color.SecondaryText };
  if (it.kind === "folder") return Icon.Folder;
  if (it.kind === "group") return Icon.Document;
  return Icon.Document;
}

export function SearchList(props: { profile: Profile; initialQuery?: string }) {
  const prefs = getPreferenceValues<Prefs>();
  const [query, setQuery] = useState(props.initialQuery || "");

  const parsed = useMemo(() => parse(query || ""), [query]);

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (q: string, profile: Profile) => {
      if (profile === "fc") {
        return runContentSearch({ query: q, engineDir: prefs.engineRoot });
      }
      if (profile === "flrecent") {
        return runNameSearch({ query: q, profile: "ff", engineDir: prefs.engineRoot });
      }
      return runNameSearch({
        query: q,
        profile: profile as "ff" | "ffw" | "fd",
        engineDir: prefs.engineRoot,
      });
    },
    [query, props.profile],
    { keepPreviousData: true },
  );

  const hint = useMemo(() => {
    if (!data?.items?.length) return null;
    const paths = data.items.filter((x) => x.valid && x.path).map((x) => x.path);
    if (!paths.length) return null;
    try {
      return hintInfo(paths, parsed, props.profile === "fd" ? "dir" : "file");
    } catch {
      return null;
    }
  }, [parsed, data, props.profile]);

  const items = data?.items || [];

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchBarPlaceholder={`${props.profile} · 同 Alfred 语法`}
      onSearchTextChange={setQuery}
      searchText={query}
      throttle
    >
      {error ? (
        <List.EmptyView
          title="搜索失败"
          description={String(error)}
          actions={
            <ActionPanel>
              <Action title="重试" onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : null}
      {!error && hint ? (
        <List.Item
          id="refine-hint"
          title={hint.title}
          subtitle={hint.subtitle}
          icon={{ source: Icon.LightBulb, tintColor: Color.Yellow }}
        />
      ) : null}
      {!error &&
        items.map((it) => (
          <List.Item
            key={it.id}
            id={it.id}
            title={it.title}
            subtitle={it.subtitle}
            icon={iconFor(it)}
            actions={
              it.valid ? (
                <ActionPanel>
                  <Action title="打开" icon={Icon.ArrowNe} onAction={() => openPath(it.path, prefs.openWithEditor)} />
                  <Action
                    title="在文件管理器中显示"
                    icon={Icon.Finder}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    onAction={() => revealInFileManager(it.path, prefs.fileManagerPrefer || "qspace")}
                  />
                  <Action
                    title="复制路径"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["opt"], key: "return" }}
                    onAction={() => copyPath(it.path)}
                  />
                </ActionPanel>
              ) : undefined
            }
          />
        ))}
      {!error && !isLoading && items.length === 0 ? (
        <List.EmptyView title="无结果" description="↩ 无操作 · 可改关键词或加 in / e / t" />
      ) : null}
    </List>
  );
}
