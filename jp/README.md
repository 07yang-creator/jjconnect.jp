# jp.jjconnect.jp — 日语学习

Static site + a few tiny Vercel Node functions. No auth (by design).

Lives in the `jp/` folder of the `07yang-creator/jjconnect.jp` repo. Vercel project **`jp-learn`** (team `yanogins`) is git-connected to that repo with **Root Directory = `jp`**, so a push to `main` that touches `jp/` deploys production. Two ignore-build steps keep the projects apart: this folder's `vercel.json` `ignoreCommand` skips a jp-learn build when nothing under `jp/` changed, and the `jjconnect.jp` project's ignore step skips the company-site build when *only* `jp/` changed.

## What's where

| Path | Purpose |
|---|---|
| `index.html` | Home: 专题 (最新 / 按分类 / 全部) · 在线测试 · 学习资料 + drop-zone |
| `t/index.html` | Topic page `/t/<slug>` |
| `v/index.html` | Viewer `/v/<slug>/<file>` (iframe for HTML/PDF, rendered Markdown) |
| `s/index.html` | Search results `/s?q=…[&type=material\|test]` |
| `new/index.html` | Standalone wizard entry `/new/` (`?s=<slug>` opens in edit mode) |
| `assets/nav.js` | Navbar + search box with instant results + footer (site name lives here) |
| `assets/app.js` | Data layer: `/api/topics` with static fallback; card/row/highlight helpers |
| `assets/wizard.js` | 3-step wizard modal (create / append / edit / delete) |
| `content/index.json` | **Static topics** (git-tracked, curated) |
| `content/setsuzoku/material.html` | 121 connectives: Japanese · type · English + POS · Chinese usage · example. Row shape `[expr, type, register[], usage_zh, example_ja, example_zh, english]` |
| `content/<slug>/…` | Static files for those topics |
| `api/topics.js` | GET merged index (static ⊕ Blob) |
| `api/search.js` | GET `/api/search?q=` — word + full-text search over every file |
| `api/publish.js` | POST create/update topic + upload files (base64 JSON, ≤ 3.5 MB/file) |
| `api/delete.js` | POST delete the Blob part of a topic |
| `api/c.js` | GET `/c/<slug>/<file>` → serves a Blob file on our origin |
| `lib/store.js` | Blob layout + merge rules |
| `lib/extract.js` | Content file → search records |
| `lib/search.js` | Normalizing, scoring, snippets, self-healing index |

## Two content sources, one index

- **Static** — add a folder under `content/<slug>/` and a topic entry in `content/index.json`. Best for curated loads (e.g. a PDF rebuilt as a real webpage).
- **Blob (wizard)** — anything created on-page goes to Vercel Blob: `meta/<slug>/topic-<rand>.json` + `c/<slug>/<file>-<rand>`. Never overwritten in place (newest meta wins, old versions pruned) so CDN caching can't go stale.
- A wizard "append" onto a static topic creates a Blob overlay with the same slug; `/api/topics` merges them (`source: "mixed"`). Static items are locked in the wizard (🔒).

## Search

Searches words, not just titles: the index holds one record per grammar entry, per note row and per quiz question, so typing `ただし` returns its dictionary entry, then every example and test question that uses it. Clicking a result opens the viewer with `?q=`, and the content page finds it again in place.

**Normalizing.** Matching is substring on a normalized form (NFKC, lower case, decorations like `～ 「」（） ・ ……` removed), which is what Japanese and Chinese need. So `ても` finds the entry `～ても／～でも`. Whitespace becomes a boundary rather than vanishing, or `ところが ちなみに` would be a false hit for `がち`.

**Where records come from**, most precise first:

1. **The page declares its data.** Add to a content page:
   ```html
   <script type="application/json" id="jp-search">
   {"var":"SECTIONS","key":0,"en":6,"gloss":3,"ex":[4,5],"label":"{a} · {i}"}
   </script>
   ```
   `var` names a top-level `const … = [ … ]`; `key`/`en`/`gloss`/`ex` are indexes (or object keys) inside each row giving the headword, its English equivalent, its meaning and an example; `label` locates the row (`{i}` = row number, `{a}` = nearest enclosing title); optional `link` adds a jump the page understands, e.g. `"link":"n={i}"`.

   **`en` is a headword in its own right**, so the search works in both directions: `ただし` and `however` both return the ただし entry card. Equivalents are split on commas and semicolons with the part-of-speech tags stripped, so `despite` matches `despite, in spite of (prep.); although (conj.)` exactly.
2. **Auto-detected.** With no hint, every all-caps top-level array is parsed the same way and merged — which is exactly how a Claude-built single-file page stores its content (`Q`, `Q2`, `SEC`, …). Rows are located by number only.
3. **Fallback.** Visible text per block, plus CJK string literals per script line.

PDFs are indexed by title and note only. A single file contributes at most 3000 records (the largest real page so far produces 430); hitting the cap is logged, and later content in that file is not searchable.

**Deep links.** A content page opts in by reading its own query string: `?q=` (find this) and whatever it declared as `link`. `content/setsuzoku/material.html` prefills its in-page search; `quiz.html` jumps to `?n=<question>`. A page that ignores them still opens normally.

**Index storage.** Static files are read from disk and cached per instance. Uploads are indexed at publish time into `search/<slug>/index.json` in Blob, so a search never downloads content files. A file with no records (uploaded before this existed, or a failed index) is indexed by the next search and written back — bounded to 8 files / 8 MB / 9 s per request. Bump `INDEX_VERSION` in `lib/extract.js` after changing extraction and stored indexes rebuild themselves.

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
