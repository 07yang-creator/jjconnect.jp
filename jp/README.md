# jp.jjconnect.jp — 日语学习

Static site + a few tiny Vercel Node functions. No auth (by design).

Lives in the `jp/` folder of the `07yang-creator/jjconnect.jp` repo. Vercel project **`jp-learn`** (team `yanogins`) is git-connected to that repo with **Root Directory = `jp`**, so a push to `main` that touches `jp/` deploys production. Two ignore-build steps keep the projects apart: this folder's `vercel.json` `ignoreCommand` skips a jp-learn build when nothing under `jp/` changed, and the `jjconnect.jp` project's ignore step skips the company-site build when *only* `jp/` changed.

## What's where

| Path | Purpose |
|---|---|
| `index.html` | Home: 专题 (最新 / 按分类 / 全部) · 在线测试 · 学习资料 + drop-zone |
| `t/index.html` | Topic page `/t/<slug>` |
| `v/index.html` | Viewer `/v/<slug>/<file>` (iframe for HTML/PDF, rendered Markdown) |
| `new/index.html` | Standalone wizard entry `/new/` (`?s=<slug>` opens in edit mode) |
| `assets/nav.js` | Navbar + footer (site name lives here) |
| `assets/app.js` | Data layer: `/api/topics` with static fallback; card/row renderers |
| `assets/wizard.js` | 3-step wizard modal (create / append / edit / delete) |
| `content/index.json` | **Static topics** (git-tracked, curated) |
| `content/<slug>/…` | Static files for those topics |
| `api/topics.js` | GET merged index (static ⊕ Blob) |
| `api/publish.js` | POST create/update topic + upload files (base64 JSON, ≤ 3.5 MB/file) |
| `api/delete.js` | POST delete the Blob part of a topic |
| `api/c.js` | GET `/c/<slug>/<file>` → serves a Blob file on our origin |
| `lib/store.js` | Blob layout + merge rules |

## Two content sources, one index

- **Static** — add a folder under `content/<slug>/` and a topic entry in `content/index.json`. Best for curated loads (e.g. a PDF rebuilt as a real webpage).
- **Blob (wizard)** — anything created on-page goes to Vercel Blob: `meta/<slug>/topic-<rand>.json` + `c/<slug>/<file>-<rand>`. Never overwritten in place (newest meta wins, old versions pruned) so CDN caching can't go stale.
- A wizard "append" onto a static topic creates a Blob overlay with the same slug; `/api/topics` merges them (`source: "mixed"`). Static items are locked in the wizard (🔒).

## Env

- `BLOB_READ_WRITE_TOKEN` — set automatically when the Blob store is connected to the project. Without it the site is read-only (static topics still work; wizard shows a banner).
- `PUBLISH_KEY` — optional. If set, `/api/publish` and `/api/delete` require header `x-publish-key`. Unset = open, as requested.

## Local

```bash
cd jp
vercel link --project jp-learn   # once; creates jp/.vercel (git-ignored)
vercel env pull .env.local       # gets BLOB_READ_WRITE_TOKEN
vercel dev --listen 3200
```

`jp/.claude/` and `jp/.vercel/` are git-ignored; the Claude desktop launch entry `jp-learn` lives in the owner's local launch.json.

## Ignore-build commands (both projects)

Both diff against `VERCEL_GIT_PREVIOUS_SHA` (the last successful deploy of the branch), falling back to `HEAD^`, and treat any git error as "build" — so multi-commit pushes are never skipped by mistake:

- jp-learn (`jp/vercel.json`): `git diff --quiet ${VERCEL_GIT_PREVIOUS_SHA:-HEAD^} HEAD -- . || exit 1`
- jjconnect.jp (project setting): `git diff --quiet ${VERCEL_GIT_PREVIOUS_SHA:-HEAD^} HEAD -- . ':(exclude)jp' || exit 1`
