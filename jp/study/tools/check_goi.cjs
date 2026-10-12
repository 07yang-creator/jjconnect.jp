#!/usr/bin/env node
/* Structure checks for the N2 語彙 quiz (src/goi-quiz/data).
   - 4 files × 4 groups × 20, rows of 7 fields, 4 distinct options, correct answer first
   - no simplified-only Chinese characters inside Japanese fields (stem, options, word, reading)
   - target words unique across the whole bank (a repeat is reported, not fatal) */
const fs = require('fs');
const SIMPLIFIED = new Set([...'间问际实验证议务运过见产车单压长关头发汉语纪给结经济应该两动员术业样齐认产权让']);
const files = [['meishi', 'QA'], ['doushi', 'QB'], ['keiyoushi', 'QC'], ['fukushi', 'QD']];
let bad = 0; const hits = []; const words = new Map();
const flag = (where, s) => { if (typeof s !== 'string') return; const b = [...s].filter(c => SIMPLIFIED.has(c)); if (b.length) hits.push(`  ${where}  ${b.join('')}  →  ${s.slice(0, 50)}`); };
for (const [name, v] of files) {
  const arr = eval(fs.readFileSync(`src/goi-quiz/data/${name}.js`, 'utf8').replace(new RegExp(`^[\\s\\S]*?const ${v} =`), ''));
  const lv = [1, 2, 3, 4].map(l => arr.filter(q => q[0] === l).length);
  const shape = arr.filter(q => q.length !== 7 || q[2].length !== 4 || q.slice(1, 7).some((x, j) => j === 1 ? false : typeof x !== 'string' || !x)).length;
  const dup = arr.filter(q => new Set(q[2]).size !== 4).length;
  arr.forEach((q, i) => { flag(`${name}#${i + 1} stem`, q[1]); q[2].forEach(o => flag(`${name}#${i + 1} option`, o)); flag(`${name}#${i + 1} word`, q[4]); flag(`${name}#${i + 1} yomi`, q[5]);
    const w = q[4]; if (words.has(w)) words.get(w).push(`${name}#${i + 1}`); else words.set(w, [`${name}#${i + 1}`]); });
  console.log(`  goi/${name}: ${arr.length} items, per group ${lv.join('/')}, bad shape ${shape}, dup options ${dup}`);
  if (arr.length !== 80 || lv.some(x => x !== 20) || shape || dup) bad = 1;
}
const rep = [...words].filter(([, w]) => w.length > 1);
console.log(`  goi: ${words.size} distinct target words${rep.length ? '; repeated: ' + rep.map(([w, l]) => `${w}(${l.join(',')})`).join(', ') : ''}`);
if (hits.length) { console.log('MIXED SCRIPT in Japanese fields:'); console.log(hits.join('\n')); bad = 1; } else console.log('  goi mixed-script scan: clean');
process.exit(bad);
