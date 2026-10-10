#!/usr/bin/env bash
# Live status of the jp-study material, printed when the /jp skill is triggered.
# Works from any cwd: it locates itself, not $CLAUDE_PROJECT_DIR (empty in some contexts).
cd "$(dirname "$0")/.." || exit 1
echo "### 最近提交（jp/study）"
git log -3 --format='%h %ad %s' --date=short -- . 2>/dev/null || echo "(not a git checkout)"
echo
echo "### 工作区"
s=$(git status --short -- . 2>/dev/null); [ -n "$s" ] && echo "$s" || echo "clean"
echo
echo "### 校验"
if ./check.sh >/tmp/jp-study-check.log 2>&1; then tail -1 /tmp/jp-study-check.log; else echo "CHECKS FAILED:"; tail -8 /tmp/jp-study-check.log; fi
echo
echo "### 线上（jp.jjconnect.jp）"
curl -s --max-time 10 https://jp.jjconnect.jp/api/topics | python3 -c '
import sys,json
try: d=json.load(sys.stdin)
except Exception: print("(offline)"); sys.exit()
for t in d.get("topics",[]):
    if t["slug"] in ("300","t260924-h8rz"):
        print(f"- {t['"'"'slug'"'"']}: {t['"'"'title'"'"']}  (updated {t.get('"'"'updated'"'"')})")
        for i in t["items"]: print(f"    {i['"'"'type'"'"']}: {i['"'"'title'"'"']}  {i['"'"'file'"'"']}  {i.get('"'"'size'"'"')} B")
' 2>/dev/null || echo "(offline)"
echo
echo "### 待办（docs/BACKLOG.md 标题）"
grep -E '^## ' docs/BACKLOG.md
