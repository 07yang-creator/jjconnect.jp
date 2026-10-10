#!/usr/bin/env node
/* Flag simplified-Chinese-only characters inside JAPANESE fields only.
   Chinese appears legitimately in explanations; it must not appear in
   stems, options, example sentences or table headwords.
   Past bug: 間違い written as 间违い. Exit 1 on any hit. */
const fs = require('fs');
const SIMPLIFIED = new Set([...'间问际实验证议务运过见产车单压长关头发汉语纪给结经济应该两动员术业样齐认产权让'].filter(c=>c>'　'));
const hits = [];
const flag = (where, s) => {
  if (typeof s !== 'string') return;
  const bad = [...s].filter(c => SIMPLIFIED.has(c));
  if (bad.length) hits.push(`  ${where}  ${bad.join('')}  →  ${s.slice(0, 60)}`);
};
for (const [file, varname] of [['src/quiz/data/set1-basic.js','Q'],['src/quiz/data/set2-advanced.js','Q2'],['src/quiz/data/set3-bunkei-goi.js','Q3'],['src/quiz/data/set4-jitsumu.js','Q4']]) {
  const arr = eval(fs.readFileSync(file,'utf8').replace(/^const \w+ =/,''));
  arr.forEach((q,i) => { flag(`${file}#${i+1} stem`, q[1]); q[2].forEach(o => flag(`${file}#${i+1} option`, o)); });
}
for (const file of ['src/benseki/sec.js','src/fukushu/sec.js']) {
  const SEC = eval(fs.readFileSync(file,'utf8').replace(/^const SEC=/,''));
  SEC.forEach(s => {
    flag(`${file}:${s.id} title`, s.t);
    s.tb.slice(1).forEach(r => flag(`${file}:${s.id} headword`, r[0]));
    s.ex.forEach(e => flag(`${file}:${s.id} example`, e[1]));
  });
}
if (hits.length) { console.log('MIXED SCRIPT in Japanese fields:'); console.log(hits.join('\n')); process.exit(1); }
console.log('  mixed-script scan: clean');
