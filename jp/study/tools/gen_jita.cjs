#!/usr/bin/env node
/* Generate the 自他動詞 test bank from the map's own pair list (src/jita/map.html, const RAW).
   Six sets × 124 pairs, grouped by the map's 7 groups. Deterministic: same input → same files.
   Row: [group(1-7), stem, [correct, d1, d2, d3], explanation, 自動詞, 他動詞, 意味（自／他）] */
const fs = require('fs');
const EN = require('./glosses.cjs');
const html = fs.readFileSync('src/jita/map.html', 'utf8');
const RAW = html.match(/const RAW = `([\s\S]*?)`;/)[1];
const PAIRS = RAW.trim().split('\n').map((l, i) => { const [g, jk, jr, tk, tr, m] = l.split('|'); return { id: i, g, ji: { k: jk, r: jr }, ta: { k: tk, r: tr }, m }; });
const GORDER = ['1', '2', '3', '4', '5A', '5B', 'X'];
const GNAME = { '1': '第1组 -ar-／-e-', '2': '第2组 -r-／-s-', '3': '第3组 ＋-as-', '4': '第4组 -i-／-os-', '5A': '第5A组 自＋e→他', '5B': '第5B组 他＋e→自', 'X': '例外组 -ase-' };
const GRULE = { '1': '-aru 是自，-eru 是他', '2': 'る 是自，す 是他', '3': '带 す 的是他', '4': '〜iる 是自，〜おす 是他', '5A': '本来自己会发生 → 原词是自，加 e 是他', '5B': '本来要人动手 → 原词是他，加 e 是自（＝可能形同形）', 'X': '〜せる 是他（独立的词，不是使役）' };
const GODAN_RU = new Set(['入る', '減る', '切る', '散る', '照る', '返る', '帰る', '千切る']);
const ROWS = { 'う': 'わいうえお', 'く': 'かきくけこ', 'ぐ': 'がぎぐげご', 'す': 'さしすせそ', 'つ': 'たちつてと', 'ぬ': 'なにぬねの', 'ぶ': 'ばびぶべぼ', 'む': 'まみむめも', 'る': 'らりるれろ' };
const I_ROW = 'いきしちにひみりぎじぢびぴ', E_ROW = 'えけせてねへめれげぜでべぺ';
const isIchidan = w => { if (GODAN_RU.has(w.k)) return false; const r = w.r; return r.endsWith('る') && r.length >= 2 && (I_ROW.includes(r[r.length - 2]) || E_ROW.includes(r[r.length - 2])); };
const grade = (s, last, idx) => s.slice(0, -1) + ROWS[last][idx];
function conj(w, kind) {
  const ichi = isIchidan(w);
  const f = s => { const last = s[s.length - 1], base = s.slice(0, -1);
    if (ichi) return { caus: base + 'させる', pass: base + 'られる', pot: base + 'られる', te: base + 'て' }[kind];
    if (kind === 'caus') return grade(s, last, 0) + 'せる';
    if (kind === 'pass') return grade(s, last, 0) + 'れる';
    if (kind === 'pot') return grade(s, last, 3) + 'る';
    if (kind === 'te') { if ('うつる'.includes(last)) return base + 'って'; if ('むぶぬ'.includes(last)) return base + 'んで'; if (last === 'く') return base + (s === '行く' ? 'って' : 'いて'); if (last === 'ぐ') return base + 'いで'; if (last === 'す') return base + 'して'; } };
  return { k: f(w.k), r: f(w.r) };
}
const teAru = w => { const t = conj(w, 'te'); return { k: t.k + 'ある', r: t.r + 'ある' }; };
const teIru = w => { const t = conj(w, 'te'); return { k: t.k + 'いる', r: t.r + 'いる' }; };
const show = w => w.k === w.r ? w.k : `${w.k}（${w.r}）`;
const label = p => `「${p.ji.k}／${p.ta.k}」`;
// three distinct distractors from an ordered pool, never equal to the answer
function opts(ans, pool) { const seen = new Set([ans.r]); const out = []; for (const w of pool) { if (!seen.has(w.r)) { seen.add(w.r); out.push(w); } if (out.length === 3) break; }
  if (out.length < 3) throw new Error('not enough distractors for ' + ans.k); return [ans, ...out].map(show); }
const byGroup = PAIRS.slice().sort((a, b) => GORDER.indexOf(a.g) - GORDER.indexOf(b.g) || a.id - b.id);
const sets = { tota: [], toji: [], ukemi: [], shieki: [], teiru: [], hantei: [] };
byGroup.forEach((p, n) => {
  const g = GORDER.indexOf(p.g) + 1, name = GNAME[p.g], rule = GRULE[p.g], m = p.m;
  const C = { jiC: conj(p.ji, 'caus'), taC: conj(p.ta, 'caus'), jiP: conj(p.ji, 'pass'), taP: conj(p.ta, 'pass'), taPot: conj(p.ta, 'pot'), jiPot: conj(p.ji, 'pot'), jiI: teIru(p.ji), taI: teIru(p.ta), jiA: teAru(p.ji), taA: teAru(p.ta) };
  const core = `${name}：${rule}。${p.ji.k}（自）／${p.ta.k}（他）＝${m}。`;
  sets.tota.push([g, `${show(p.ji)} に対応する他動詞はどれか。`, opts(p.ta, [C.jiC, C.taP, p.ji, C.jiI, C.taC, C.taA]),
    core + `使役「${C.jiC.k}」是让别人做，受身「${C.taP.k}」背后有人，都不是成对的他动词。`, p.ji.k, p.ta.k, `${m} · ${EN[p.ji.k] || '?'}／${EN[p.ta.k] || '?'}`]);
  sets.toji.push([g, `${show(p.ta)} に対応する自動詞はどれか。`, opts(p.ji, [C.taP, p.ta, C.jiC, C.taC, C.jiI, C.taA]),
    core + `受身「${C.taP.k}」背后有人，自動詞「${p.ji.k}」背后没有人。`, p.ji.k, p.ta.k, `${m} · ${EN[p.ji.k] || '?'}／${EN[p.ta.k] || '?'}`]);
  sets.ukemi.push([g, `${show(p.ta)} の受身形はどれか。`, opts(C.taP, [p.ji, C.taC, C.jiP, C.taPot, C.jiI, C.jiC]),
    `受身＝他動詞＋（ら）れる：${p.ta.k}→${C.taP.k}（被人…）。不要和自動詞「${p.ji.k}」（自然发生）混；${name}：${rule}。`, p.ji.k, p.ta.k, `${m} · ${EN[p.ji.k] || '?'}／${EN[p.ta.k] || '?'}`]);
  sets.shieki.push([g, `${show(p.ji)} の使役形はどれか。`, opts(C.jiC, [p.ta, C.taC, C.taP, C.jiP, C.jiI, C.taA]),
    `使役＝自動詞＋（さ）せる：${p.ji.k}→${C.jiC.k}（让别人去…）。成对的他動詞「${p.ta.k}」是独立的词，不是使役；${name}。`, p.ji.k, p.ta.k, `${m} · ${EN[p.ji.k] || '?'}／${EN[p.ta.k] || '?'}`]);
  if (n % 2 === 0) sets.teiru.push([g, `${label(p)}で「変化した後の状態」を言うとき、正しい形はどれか。`, opts(C.jiI, [C.jiA, C.taI, C.taA, C.taP]),
    `〜ている 接自動詞＝变化后的状态：${C.jiI.k}。〜てある 接他動詞（有人特意做好）：${C.taA.k}。${name}：${rule}。`, p.ji.k, p.ta.k, `${m} · ${EN[p.ji.k] || '?'}／${EN[p.ta.k] || '?'}`]);
  else sets.teiru.push([g, `${label(p)}で「誰かが準備してそのままにしてある」と言うとき、正しい形はどれか。`, opts(C.taA, [C.taI, C.jiA, C.jiI, C.taP]),
    `〜てある 接他動詞＝有人特意做好：${C.taA.k}。〜ている 接自動詞（变化后的状态）：${C.jiI.k}。${name}：${rule}。`, p.ji.k, p.ta.k, `${m} · ${EN[p.ji.k] || '?'}／${EN[p.ta.k] || '?'}`]);
  const forms = [[p.ji, '自動詞'], [p.ta, '他動詞'], [C.taP, '受身形'], [C.jiC, '使役形']];
  const [w, lab] = forms[n % 4]; const labs = ['自動詞', '他動詞', '受身形', '使役形'];
  sets.hantei.push([g, `${show(w)} は何か。`, [lab, ...labs.filter(x => x !== lab)],
    `${w.k} 是${lab}。${core}${lab === '受身形' ? `受身＝他動詞 ${p.ta.k}＋（ら）れる。` : lab === '使役形' ? `使役＝自動詞 ${p.ji.k}＋（さ）せる。` : p.g === '5B' && lab === '自動詞' ? `注意：${w.k} 也是 ${p.ta.k} 的可能形（同形）。` : ''}`, p.ji.k, p.ta.k, `${m} · ${EN[p.ji.k] || '?'}／${EN[p.ta.k] || '?'}`]);
});
const names = { tota: ['Q1', '自→他'], toji: ['Q2', '他→自'], ukemi: ['Q3', '他→受身形'], shieki: ['Q4', '自→使役形'], teiru: ['Q5', 'ている／てある'], hantei: ['Q6', '自他判定'] };
for (const k in sets) {
  const [v, title] = names[k];
  fs.writeFileSync(`src/jita-quiz/data/${k}.js`, `// 自他動詞 ${title}：由 tools/gen_jita.cjs 从 src/jita/map.html 的词对表生成，勿手改。\n// [组, 题干, [正确, 干扰×3], 解析, 自動詞, 他動詞, 意味]\nconst ${v} = [\n` + sets[k].map(r => JSON.stringify(r)).join(',\n') + '\n];\n');
}
console.log(`gen_jita: ${PAIRS.length} pairs → ${Object.values(sets).reduce((s, a) => s + a.length, 0)} questions in ${Object.keys(sets).length} sets`);

const missing = PAIRS.flatMap(p => [p.ji.k, p.ta.k]).filter(k => !EN[k]); if (missing.length) { console.error('no English gloss for: ' + missing.join('、')); process.exit(1); }
