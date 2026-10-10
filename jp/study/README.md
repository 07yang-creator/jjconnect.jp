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
  data/set4-jitsumu.js  const Q4 = [...]   実務100题（口语→书面 / 邮件・通知 / 契約・公文 / 後置詞・条件 / 综合判断）
  app.js                SETS 定义 + 练习/考试两套渲染逻辑 + localStorage
  footer.html           </script></body></html>

src/benseki/  shell.html + sec.js (const SEC) + render.js + footer.html
src/fukushu/  同上
```

### 题目数据格式

```js
[level, stem, [correct, distractor, distractor, distractor], explanation]
```

- `level` 1–5，每套每级 20 题，决定题号色条与筛选分类（分类名在 `app.js` 的 `SETS[].lv`）
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
