#!/usr/bin/env node
/* Checks for the 動詞 実務 quiz (src/doushi-quiz2/data): 5 sets × 20 (10 基本 + 10 応用), 4 distinct options,
   correct answer first, every target word appears in the verb material (src/doushi/data.js), no simplified-only Chinese
   in Japanese fields (stem, options, word, reading). */
const fs = require('fs');
const SIMPLIFIED = new Set([...'间问际实验证议务运过见产车单压长关头发汉语纪给结经济应该两动员术业样齐认产权让']);
const src = fs.readFileSync('src/doushi/data.js', 'utf8');
const sets = [['renyou', 'D1'], ['kishi', 'D2'], ['hitei', 'D3'], ['jisei', 'D4'], ['jouken', 'D5']];
let bad = 0; const hits = [], missing = [];
const flag = (where, s) => { if (typeof s !== 'string') return; const b = [...s].filter(c => SIMPLIFIED.has(c)); if (b.length) hits.push(`  ${where}  ${b.join('')}  →  ${s.slice(0, 50)}`); };
const inMaterial = w => [w, w.replace(/する$/, ''), w.length > 1 ? w.slice(0, -1) : w].some(x => x && src.includes(x));
for (const [f, v] of sets) {
  const arr = new Function(fs.readFileSync(`src/doushi-quiz2/data/${f}.js`, 'utf8') + `;return ${v};`)();
  const g = {}; arr.forEach(q => g[q[0]] = (g[q[0]] || 0) + 1);
  const shape = arr.filter(q => q.length !== 7 || q[2].length !== 4 || q[2].some(o => !o) || !q[1] || !q[3] || !q[4] || !q[6]).length;
  const dup = arr.filter(q => new Set(q[2]).size !== 4).length;
  const sorted = arr.every((q, i) => i === 0 || q[0] >= arr[i - 1][0]);
  arr.forEach((q, i) => { flag(`${f}#${i + 1} stem`, q[1]); q[2].forEach(o => flag(`${f}#${i + 1} option`, o)); flag(`${f}#${i + 1} word`, q[4]); flag(`${f}#${i + 1} yomi`, q[5]); if (!inMaterial(q[4])) missing.push(`${f}#${i + 1} ${q[4]}`); });
  console.log(`  doushi2/${f}: ${arr.length} items, per group ${[1, 2].map(l => g[l] || 0).join('/')}, bad shape ${shape}, dup options ${dup}, grouped ${sorted}`);
  if (arr.length !== 20 || g[1] !== 10 || g[2] !== 10 || shape || dup || !sorted) bad = 1;
}
if (missing.length) { console.log(`  WORDS NOT IN MATERIAL: ${missing.join('、')}`); bad = 1; } else console.log('  doushi2: all target words appear in the verb material');
if (hits.length) { console.log('MIXED SCRIPT in Japanese fields:'); console.log(hits.join('\n')); bad = 1; } else console.log('  doushi2 mixed-script scan: clean');
process.exit(bad);
