#!/usr/bin/env bash
# Syntax + structure checks. Run after any content edit.
set -e
cd "$(dirname "$0")"
./build.sh > /dev/null
mkdir -p .tmp
fail=0
for f in quiz benseki fukushu; do
  python3 - "$f" << 'PY'
import sys,pathlib
n=sys.argv[1]
h=pathlib.Path(f"dist/{n}.html").read_text(encoding="utf-8")
pathlib.Path(f".tmp/{n}.js").write_text(h.split("<script>")[1].split("</script>")[0],encoding="utf-8")
PY
  if node --check ".tmp/$f.js"; then echo "  syntax ok: $f"; else echo "  SYNTAX FAIL: $f"; fail=1; fi
done
node - << 'EOF2' || fail=1
const fs=require('fs');
const src=['set1-basic','set2-advanced','set3-bunkei-goi','set4-jitsumu'].map(n=>fs.readFileSync(`src/quiz/data/${n}.js`,'utf8'));
let bad=0;
src.forEach((s,i)=>{
  const arr=eval(s.replace(/^const Q\d* =/,''));
  const lv=[1,2,3,4,5].map(l=>arr.filter(q=>q[0]===l).length);
  const shape=arr.filter(q=>q.length!==4||q[2].length!==4||typeof q[1]!=='string'||typeof q[3]!=='string').length;
  const noblank=arr.filter(q=>!q[1].includes('（　）')&&!q[1].includes('どれか')).length;
  const dup=arr.filter(q=>new Set(q[2]).size!==4).length;
  console.log(`  set${i+1}: ${arr.length} items, per level ${lv.join('/')}, bad shape ${shape}, dup options ${dup}, no blank ${noblank}`);
  if(arr.length!==100||lv.some(x=>x!==20)||shape||dup) bad=1;
});
['benseki','fukushu'].forEach(n=>{
  const s=fs.readFileSync(`src/${n}/sec.js`,'utf8');
  const SEC=eval(s.replace(/^const SEC=/,''));
  const bad2=SEC.filter(x=>!x.id||!x.t||!x.tb||!x.ex||!x.tip).length;
  const ids=new Set(SEC.map(x=>x.id));
  console.log(`  ${n}: ${SEC.length} sections, ${SEC.reduce((a,b)=>a+b.ex.length,0)} examples, missing fields ${bad2}, dup ids ${SEC.length-ids.size}`);
  if(bad2||SEC.length!==ids.size) bad=1;
});
process.exit(bad);
EOF2
node tools/check_mixed_script.cjs || fail=1
rm -rf .tmp
[ $fail -eq 0 ] && echo "ALL CHECKS PASSED" || { echo "CHECKS FAILED"; exit 1; }
