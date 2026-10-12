#!/usr/bin/env node
/* Structure + vocabulary checks for the 動詞 topic (src/doushi, src/doushi-quiz).
   - each quiz set has the declared number of groups × 20, 4 distinct options, correct answer first
   - every verb that a question tests appears in VERBS or PAIRS (the two charts) — the "words from the material" rule
   - no simplified-only Chinese characters inside Japanese fields */
const fs = require('fs');
const SIMPLIFIED = new Set([...'间问际实验证议务运过见产车单压长关头发汉语纪给结经济应该两动员术业样齐认产权让']);
const load = (file, re) => eval(fs.readFileSync(file, 'utf8').replace(re, ''));
// data.js holds three consts; evaluate it in one scope
const dataSrc = fs.readFileSync('src/doushi/data.js', 'utf8');
const data = new Function(dataSrc + ';return {VERBS,PAIRS,SEC};')();
const sets = [['katsuyo', 'Q1', 3], ['ukemi', 'Q2', 5], ['jita', 'Q3', 4]];
const allQ = []; // every question, for the coverage audit below
let bad = 0;
const hits = [];
const flag = (where, s) => { if (typeof s !== 'string') return; const b = [...s].filter(c => SIMPLIFIED.has(c)); if (b.length) hits.push(`  ${where}  ${b.join('')}  →  ${s.slice(0, 50)}`); };

// vocabulary of the two charts: dictionary forms + stems (first 2+ chars before the okurigana)
const vocab = new Set();
for (const r of data.VERBS) vocab.add(r[0]);
for (const r of data.PAIRS) { vocab.add(r[0]); vocab.add(r[2]); }
const kanjiOf = s => s.replace(/[^一-鿿]/g, '');
// stem = the verb minus its final okurigana: 書く→書, 引っ張る→引っ張, 落ち込む→落ち込, 蒸発する→蒸発, ぶつかる→ぶつか, する→する
const stemOf = v => (v.endsWith('する') ? v.slice(0, -2) : v.replace(/[るうくぐすつぬぶむ]$/, '')) || v;
const stems = [...vocab].map(stemOf).filter(s => /[一-鿿]/.test(s) || s.length >= 2); // drops い／あ／し, keeps ぶつか
// a string "uses a chart verb" when it is one, or contains the stem of one
const hasChartVerb = s => vocab.has(s) || stems.some(k => s.includes(k));
// a fill-in answer is fine when it is kana-only (particles, する/いる forms) or carries a chart verb
const inMaterial = w => !kanjiOf(w) || hasChartVerb(w);

for (const [name, varname, groups] of sets) {
  const arr = load(`src/doushi-quiz/data/${name}.js`, new RegExp(`^const ${varname} =`));
  allQ.push(...arr);
  const lv = Array.from({ length: groups }, (_, i) => arr.filter(q => q[0] === i + 1).length);
  const shape = arr.filter(q => q.length !== 4 || q[2].length !== 4 || typeof q[1] !== 'string' || typeof q[3] !== 'string').length;
  const dup = arr.filter(q => new Set(q[2]).size !== 4).length;
  const extra = arr.filter(q => q[0] < 1 || q[0] > groups).length;
  // tested material: a fill-in question's correct answer; otherwise the quoted text in the stem and the options
  const notIn = [];
  arr.forEach((q, i) => {
    if (q[1].includes('（　）')) { if (!inMaterial(q[2][0])) notIn.push(`#${i + 1} ${q[2][0]}`); }
    else if (!q[1].includes('なぜか')) { // conceptual "why" questions carry no verb
      const quotes = [...q[1].matchAll(/「([^」]+)」/g)].map(m => m[1]);
      if (![...quotes, ...q[2]].some(hasChartVerb)) notIn.push(`#${i + 1} ${q[1].slice(0, 24)}`);
    }
    flag(`${name}#${i + 1} stem`, q[1]); q[2].forEach(o => flag(`${name}#${i + 1} option`, o));
  });
  console.log(`  ${name}: ${arr.length} items, per group ${lv.join('/')}, bad shape ${shape}, dup options ${dup}, outside groups ${extra}, tested word not in charts: ${notIn.length ? notIn.join(', ') : 'none'}`);
  if (arr.length !== groups * 20 || lv.some(x => x !== 20) || shape || dup || extra || notIn.length) bad = 1;
}
// coverage: every verb given in the two charts must be tested at least once
// (its stem appears in a question's stem text or correct answer)
const given = new Set([...data.VERBS.map(r => r[0]), ...data.PAIRS.flatMap(r => [r[0], r[2]])]);
const untested = [...given].filter(v => !allQ.some(q => (q[1] + '\n' + q[2][0]).includes(stemOf(v))));
console.log(`  coverage: ${given.size - untested.length} / ${given.size} given verbs tested${untested.length ? ' — UNTESTED: ' + untested.join('、') : ''}`);
if (untested.length) bad = 1;
// material
data.SEC.forEach(s => { flag(`SEC:${s.id} title`, s.t); s.tb.slice(1).forEach(r => flag(`SEC:${s.id} headword`, r[0])); s.ex.forEach(e => flag(`SEC:${s.id} example`, e[1])); });
data.VERBS.forEach(r => r.slice(0, 10).forEach(c => flag(`VERBS:${r[0]}`, c)));
data.PAIRS.forEach(r => [r[0], r[2]].forEach(c => flag(`PAIRS:${r[0]}`, c)));
const ids = new Set(data.SEC.map(s => s.id));
console.log(`  doushi material: ${data.VERBS.length} verbs, ${data.PAIRS.length} pairs, ${data.SEC.length} sections, dup ids ${data.SEC.length - ids.size}`);
if (data.VERBS.length !== 50 || data.PAIRS.length !== 46 || ids.size !== data.SEC.length) bad = 1;
// the material must not talk about its sources' mistakes: corrections are applied silently
const meta = [data.SEC.map(s => [s.t, s.lead, s.tip, ...s.tb.flat(), ...s.ex.flat()]).flat(), data.VERBS.flat(), data.PAIRS.flat()].flat()
  .filter(x => typeof x === 'string' && /誤り|误标|有误|误写|订正|訂正|表里|表の|表では/.test(x));
if (meta.length) { console.log('  mentions of source errors in material:', meta.length); meta.forEach(m => console.log('    ' + m.slice(0, 60))); bad = 1; }
if (hits.length) { console.log('MIXED SCRIPT in Japanese fields:'); console.log(hits.join('\n')); bad = 1; }
else console.log('  doushi mixed-script scan: clean');
process.exit(bad);
