---
title: hjs-file-search (Raycast)
description: R2 独立文件检索扩展；复用 hjs-launcher-core TS 核心，桥接 Alfred 引擎与 QFA/Favorites 脚本。
created: 2026-10-23 13:46:23 CST (UTC+8)
updated: 2026-10-23 16:01:15 CST (UTC+8)
---

# hjs-file-search

| 项目 | 内容 |
|---|---|
| **状态** | R2：ff/ffw/fd/fc/fct/fcl/fclt + fl*；fc 展开＝侧栏 Detail（方案 A）；未上架；未开 Tinycast |
| **语法** | `src/core/*` ← `hjs-launcher-core`（`npm run sync-core`） |
| **按名** | spawn Wiki `tools/hjs-file-search/engine/search.py`（ff/ffw/fd） |
| **内容** | `src/ffg-entry.sh`：fc 默认递归；**fct** `hjs_scope=window`；**fcl** `search_mode=shallow` + 默认白名单 `action_input`；**fclt** window+shallow |
| **列表** | flrecent/newest/download/desktop/folder/tag/trash/window(s)/fav → QFA/Favorites 脚本 |
| **动作** | ↩ 打开（组=最佳行）· ⌘↩ reveal · ⌥↩ 复制 · 组行侧栏 Detail 看逐行；⌃↩ 次要＝独立列表展开 |
| **List** | `filtering={false}`；内容档 `isShowingDetail`（方案 A） |

## 内容档环境变量（与 Alfred 合同）

| 命令 | env | 范围 |
|---|---|---|
| fc | （默认 deep） | ffg_include，空则 ffw 白名单 |
| fct | `hjs_scope=window` | 前台 Finder/QSpace 窗口，递归 |
| fcl | `search_mode=shallow` + `action_input`＝默认白名单 | 只搜这一层 |
| fclt | `hjs_scope=window` + `search_mode=shallow` | 当前窗口这一层 |

## fc 展开（方案 A：侧栏 Detail）

选中 **group** 行时右侧 `List.Item.Detail` 展示该文件逐行命中（行号 + 片段）。主列表 ↩ 仍开最佳行；ActionPanel 提供「打开第 N 行」与复制 path:line。不再把 Alfred「← 返回分组」假行当主路径；⌃↩ 仍可 Push 到独立展开列表（次要）。

## 开发

```bash
cd extensions/hjs-file-search
npm install
npm test
```

自验收以 vitest 合同 + 引擎集成测为准；**未做真实 Raycast 窗口点击**（无头环境无法驱动 Raycast UI）。


## 本地开发挂载

```bash
cd extensions/hjs-file-search && npm install && npm test && npm run dev   # 即 npx ray develop；登记到 ~/.config/raycast/extensions/hjs-file-search
```

Raycast 搜 `ff` / `fc` / `hjs-File Search`。偏好可空：代码默认 wiki `tools/hjs-file-search/engine` 与已装 QFA（`user.workflow.54763281-43B8-4F45-B7F4-367F4C930CBF`）；`openWithEditor=Zed`、`fileManagerPrefer=qspace`。不上架（不 `ray publish`）。

## 已知缺口

- 未 `ray publish`；未开 Tinycast
