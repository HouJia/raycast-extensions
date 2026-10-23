import { Action, ActionPanel, Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { parse } from "../core/parse";
import { hintInfo } from "../core/hint";
import { copyPath, openPath, revealInFileManager } from "../actions/fileActions";
import { buildExpandQuery } from "../search/alfredJson";
import { runNameSearch } from "../search/runNameSearch";
import { runContentSearch } from "../search/runContentSearch";
import { runListSearch, type FlProfile } from "../search/runListSearch";
import type { ListProfile, SearchItem } from "../search/types";
import { FcExpandList } from "./FcExpandList";

type Prefs = {
  engineRoot?: string;
  qfaRoot?: string;
  openWithEditor?: string;
  fileManagerPrefer?: "qspace" | "finder";
};

const FL_PROFILES = new Set<string>([
  "flrecent",
  "flnewest",
  "fldownload",
  "fldesktop",
  "flfolder",
  "fltag",
  "fltrash",
  "flwindows",
  "flwindow",
  "flfav",
]);

function iconFor(it: SearchItem) {
  if (it.kind === "hint") return { source: Icon.Info, tintColor: Color.SecondaryText };
  if (it.kind === "folder") return Icon.Folder;
  if (it.kind === "group") return Icon.List;
  if (it.kind === "back") return Icon.ArrowLeft;
  return Icon.Document;
}

function isNameProfile(p: ListProfile): p is "ff" | "ffw" | "fd" {
  return p === "ff" || p === "ffw" || p === "fd";
}

export function SearchList(props: { profile: ListProfile; initialQuery?: string }) {
  const prefs = getPreferenceValues<Prefs>();
  const [query, setQuery] = useState(props.initialQuery || "");

  const parsed = useMemo(() => parse(query || ""), [query]);

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (q: string, profile: ListProfile) => {
      if (profile === "fc") {
        return runContentSearch({ query: q, engineDir: prefs.engineRoot });
      }
      if (FL_PROFILES.has(profile)) {
        return runListSearch({ profile: profile as FlProfile, query: q, qfaDir: prefs.qfaRoot });
      }
      if (isNameProfile(profile)) {
        return runNameSearch({ query: q, profile, engineDir: prefs.engineRoot });
      }
      return { items: [], query: q, profile };
    },
    [query, props.profile],
    { keepPreviousData: true },
  );

  const hint = useMemo(() => {
    if (props.profile === "fc" || FL_PROFILES.has(props.profile)) return null;
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
              it.valid || it.kind === "group" ? (
                <ActionPanel>
                  {it.kind === "group" ? (
                    <>
                      <Action
                        title="打开最佳行"
                        icon={Icon.ArrowNe}
                        onAction={() =>
                          openPath(it.path, prefs.openWithEditor, { line: it.line, col: it.col })
                        }
                      />
                      <Action.Push
                        title="展开这个文件的命中"
                        icon={Icon.List}
                        shortcut={{ modifiers: ["ctrl"], key: "return" }}
                        target={
                          <FcExpandList
                            expandQuery={
                              it.variables?.expand_query || buildExpandQuery(query, it.path)
                            }
                            groupTitle={it.title}
                          />
                        }
                      />
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
                        onAction={() => copyPath(it.path, { hud: "已复制文件路径" })}
                      />
                    </>
                  ) : (
                    <>
                      <Action
                        title="打开"
                        icon={Icon.ArrowNe}
                        onAction={() =>
                          openPath(it.path, prefs.openWithEditor, { line: it.line, col: it.col })
                        }
                      />
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
                    </>
                  )}
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
