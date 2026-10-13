#!/usr/bin/env node
/* Checks for the 音便 topic: the material tables (src/onbin/data.js) and the six quiz sets (src/onbin-quiz/data).
   - VERBS rows: 9 fields, unique 語, 音便 type valid, て形／た形／意味／English present
   - SEC: fields present, ids unique
   - generated sets cover every table row (O1) / every verb row (O2, O3); hand-written sets are 20 = 10 基本 + 10 応用
   - every target word of a hand-written question appears in the material (words from the material only)
   - trap spot checks, no simplified-only Chinese in Japanese fields */
const fs = require('fs');
const SIMPLIFIED = new Set([...'间问际实验证议务运过见产车单压长关头发汉语纪给结经济应该两动员术业样齐认产权让']);
const src = fs.readFileSync('src/onbin/data.js', 'utf8');
const { VERBS, SEC } = new Function(src + ';return {VERBS,SEC};')();
let bad = 0; const hits = [];
const flag = (where, s) => { if (typeof s !== 'string') return; const b = [...s].filter(c => SIMPLIFIED.has(c)); if (b.length) hits.push(`  ${where}  ${b.join('')}  →  ${s.slice(0, 50)}`); };
const TYPES = new Set(['撥音便', '促音便', 'イ音便', 'ウ音便', 'なし']);
const badRows = VERBS.filter(r => r.length !== 9 || !TYPES.has(r[3]) || [0, 1, 2, 4, 5, 6, 7].some(i => !r[i])).length;
const dupW = VERBS.length - new Set(VERBS.map(r => r[0])).size;
VERBS.forEach(r => [0, 1, 4, 5].forEach(i => flag(`VERBS ${r[0]}`, r[i])));
console.log(`  onbin VERBS: ${VERBS.length} rows, bad rows ${badRows}, duplicate 語 ${dupW}, by type ${[...TYPES].map(t => t + ' ' + VERBS.filter(r => r[3] === t).length).join(' / ')}`);
if (badRows || dupW) bad = 1;
const badSec = SEC.filter(s => !s.id || !s.t || !s.lead || !s.tb || !s.ex || !s.tip || !s.p).length, ids = new Set(SEC.map(s => s.id));
SEC.forEach(s => { flag(`SEC ${s.id} title`, s.t); s.ex.forEach(e => flag(`SEC ${s.id} example`, e[1])); });
console.log(`  onbin SEC: ${SEC.length} sections, ${SEC.reduce((a, s) => a + s.ex.length, 0)} examples, missing fields ${badSec}, dup ids ${SEC.length - ids.size}`);
if (badSec || ids.size !== SEC.length) bad = 1;

const sets = [['shurui', 'O1'], ['te', 'O2'], ['ta', 'O3'], ['n', 'O4'], ['ndesu', 'O5'], ['sougou', 'O6']];
const data = {};
for (const [f, v] of sets) {
  const arr = new Function(fs.readFileSync(`src/onbin-quiz/data/${f}.js`, 'utf8') + `;return ${v};`)();
  data[v] = arr;
  const g = {}; arr.forEach(q => g[q[0]] = (g[q[0]] || 0) + 1);
  const shape = arr.filter(q => q.length !== 7 || q[2].length !== 4 || q[2].some(o => !o) || !q[1] || !q[3] || !q[4] || !q[6]).length;
  const dup = arr.filter(q => new Set(q[2]).size !== 4).length;
  const sorted = arr.every((q, i) => i === 0 || q[0] >= arr[i - 1][0]);
  arr.forEach((q, i) => { flag(`${f}#${i + 1} stem`, q[1]); q[2].forEach(o => flag(`${f}#${i + 1} option`, o)); });
  const hand = ['O4', 'O5', 'O6'].includes(v);
  console.log(`  onbin/${f}: ${arr.length} items, per group ${Object.keys(g).sort().map(k => g[k]).join('/')}, bad shape ${shape}, dup options ${dup}, grouped ${sorted}`);
  if (shape || dup || !sorted || (hand ? arr.length !== 20 || g[1] !== 10 || g[2] !== 10 : arr.length < 90)) bad = 1;
}
// coverage
const words = arr => new Set(arr.map(q => q[4]));
const miss1 = VERBS.filter(r => !words(data.O1).has(r[0])).map(r => r[0]);
const verbRows = VERBS.filter(r => r[2] !== 'い形容詞');
const miss2 = verbRows.filter(r => !words(data.O2).has(r[0])).map(r => r[0]), miss3 = verbRows.filter(r => !words(data.O3).has(r[0])).map(r => r[0]);
if (miss1.length || miss2.length || miss3.length) { console.log(`  COVERAGE FAIL: shurui ${miss1.join('、')} | te ${miss2.join('、')} | ta ${miss3.join('、')}`); bad = 1; }
else console.log(`  onbin coverage: every table row in 音便の種類, every verb in て形 and た形`);
const notInMaterial = ['O4', 'O5', 'O6'].flatMap(v => data[v].map(q => q[4])).filter(w => !src.includes(w));
if (notInMaterial.length) { console.log(`  WORDS NOT IN MATERIAL: ${[...new Set(notInMaterial)].join('、')}`); bad = 1; } else console.log('  onbin hand-written sets: all target words appear in the material');
// traps
const q2 = w => data.O2.find(r => r[4] === w);
for (const [w, c] of [['行く', '行って（いって）'], ['問う', '問うて（とうて）'], ['来る', '来て（きて）'], ['切る', '切って（きって）'], ['着る', '着て（きて）'], ['泳ぐ', '泳いで（およいで）'], ['話す', '話して（はなして）'], ['借りる', '借りて（かりて）'], ['勉強する', '勉強して（べんきょうして）']]) {
  const r = q2(w); if (!r || r[2][0] !== c) { console.log(`  TRAP FAIL て形 ${w}: ${r && r[2][0]}`); bad = 1; } }
const q1 = w => data.O1.find(r => r[4] === w);
for (const [w, c] of [['行く', '促音便'], ['ありがたい', 'ウ音便'], ['話す', '音便なし'], ['読む', '撥音便']]) { const r = q1(w); if (!r || r[2][0] !== c) { console.log(`  TRAP FAIL 種類 ${w}: ${r && r[2][0]}`); bad = 1; } }
if (hits.length) { console.log('MIXED SCRIPT in Japanese fields:'); console.log(hits.join('\n')); bad = 1; } else console.log('  onbin mixed-script scan: clean');
process.exit(bad);
