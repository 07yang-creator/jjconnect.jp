#!/usr/bin/env bash
# Build all three pages from src/ into dist/. No dependencies.
set -e
cd "$(dirname "$0")"
mkdir -p dist

cat src/quiz/shell.html \
    src/quiz/data/set1-basic.js \
    src/quiz/data/set2-advanced.js \
    src/quiz/data/set3-bunkei-goi.js \
    src/quiz/data/set4-ichiran.js \
    src/quiz/app.js \
    src/quiz/footer.html > dist/quiz.html

cat src/benseki/shell.html src/benseki/sec.js src/benseki/render.js src/benseki/footer.html > dist/benseki.html
cat src/fukushu/shell.html src/fukushu/sec.js src/fukushu/render.js src/fukushu/footer.html > dist/fukushu.html

# 動詞 topic is a STATIC topic of the site: built straight into jp/content/doushi/ (git-tracked, deployed by push)
mkdir -p ../content/doushi
cat src/doushi/shell.html src/doushi/data.js src/doushi/render.js src/doushi/footer.html > ../content/doushi/material.html
cat src/doushi-quiz/shell.html \
    src/doushi-quiz/data/katsuyo.js \
    src/doushi-quiz/data/ukemi.js \
    src/doushi-quiz/data/jita.js \
    src/doushi-quiz/app.js \
    src/doushi-quiz/footer.html > ../content/doushi/quiz.html

# N2 語彙 / 自他動詞 / 動詞活用ドリル: shared engine (src/_engine) + per-page config + data, assembled by tools/assemble.cjs
mkdir -p ../content/goi ../content/jita ../content/doushi
GOI_DATA="src/goi-quiz/data/meishi.js src/goi-quiz/data/doushi.js src/goi-quiz/data/keiyoushi.js src/goi-quiz/data/fukushi.js"
node tools/assemble.cjs src/goi-quiz/meta.json ../content/goi/quiz.html $GOI_DATA src/goi-quiz/config.js
cat src/goi-list/shell.html $GOI_DATA src/goi-list/render.js src/goi-list/footer.html > ../content/goi/list.html
node tools/gen_jita.cjs > /dev/null
cp src/jita/map.html ../content/jita/map.html
node tools/assemble.cjs src/jita-quiz/meta.json ../content/jita/quiz.html src/jita-quiz/data/tota.js src/jita-quiz/data/toji.js src/jita-quiz/data/ukemi.js src/jita-quiz/data/shieki.js src/jita-quiz/data/teiru.js src/jita-quiz/data/hantei.js src/jita-quiz/config.js
node tools/gen_katsuyo.cjs > /dev/null
D=src/doushi-drill/data
node tools/assemble.cjs src/doushi-drill/meta1.json ../content/doushi/drill1.html $D/masu.js $D/nai.js $D/te.js $D/ta.js $D/ishi.js $D/meirei.js $D/katei.js src/doushi-drill/config1.js
node tools/assemble.cjs src/doushi-drill/meta2.json ../content/doushi/drill2.html $D/kanou.js $D/ukemi.js $D/shieki.js $D/shiekiukemi.js src/doushi-drill/config2.js

echo "built:"; ls -l dist/*.html ../content/doushi/*.html ../content/goi/*.html ../content/jita/*.html | awk '{print "  "$9" "$5" bytes"}'
