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

# N2 語彙 topic: static, same pattern (quiz + word list built from the same data)
mkdir -p ../content/goi
GOI_DATA="src/goi-quiz/data/meishi.js src/goi-quiz/data/doushi.js src/goi-quiz/data/keiyoushi.js src/goi-quiz/data/fukushi.js"
cat src/goi-quiz/shell.html $GOI_DATA src/goi-quiz/app.js src/goi-quiz/footer.html > ../content/goi/quiz.html
cat src/goi-list/shell.html $GOI_DATA src/goi-list/render.js src/goi-list/footer.html > ../content/goi/list.html

# 自他動詞 topic: the map (owner's file, copied verbatim) + a test bank generated from the map's pair list
mkdir -p ../content/jita
node tools/gen_jita.cjs > /dev/null
cp src/jita/map.html ../content/jita/map.html
cat src/jita-quiz/shell.html src/jita-quiz/data/tota.js src/jita-quiz/data/toji.js src/jita-quiz/data/ukemi.js \
    src/jita-quiz/data/shieki.js src/jita-quiz/data/teiru.js src/jita-quiz/data/hantei.js \
    src/jita-quiz/app.js src/jita-quiz/footer.html > ../content/jita/quiz.html

echo "built:"; ls -l dist/*.html ../content/doushi/*.html ../content/goi/*.html ../content/jita/*.html | awk '{print "  "$9" "$5" bytes"}'
