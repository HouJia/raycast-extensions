import { Clipboard, closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { spawnSync } from "node:child_process";
import { resolveFileManager } from "../search/paths";

export async function copyPath(path: string, opts?: { hud?: string }): Promise<void> {
  if (!path) {
    await showToast({ style: Toast.Style.Failure, title: "无路径可复制" });
    return;
  }
  await Clipboard.copy(path);
  await showHUD(opts?.hud || "已复制路径");
}

export async function revealInFileManager(path: string, prefer: "qspace" | "finder" = "qspace"): Promise<void> {
  if (!path) {
    await showToast({ style: Toast.Style.Failure, title: "无路径可显示" });
    return;
  }
  const fm = resolveFileManager();
  const proc = spawnSync("/bin/zsh", [fm, "reveal", path], {
    env: { ...process.env, HJS_FM_PREFER: prefer },
    encoding: "utf8",
  });
  if (proc.status !== 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "显示失败",
      message: (proc.stderr || proc.stdout || "").slice(0, 200),
    });
    return;
  }
  await closeMainWindow({ clearRootSearch: false });
}

export async function openPath(path: string, editor?: string): Promise<void> {
  if (!path) {
    await showToast({ style: Toast.Style.Failure, title: "无路径可打开" });
    return;
  }
  const args = editor && editor.trim() ? ["-a", editor.trim(), path] : [path];
  const proc = spawnSync("/usr/bin/open", args, { encoding: "utf8" });
  if (proc.status !== 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "打开失败",
      message: (proc.stderr || "").slice(0, 200),
    });
    return;
  }
  await closeMainWindow({ clearRootSearch: false });
}
