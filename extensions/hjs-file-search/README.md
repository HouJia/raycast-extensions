---
title: hjs-file-search (Raycast)
description: R2 独立文件检索扩展；复用 hjs-launcher-core TS 核心，按名搜索桥接 Alfred search.py。
created: 2026-10-23 13:46:23 CST (UTC+8)
updated: 2026-10-23 13:46:23 CST (UTC+8)
---

# hjs-file-search

| 项目 | 内容 |
|---|---|
| **状态** | R2 脚手架可本地开发；未上架；未开 Tinycast |
| **语法** | `src/core/*` ← `hjs-launcher-core`（`npm run sync-core`） |
| **按名** | spawn Wiki `tools/hjs-file-search/engine/search.py`（ff/ffw/fd） |
| **内容** | 桥接 `search_content.py`（缺脚本时 UI hint） |
| **动作** | ↩ 打开 · ⌘↩ `hjs-filemanager.sh reveal` · ⌥↩ 复制 |
| **List** | `filtering={false}` |

## 开发

```bash
cd extensions/hjs-file-search
npm install
npm test
npm run dev
```

## 已知缺口

- fl* 全系列未逐命令化（flrecent 暂借 ff）
- fc 分组/展开、browse 栈、端到端 UI 测试待补
- 不依赖 Raycast 账号；未 `ray publish`
