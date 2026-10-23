import { Action, ActionPanel, Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { parse } from "../core/parse";
import { hintInfo } from "../core/hint";
import { copyPath, copyPathLine, openPath, revealInFileManager } from "../actions/fileActions";
import { buildExpandQuery } from "../search/alfredJson";
import { formatGroupDetailMarkdown, formatPathDetailMarkdown } from "../search/contentDetail";
import { runNameSearch } from "../search/runNameSearch";
import { runContentSearch } from "../search/runContentSearch";
import { runListSearch, type FlProfile } from "../search/runListSearch";
import { isContentProfile, type ContentProfile, type ListProfile, type SearchItem } from "../search/types";
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
  const [selectedId, setSelectedId] = useState<string | undefined>();

  const parsed = useMemo(() => parse(query || ""), [query]);
  const content = isContentProfile(props.profile);

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (q: string, profile: ListProfile) => {
      if (isContentProfile(profile)) {
        return runContentSearch({ query: q, profile, engineDir: prefs.engineRoot });
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
    if (content || FL_PROFILES.has(props.profile)) return null;
    if (!data?.items?.length) return null;
    const paths = data.items.filter((x) => x.valid && x.path).map((x) => x.path);
    if (!paths.length) return null;
    try {
      return hintInfo(paths, parsed, props.profile === "fd" ? "dir" : "file");
    } catch {
      return null;
    }
  }, [parsed, data, props.profile, content]);

  const items = data?.items || [];
  const selected = items.find((i) => i.id === selectedId) || items[0];
  const selectedIsGroup = selected?.kind === "group";
  const expandQuery =
    selectedIsGroup && selected
      ? selected.variables?.expand_query || buildExpandQuery(query, selected.path)
      : "";

  // 方案 A：选中 group 时拉逐行命中填 Detail（keyed by path+expandQuery，避免错文件）
  const {
    data: detailLines,
    isLoading: detailLoading,
    error: detailError,
  } = useCachedPromise(
    async (eq: string, pathKey: string, profile: ContentProfile) => {
      if (!eq || !pathKey) return [] as SearchItem[];
      const res = runContentSearch({
        query: eq,
        profile,
        engineDir: prefs.engineRoot,
      });
      return res.items.filter((i) => i.kind === "file" && i.valid && i.line && i.path === pathKey);
    },
    [
      selectedIsGroup ? expandQuery : "",
      selectedIsGroup && selected ? selected.path : "",
      content ? (props.profile as ContentProfile) : "fc",
    ],
    { keepPreviousData: false },
  );

  const showDetail = content && Boolean(selected) && selected.kind !== "hint" && selected.kind !== "back";

  const detailMarkdown = useMemo(() => {
    if (!selected || !content) return undefined;
    if (selected.kind === "group") {
      return formatGroupDetailMarkdown(selected, detailLines || [], {
        loading: detailLoading,
        error: detailError ? String(detailError) : undefined,
      });
    }
    return formatPathDetailMarkdown(selected);
  }, [selected, content, detailLines, detailLoading, detailError]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      isShowingDetail={showDetail}
      searchBarPlaceholder={`${props.profile} · 同 Alfred 语法`}
      onSearchTextChange={setQuery}
      searchText={query}
      onSelectionChange={(id) => setSelectedId(id || undefined)}
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
        items.map((it) => {
          const isSelGroup = it.kind === "group";
          const eq = isSelGroup
            ? it.variables?.expand_query || buildExpandQuery(query, it.path)
            : "";
          const hitsForActions =
            selected?.id === it.id && isSelGroup ? (detailLines || []).slice(0, 12) : [];

          return (
            <List.Item
              key={it.id}
              id={it.id}
              title={it.title}
              subtitle={showDetail ? undefined : it.subtitle}
              icon={iconFor(it)}
              detail={
                showDetail && selected?.id === it.id && detailMarkdown ? (
                  <List.Item.Detail isLoading={isSelGroup && detailLoading} markdown={detailMarkdown} />
                ) : showDetail ? (
                  <List.Item.Detail markdown={formatPathDetailMarkdown(it)} />
                ) : undefined
              }
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
                        {hitsForActions.map((h) => (
                          <Action
                            key={`open-${h.line}-${h.id}`}
                            title={`打开第 ${h.line} 行`}
                            icon={Icon.Hashtag}
                            onAction={() =>
                              openPath(h.path || it.path, prefs.openWithEditor, {
                                line: h.line,
                                col: h.col,
                              })
                            }
                          />
                        ))}
                        {hitsForActions[0] ? (
                          <Action
                            title={`复制 ${it.path.split("/").pop()}:${hitsForActions[0].line}`}
                            icon={Icon.Clipboard}
                            shortcut={{ modifiers: ["opt"], key: "return" }}
                            onAction={() => copyPathLine(it.path, hitsForActions[0].line)}
                          />
                        ) : (
                          <Action
                            title="复制路径"
                            icon={Icon.Clipboard}
                            shortcut={{ modifiers: ["opt"], key: "return" }}
                            onAction={() => copyPath(it.path, { hud: "已复制文件路径" })}
                          />
                        )}
                        <Action
                          title="在文件管理器中显示"
                          icon={Icon.Finder}
                          shortcut={{ modifiers: ["cmd"], key: "return" }}
                          onAction={() =>
                            revealInFileManager(it.path, prefs.fileManagerPrefer || "qspace")
                          }
                        />
                        <Action.Push
                          title="在独立列表展开（次要）"
                          icon={Icon.List}
                          shortcut={{ modifiers: ["ctrl"], key: "return" }}
                          target={
                            <FcExpandList
                              expandQuery={eq}
                              groupTitle={it.title}
                              profile={content ? (props.profile as ContentProfile) : "fc"}
                            />
                          }
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
                          onAction={() =>
                            revealInFileManager(it.path, prefs.fileManagerPrefer || "qspace")
                          }
                        />
                        <Action
                          title="复制路径"
                          icon={Icon.Clipboard}
                          shortcut={{ modifiers: ["opt"], key: "return" }}
                          onAction={() =>
                            it.line ? copyPathLine(it.path, it.line) : copyPath(it.path)
                          }
                        />
                      </>
                    )}
                  </ActionPanel>
                ) : undefined
              }
            />
          );
        })}
      {!error && !isLoading && items.length === 0 ? (
        <List.EmptyView title="无结果" description="↩ 无操作 · 可改关键词或加 in / e / t" />
      ) : null}
    </List>
  );
}
