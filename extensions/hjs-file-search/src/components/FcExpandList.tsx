import { Action, ActionPanel, Color, getPreferenceValues, Icon, List, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { copyPathLine, openPath, revealInFileManager } from "../actions/fileActions";
import { runContentSearch } from "../search/runContentSearch";
import type { SearchItem } from "../search/types";

type Prefs = {
  engineRoot?: string;
  openWithEditor?: string;
  fileManagerPrefer?: "qspace" | "finder";
};

function iconFor(it: SearchItem) {
  if (it.kind === "back") return Icon.ArrowLeft;
  if (it.kind === "hint") return { source: Icon.Info, tintColor: Color.SecondaryText };
  return Icon.Document;
}

/**
 * fc 展开视图：逐行命中 + 「← 返回分组列表」。
 * 查询走 Alfred 同合同「原查询 ++ f "文件名"」。
 */
export function FcExpandList(props: { expandQuery: string; groupTitle?: string }) {
  const prefs = getPreferenceValues<Prefs>();
  const { pop } = useNavigation();

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (eq: string) => runContentSearch({ query: eq, engineDir: prefs.engineRoot }),
    [props.expandQuery],
    { keepPreviousData: true },
  );

  const items = data?.items || [];

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      navigationTitle={props.groupTitle ? `展开 · ${props.groupTitle}` : "展开命中"}
      searchBarPlaceholder="展开视图（改查询请返回分组）"
    >
      {error ? (
        <List.EmptyView
          title="展开失败"
          description={String(error)}
          actions={
            <ActionPanel>
              <Action title="重试" onAction={() => revalidate()} />
              <Action title="← 返回分组列表" onAction={pop} />
            </ActionPanel>
          }
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
              <ActionPanel>
                {it.kind === "back" ? (
                  <Action title="← 返回分组列表" icon={Icon.ArrowLeft} onAction={pop} />
                ) : it.valid ? (
                  <>
                    <Action
                      title="打开此行"
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
                      title="复制 路径:行号"
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["opt"], key: "return" }}
                      onAction={() => copyPathLine(it.path, it.line)}
                    />
                    <Action
                      title="← 返回分组列表"
                      icon={Icon.ArrowLeft}
                      shortcut={{ modifiers: ["ctrl"], key: "return" }}
                      onAction={pop}
                    />
                  </>
                ) : (
                  <Action title="← 返回分组列表" icon={Icon.ArrowLeft} onAction={pop} />
                )}
              </ActionPanel>
            }
          />
        ))}
      {!error && !isLoading && items.length === 0 ? (
        <List.EmptyView
          title="无逐行命中"
          description="返回分组列表重试"
          actions={
            <ActionPanel>
              <Action title="← 返回分组列表" onAction={pop} />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
