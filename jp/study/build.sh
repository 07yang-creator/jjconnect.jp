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

echo "built:"; ls -l dist/*.html ../content/doushi/*.html | awk '{print "  "$9" "$5" bytes"}'
