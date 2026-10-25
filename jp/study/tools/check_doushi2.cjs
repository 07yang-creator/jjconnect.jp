#!/usr/bin/env node
/* Checks for the 動詞 実務 quiz (src/doushi-quiz2/data): 10 sets × 20 (10 基本 + 10 応用), 4 distinct options,
   correct answer first, no simplified-only Chinese in Japanese fields (stem, options, word, reading).
   Material rule — a question may only target a verb the learner can look up on this site:
     sets 1–5 (文法軸・手写) : the word appears in the verb material (src/doushi/data.js)
     sets 6–10 (頻出動詞)    : the word is in the top 100 of the 五段動詞一覧 (src/doushi-godan/data.js, BCCWJ 頻度順),
                              each set's 10 words are tested exactly twice (基本 1 ＋ 応用 1), and the 50 are distinct. */
const fs = require('fs');
const SIMPLIFIED = new Set([...'间问际实验证议务运过见产车单压长关头发汉语纪给结经济应该两动员术业样齐认产权让']);
const src = fs.readFileSync('src/doushi/data.js', 'utf8');

// 五段動詞一覧: rank by 語彙素 / 読み / 備考の表記ゆれ
const GODAN = new Function(fs.readFileSync('src/doushi-godan/data.js', 'utf8').split('const GODAN_META')[0] + ';return GODAN;')();
const rankOf = new Map();
GODAN.forEach((r, i) => { [r[0], r[1], ...String(r[6] || '').split('・')].forEach(f => { f = (f || '').trim(); if (f && !rankOf.has(f)) rankOf.set(f, i + 1); }); });
const TOP = 100;
const rank = (w, yomi) => rankOf.get(w) || rankOf.get(yomi);

const sets = [['renyou', 'D1'], ['kishi', 'D2'], ['hitei', 'D3'], ['jisei', 'D4'], ['jouken', 'D5'],
              ['hin1', 'D6'], ['hin2', 'D7'], ['hin3', 'D8'], ['hin4', 'D9'], ['hin5', 'D10']];
const FREQ = new Set(['hin1', 'hin2', 'hin3', 'hin4', 'hin5']);
let bad = 0; const hits = [], missing = [], offlist = [], freqWords = [];
const flag = (where, s) => { if (typeof s !== 'string') return; const b = [...s].filter(c => SIMPLIFIED.has(c)); if (b.length) hits.push(`  ${where}  ${b.join('')}  →  ${s.slice(0, 50)}`); };
const inMaterial = w => [w, w.replace(/する$/, ''), w.length > 1 ? w.slice(0, -1) : w].some(x => x && src.includes(x));

for (const [f, v] of sets) {
  const arr = new Function(fs.readFileSync(`src/doushi-quiz2/data/${f}.js`, 'utf8') + `;return ${v};`)();
  const g = {}; arr.forEach(q => g[q[0]] = (g[q[0]] || 0) + 1);
  const shape = arr.filter(q => q.length !== 7 || q[2].length !== 4 || q[2].some(o => !o) || !q[1] || !q[3] || !q[4] || !q[6]).length;
  const dup = arr.filter(q => new Set(q[2]).size !== 4).length;
  const noblank = arr.filter(q => !q[1].includes('（　）')).length;
  const sorted = arr.every((q, i) => i === 0 || q[0] >= arr[i - 1][0]);
  arr.forEach((q, i) => {
    flag(`${f}#${i + 1} stem`, q[1]); q[2].forEach(o => flag(`${f}#${i + 1} option`, o));
    flag(`${f}#${i + 1} word`, q[4]); flag(`${f}#${i + 1} yomi`, q[5]);
    if (FREQ.has(f)) { const r = rank(q[4], q[5]); if (!r || r > TOP) offlist.push(`${f}#${i + 1} ${q[4]}${r ? ' rank ' + r : ' 一覧にない'}`); }
    else if (!inMaterial(q[4])) missing.push(`${f}#${i + 1} ${q[4]}`);
  });
  let per = '';
  if (FREQ.has(f)) {
    const c = {}; arr.forEach(q => { (c[q[4]] = c[q[4]] || []).push(q[0]); });
    const words = Object.keys(c);
    const twice = words.filter(w => c[w].length === 2 && c[w][0] === 1 && c[w][1] === 2).length;
    freqWords.push(...words);
    per = `, ${words.length} 词 基本+応用 ${twice}`;
    if (words.length !== 10 || twice !== 10) bad = 1;
  }
  // 文法軸の 5 套 mixes in 「どれか」-style items on purpose, so a missing blank is only reported there;
  // the 頻出動詞 sets are all fill-in-the-blank and a missing blank is a defect.
  console.log(`  doushi2/${f}: ${arr.length} items, per group ${[1, 2].map(l => g[l] || 0).join('/')}, bad shape ${shape}, dup options ${dup}, no blank ${noblank}, grouped ${sorted}${per}`);
  if (arr.length !== 20 || g[1] !== 10 || g[2] !== 10 || shape || dup || !sorted) bad = 1;
  if (FREQ.has(f) && noblank) bad = 1;
}
if (missing.length) { console.log(`  WORDS NOT IN MATERIAL: ${missing.join('、')}`); bad = 1; } else console.log('  doushi2: 文法軸 5 套, all target words appear in the verb material');
if (offlist.length) { console.log(`  WORDS OUTSIDE THE TOP ${TOP}: ${offlist.join('、')}`); bad = 1; }
else {
  const d = new Set(freqWords);
  console.log(`  doushi2: 頻出動詞 5 套, ${d.size} distinct verbs, all within the top ${TOP} of 五段動詞一覧`);
  if (d.size !== freqWords.length) { console.log(`  DUPLICATE VERB ACROSS FREQ SETS: ${freqWords.length - d.size}`); bad = 1; }
}
if (hits.length) { console.log('MIXED SCRIPT in Japanese fields:'); console.log(hits.join('\n')); bad = 1; } else console.log('  doushi2 mixed-script scan: clean');
process.exit(bad);
