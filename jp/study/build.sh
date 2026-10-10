#!/usr/bin/env bash
# Build all three pages from src/ into dist/. No dependencies.
set -e
cd "$(dirname "$0")"
mkdir -p dist

cat src/quiz/shell.html \
    src/quiz/data/set1-basic.js \
    src/quiz/data/set2-advanced.js \
    src/quiz/data/set3-bunkei-goi.js \
    src/quiz/data/set4-jitsumu.js \
    src/quiz/app.js \
    src/quiz/footer.html > dist/quiz.html

cat src/benseki/shell.html src/benseki/sec.js src/benseki/render.js src/benseki/footer.html > dist/benseki.html
cat src/fukushu/shell.html src/fukushu/sec.js src/fukushu/render.js src/fukushu/footer.html > dist/fukushu.html

echo "built:"; ls -l dist/*.html | awk '{print "  "$9" "$5" bytes"}'
