---
name: jp
description: 日语学习材料（jp/study：接续表达 400 题测验、易混辨析、文型・語彙 復習ノート）的交接入口。用户打 /jp、说「继续做日语那套材料」「再出 100 题」「把待遇表現編写了」等时使用：先汇报现状，再按 BACKLOG 或用户指定的项目动手。
argument-hint: "[要做的项目，如 待遇表現編 / 第五套 / 导航条]"
---

# /jp — 日语学习材料 交接入口

材料源码在 `jp/study/`（本仓库），线上是 jp.jjconnect.jp 的 Blob 专题 `300`（测验 + 復習ノート）和
`t260924-h8rz`（易混辨析）。先读 `jp/study/CLAUDE.md`（内容编写规范：四条轴、出题规则、渲染坑），
再看下面的实时状态。

## 实时状态

!`bash "$(git rev-parse --show-toplevel)/jp/study/tools/status.sh"`

## 怎么做

- **没有参数**：用一段话汇报上面的状态，列出 BACKLOG 的待办项并给出按价值排序的建议，问用户做哪一项。
- **有参数**（例如 `/jp 待遇表現編`）：直接开工做那一项，不用再问。
- 用户若说「直接上线」「无需再要我同意」：做完 → `./check.sh` 全绿 → 用 README「部署」一节的发布 API
  原地替换线上文件 → 在线上页面确认 → commit `jp/study/` 的源码并 push。不要等确认。

## 改动规则

0. **考点只能来自学习材料**：《接续表达一览》121 条（`jp/content/setsuzoku/material.html`）、易混辨析 16 组、
   復習ノート 41 组。不要拿材料之外的新词当正确答案（2026-10-11 用户退回过一整套）。要考新词，先写进讲义。
1. 题目：`[level, stem, [正确, 干扰, 干扰, 干扰], 解析]`，每套 100 题、五级各 20，正确答案放第一位。
   加一套 = 新 `src/quiz/data/setN-*.js` + `app.js` 的 `SETS` 追加一项 + `build.sh` / `check.sh` /
   `tools/check_mixed_script.cjs` 的文件表 + `shell.html` 的 `<title>`／`<h1>` 题数。
2. 改完必跑 `jp/study/check.sh`（题数・结构・简繁混用）；本地看渲染用 launch.json 的 `jp-study-dist`。
3. **不要改** localStorage 的 key `jp-setsuzoku-200-v2`，改了用户的作答记录全丢。
4. 上线用 `/api/publish` 的 `remove` + `add` 同名文件（README 有脚本），文件名不变所以 `/v/...` 链接不变。
   `jp/.vercelignore` 已排除 `study/`，源码本身不会被部署。
5. 页面在 `/v/` 的 iframe 里显示，页面内的站内链接要带 `target="_top"`。
