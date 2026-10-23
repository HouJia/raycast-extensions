---
title: hjs-file-search (Raycast)
description: R2 独立文件检索扩展；复用 hjs-launcher-core TS 核心，桥接 Alfred 引擎与 QFA/Favorites 脚本。
created: 2026-10-23 13:46:23 CST (UTC+8)
updated: 2026-10-23 15:00:00 CST (UTC+8)
---

# hjs-file-search

| 项目 | 内容 |
|---|---|
| **状态** | R2：ff/ffw/fd/fc（含展开）+ fl* 已桥接；未上架；未开 Tinycast |
| **语法** | `src/core/*` ← `hjs-launcher-core`（`npm run sync-core`） |
| **按名** | spawn Wiki `tools/hjs-file-search/engine/search.py`（ff/ffw/fd） |
| **内容** | `src/ffg-entry.sh`（分组 / `++` 展开 / 展开缓存） |
| **列表** | flrecent/newest/download/desktop/folder/tag/trash/window(s)/fav → QFA/Favorites 脚本 |
| **动作** | ↩ 打开（组=最佳行，明细=该行）· ⌘↩ reveal · ⌥↩ 复制（组=路径，明细=path:line）· ⌃↩ 展开 |
| **List** | `filtering={false}` |

## 开发

```bash
cd extensions/hjs-file-search
npm install
npm test
```

自验收以 vitest 合同 + 引擎集成测为准；**未做真实 Raycast 窗口点击**（无头环境无法驱动 Raycast UI）。

## 已知缺口

- fct / fcl / fclt 窗口档未单独命令化（可用 fc + `i .`）
- 未 `ray publish`；未开 Tinycast
