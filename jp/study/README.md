# 日语学习材料 / jp-study

三个单文件 HTML 页面（讲义两份、测验一份），无框架、无构建依赖、无后端。
原本在 claude.ai 的聊天会话里逐步做出来，2026-10-10 并入 `jjconnect.jp` 仓库的 `jp/study/`，
由 code session 维护（咒语 `/jp`，见仓库根目录 `.claude/skills/jp-study-handoff/`）。
`jp/.vercelignore` 排除了 `study/`，所以这里的源码不会被 jp-learn 项目当作静态文件部署。

| 产物 | 内容 | 线上（jp.jjconnect.jp） |
|---|---|---|
| `dist/quiz.html` | 400 题交互测验（4 套 × 100 题），练习模式 + 考试模式 + 自动评分 | `/v/300/jp-setsuzoku-quiz2.html` |
| `dist/benseki.html` | 接续表达 易混辨析（16 组） | `/v/t260924-h8rz/benseki.html` |
| `dist/fukushu.html` | 文型・語彙 復習ノート（文型 23 组 + 語彙 18 组） | `/v/300/fukushu.html` |
| `../content/doushi/material.html` | 日语动词 讲义：活用表 93 词（表里 50＋常用 43，按意思分 7 组，可检索）・受身形 8 组・自他 46 组＋5 组 | `/v/doushi/material.html`（**静态专题**） |
| `../content/doushi/drill1.html` | 動詞活用ドリル① 基本活用：ます・ない・て・た・意志・命令・仮定，305 词（活用表 93＋自他 124 对），tools/gen_katsuyo.cjs 生成 | `/v/doushi/drill1.html`（**静态专题**） |
| `../content/doushi/drill2.html` | 動詞活用ドリル② 派生形：可能・受身・使役・使役受身，同上 | `/v/doushi/drill2.html`（**静态专题**） |
| `../content/jita/map.html` | 自他動詞マップ：用户在 claude.ai 会话「Japanese verb stem changes」做的交互页（原理・词根一览・例外・图谱・练习），原样复制 | `/v/jita/map.html`（**静态专题**） |
| `../content/jita/quiz.html` | 自他動詞 744 题：从 map 的 124 对词自动生成（自→他／他→自／受身／使役／ている・てある／自他判定），按 7 组；错题本 | `/v/jita/quiz.html`（**静态专题**） |
| `../content/goi/list.html` | N2 語彙 单词表：320 词按 4 题库・16 组，单词／读音／意思／例句，可检索 | `/v/goi/list.html`（**静态专题**） |
| `../content/goi/quiz.html` | N2 語彙 320 题：名詞・動詞・形容詞・副詞／接続詞／その他 各 80，四选一；错题本（复习・导出 .md・复制）| `/v/goi/quiz.html`（**静态专题**） |
| `../content/doushi/quiz.html` | 日语动词 280 题：活用 80・受身形 120・自他 80，14 个分组各 20 题；活用表 93 词＋自他 46 组的每个动词至少考一次（check_doushi.cjs 审计） | `/v/doushi/quiz.html`（**静态专题**） |

另有 `/mnt/user-data/outputs/日语接续表达一览.pdf`（7 页 A4，接续表达分类表，WeasyPrint 生成，源码未保留，见 BACKLOG 第 6 项）。

## 构建

```bash
./build.sh          # src/ → dist/，就是 cat 拼接，无依赖
./check.sh          # JS 语法检查 + 题目数量/结构校验
```

构建等价于按顺序拼接文件；当前 `dist/` 与聊天会话里发布的版本 **byte-identical**。

## 源码结构

```
src/quiz/
  shell.html            <head> + CSS + DOM 骨架，结尾是 <script>
  data/set1-basic.js    const Q  = [...]   基础100题（按难度递进）
  data/set2-advanced.js const Q2 = [...]   进阶100题（按接续关系分类）
  data/set3-bunkei-goi.js const Q3 = [...] 文型・語彙100题
  data/set4-ichiran.js  const Q4 = [...]   一览实战100题：正确答案与干扰项都取自站点的《接续表达一览》121 条，按其十类分五级
  app.js                SETS 定义 + 练习/考试两套渲染逻辑 + localStorage
  footer.html           </script></body></html>

src/benseki/  shell.html + sec.js (const SEC) + render.js + footer.html
src/fukushu/  同上

src/doushi/        shell.html + data.js (VERBS 活用表 93 行・末两列是 グループ／出典 / PAIRS 自他 46 行 / SEC 讲解 15 组) + render.js + footer.html
src/_engine/       **共用测验引擎**：quiz.js（练习／错题循环／考试／错题复习＋错题本导出）＋ shell.html（模板，{{TITLE}}／{{H1}}）。
                   每页只有 config.js（CFG={key,title,wordInfo,sets}）＋ meta.json（标题）＋ data；tools/assemble.cjs 拼装。goi／jita／doushi-drill 都用它。
src/doushi-drill/  config1.js／meta1.json（基本活用 7 形）、config2.js／meta2.json（派生形 4 形）；data/*.js 由 tools/gen_katsuyo.cjs 生成（勿手改）：
                   从 doushi/data.js 的 VERBS＋jita map 的 124 对取 305 个动词，按类（五段／一段／五段例外／特殊）造每种形，干扰项＝真实的错误变形
src/jita/map.html  用户的交互图原文件（勿改；要改先在 claude.ai 那边改再替换）
src/jita-quiz/     shell.html + app.js（goi 引擎的泛化版：每组题数不固定，7 组色带）+ data/*.js（**生成物**：build.sh 先跑 tools/gen_jita.cjs，
                   从 map.html 的 const RAW 解析 124 对词，用 map 自己的活用规则造 6 套题）+ footer.html；key `jp-jita-v1`
src/goi-quiz/      shell.html + data/{meishi,doushi,keiyoushi,fukushi}.js (QA–QD 各 80，行＝[组, 题干, 选项, 解析, 語, 読み, 意味]) + app.js + footer.html
                   app.js 在 doushi-quiz 引擎上加了错题本：st.mist[set][题号]={n,a,t}，错题复习模式（答对即移除），导出 Markdown／复制；key `jp-goi-n2-v1`
src/goi-list/      单词表页：同一份数据 + render.js（按题库・组列表，可检索，?q= 深链接）
src/doushi-quiz/   shell.html + data/katsuyo.js (Q1 80) + data/ukemi.js (Q2 120) + data/jita.js (Q3 80) + app.js + footer.html
                   app.js 是 quiz/app.js 的泛化版：每套题数不固定（N），每级固定 20 题；localStorage key `jp-doushi-v1`
```

動詞 topic 的两页**不走 Blob**：`build.sh` 直接产出到 `jp/content/doushi/`，并在 `jp/content/index.json` 登记为静态专题，
push 到 main 即上线（Vercel）。题目里的动词只能来自 `data.js` 的两张表，`tools/check_doushi.cjs` 会审计。

### 题目数据格式

```js
[level, stem, [correct, distractor, distractor, distractor], explanation]
```

- `level` 1–5，每套每级 20 题，决定题号色条与筛选分类（分类名在 `app.js` 的 `SETS[].lv`）
- **出题范围只能是学习材料里已有的词**：《接续表达一览》（`jp/content/setsuzoku/material.html` 的 121 条）、
  易混辨析 16 组、復習ノート 41 组。不要引入材料之外的新词当考点（2026-10-11 用户明确要求）。
- `stem` 用全角 `（　）` 标记空格，渲染时替换为答案；答对后 blank 填入正确答案
- **选项数组第一个永远是正确答案**，运行时按 `rng(index*7919+17+set*131)` 确定性打乱，所以每题选项顺序固定但不总在第一位
- `explanation` 中文解析，答题后显示

### 讲义数据格式

```js
{p:1|2,              // 第几部（fukushu 有两部；benseki 无此字段）
 id:"anchor-id",     // 锚点，供目录和外链使用
 cat:"条件",          // 左上角色标签 + 目录前缀
 t:"と / ば / たら / なら",
 lead:"一句话说明这组的判断要点",
 tb:[["表头","表头"],["行","行"]],   // 第一行是表头
 ex:[[1,"日文例句","中文说明"],[0,"✕例句","为什么不对"]],
 tip:"一句话记法"}
```

## 部署到 jp.jjconnect.jp

三个页面住在站点的 **Blob 专题**里（不是 `content/` 的静态专题）：专题 `300` 放测验 + 復習ノート，
专题 `t260924-h8rz` 放易混辨析。上线 = 用站点的发布 API 原地替换文件：同一请求里 `remove` 旧 item、
`add` 同名新文件，文件名不变所以 `/v/...` 链接不变，访问者的 localStorage 作答记录也不受影响。

```bash
./check.sh && ./build.sh
# 替换测验（先从 /api/topics 取 slug 300 里 jp-setsuzoku-quiz2.html 的 item id）
python3 - <<'PY'
import json,base64,urllib.request
quiz=base64.b64encode(open("dist/quiz.html","rb").read()).decode()
body={"slug":"300","topic":{"title":"日语接续表达 400题","category":"语法","tags":["接続詞","文型","語彙","測験"],
      "summary":"……"},
      "remove":["<旧 item id>"],
      "add":[{"name":"jp-setsuzoku-quiz2.html","title":"日语接续表达 400题","type":"test","note":"400 题 · 四套 · 练习／考试模式","data":quiz}]}
req=urllib.request.Request("https://jp.jjconnect.jp/api/publish",data=json.dumps(body).encode(),headers={"content-type":"application/json"})
print(urllib.request.urlopen(req).read().decode())
PY
```

若站点设置了 `PUBLISH_KEY`，再加请求头 `x-publish-key`。讲义两页的 hero 互链已改为站内路径
（带 `target="_top"`，因为页面是在 `/v/` 的 iframe 里显示的）。

字体从 Google Fonts 加载（Zen Kaku Gothic New / Noto Sans SC），离线时退回系统字体，
不影响功能。页面不回传任何数据，作答记录只存在访问者浏览器的 localStorage
（key `jp-setsuzoku-200-v2`，含旧版 `jp-setsuzoku-100-v1` 的迁移逻辑）。

## 待办

见 `docs/BACKLOG.md`。主要是讲义的两个新部分（待遇表現編 / 発音・表記編）和据此出的
第 5 套题，素材已在会话中讲解完毕并整理成清单。

会话经过与设计决策见 `docs/SESSION-LOG.md`，内容编写规范见 `CLAUDE.md`。
