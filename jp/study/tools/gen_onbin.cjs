#!/usr/bin/env node
/* Generate the three form-based 音便 sets from src/onbin/data.js VERBS (deterministic; run by build.sh).
     shurui.js  const O1  「読んで」はどの音便か        every row of the table (verbs and the three 形容詞)
     te.js      const O2  て形                            every verb row
     ta.js      const O3  た形／たら／たり／ちゃう        every verb row, variant rotating
   Distractors are the real wrong formations: ます形词干＋て（読みて）, the wrong 音便 (読って・読いて), missing voicing (読んて・泳いて),
   五段 treated as 一段 and the reverse (借って・帰た). Row: [level, stem, [correct, d1, d2, d3], explanation, 語, 読み, 意味 · English] */
const fs = require('fs');
const { VERBS } = new Function(fs.readFileSync('src/onbin/data.js', 'utf8') + ';return {VERBS};')();
const rng = s => () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; };
const TYPES = ['撥音便', '促音便', 'イ音便', 'ウ音便', 'なし'];
const LABEL = t => t === 'なし' ? '音便なし' : t;
const I_ROW = { う: 'い', く: 'き', ぐ: 'ぎ', す: 'し', つ: 'ち', ぬ: 'に', ぶ: 'び', む: 'み', る: 'り' };
const gloss = r => `${r[6]} · ${r[7]}`;
const show = ([k, y]) => k === y ? k : `${k}（${y}）`;
const voice = (s, a, b) => s.slice(0, -1) + (s.endsWith('で') ? b : a); // て/で → a/b

/* ---- forms with readings ---- */
function forms(r) {
  const [k, y, g, , te, ta] = r;
  if (g === 'い形容詞') return null;
  if (k === '来る') return { cls: 'kuru', te: ['来て', 'きて'], ta: ['来た', 'きた'], wrongTe: [['来って', 'きって'], ['来て', 'くて'], ['来て', 'こて']] };
  if (g === '特殊') { const P = k.slice(0, -2), p = y.slice(0, -2); return { cls: 'suru', te: [P + 'して', p + 'して'], ta: [P + 'した', p + 'した'], wrongTe: ['すって', 'しって', 'すて'].map(s => [P + s, p + s]) }; }
  const stem = k.slice(0, -1), rs = y.slice(0, -1), mk = suf => [stem + suf, rs + suf];
  const sufTe = te.slice(stem.length);
  if (!te.startsWith(stem) || !ta.startsWith(stem)) throw new Error(`stem mismatch: ${k} ${te} ${ta}`);
  let cand;
  // い段＋る の一段（借りる・起きる）: the classic error is to treat it like 切る／入る → 借って; え段 一段 gets no such form (食って would be a real word)
  if (g === '一段') { cand = ['って', 'んで', 'いて'].map(mk); if (k.length >= 3 && 'いきしちにひみりぎじぢびぴ'.includes(y[y.length - 2])) cand.unshift([k.slice(0, -2) + 'って', y.slice(0, -2) + 'って']); }
  else if (g === 'す') cand = ['って', 'んで', 'いて', 'て'].map(mk);
  else if (r[3] === 'ウ音便') cand = ['って', 'いて', 'んで'].map(mk);
  else if (k === '行く') cand = ['いて', 'きて', 'んで'].map(mk);
  else if ('むぶぬ'.includes(g)) cand = [I_ROW[g] + 'て', 'んて', 'って', 'いて'].map(mk);
  else if ('うつる'.includes(g)) cand = [I_ROW[g] + 'て', 'んで', 'いて', 'いで'].map(mk); // う: 買いて duplicates いて, so いで is the 4th
  else if (g === 'く') cand = ['きて', 'いで', 'って', 'んで'].map(mk);
  else if (g === 'ぐ') cand = ['ぎて', 'いて', 'って', 'んで'].map(mk);
  else throw new Error('unknown ending ' + k);
  return { cls: g === '一段' ? 'g1' : g === 'す' ? 'su' : 'g5', te: [te, rs + sufTe], ta: [ta, rs + ta.slice(stem.length)], wrongTe: cand };
}
const pick = (ans, cands, n = 3) => { const seen = new Set([show(ans)]), out = []; for (const c of cands) { const s = show(c); if (!seen.has(s)) { seen.add(s); out.push(c); } if (out.length === n) break; } if (out.length < n) throw new Error('distractors for ' + show(ans)); return out; };

/* ---- explanations ---- */
function rule(r) {
  const [k, , g, t, te] = r, note = r[8] || '';
  if (t === '撥音便') return `${k} の語尾は ${g}：む・ぶ・ぬ → んで（撥音便），ん 后面的 て 浊化成 で。`;
  if (t === '促音便') return k === '行く' ? `行く 是唯一的例外：く 结尾却不走イ音便，行って（促音便）；行いて 是错的。` : `${k} の語尾は ${g}：う・つ・る → って（促音便）。${note.includes('但是五段') ? k + ' 虽然像一段，但是五段。' : ''}`;
  if (t === 'イ音便') return g === 'ぐ' ? `${k} の語尾は ぐ：ぐ → いで（イ音便），て 要浊化。` : `${k} の語尾は く：く → いて（イ音便），不浊化。`;
  if (t === 'ウ音便') return g === 'い形容詞' ? `${note}：ウ音便，ございます 前面 く 变 う。` : `${k} 是標準語里仅存的动词ウ音便：${te}；${k.slice(0, -1)}って 是错的。`;
  if (g === 'す') return `す 结尾的五段：連用形 ${k.slice(0, -1)}し＋て，不发生音便。`;
  if (g === '一段') return `${k} 是一段：去 る 直接接 て・た，没有音便。${note.includes('借って') ? '借って 是把一段当五段。' : ''}`;
  return k === '来る' ? `来る 是特殊活用：来て・来た，读 きて・きた。` : `${k}：する→して・した，特殊活用，没有音便。`;
}

/* ---- Q1 音便の種類 ---- */
const r1 = rng(20261013), order = VERBS.map((_, i) => i);
for (let j = order.length - 1; j > 0; j--) { const k = Math.floor(r1() * (j + 1)); [order[j], order[k]] = [order[k], order[j]]; }
const chunk = Math.ceil(order.length / 4);
const O1 = order.map((idx, pos) => { const r = VERBS[idx], t = r[3], shown = r[4].replace(/（|）/g, '');
  const others = TYPES.filter(x => x !== t); others.splice(pos % 4, 1);
  return [Math.floor(pos / chunk) + 1, `「${shown}」は、どの音便か。`, [LABEL(t), ...others.map(LABEL)], rule(r), r[0], r[1], gloss(r)]; });

/* ---- Q2 て形 / Q3 た形・たら・たり・ちゃう ---- */
const group = r => r[2] === 'い形容詞' ? 0 : 'むぶぬ'.includes(r[2]) ? 1 : 'うつる'.includes(r[2]) ? 2 : 'くぐ'.includes(r[2]) ? 3 : 4;
const O2 = [], O3 = [];
const verbs = VERBS.map((r, i) => ({ r, i, g: group(r) })).filter(v => v.g).sort((a, b) => a.g - b.g || a.i - b.i);
verbs.forEach((v, n) => {
  const r = v.r, f = forms(r), head = `「${show([r[0], r[1]])}」`;
  O2.push([v.g, `${head}のて形はどれか。`, [f.te, ...pick(f.te, f.wrongTe)].map(show), `${rule(r)} → ${show(f.te)}。`, r[0], r[1], gloss(r)]);
  const kind = r[3] === 'ウ音便' ? n % 3 : n % 4; // 0 た 1 たら 2 たり 3 ちゃう
  const tr = s => kind === 3 ? voice(s, 'ちゃう', 'じゃう') : voice(s, 'た', 'だ') + ['', 'ら', 'り'][kind];
  const ans = f.te.map(tr), ds = pick(ans, f.wrongTe.map(w => w.map(tr)));
  const stem = kind === 0 ? `${head}のた形はどれか。` : kind === 1 ? `${head}＋たら（〜たら、条件）の形はどれか。` : kind === 2 ? `${head}＋たり（〜たり〜たり）の形はどれか。` : `${head}＋ちゃう（〜てしまう の口語）の形はどれか。`;
  const exp = kind === 3 ? `て→ちゃう、で→じゃう：${show(f.te)} → ${show(ans)}。${f.te[0].endsWith('で') ? 'ん・い 后面浊化成 じゃ。' : ''}` : `た形与て形同样音便：${show(f.te)} → ${show(f.ta)}${kind ? '，' + ['', 'たら', 'たり'][kind] + ' 接在た形后面 → ' + show(ans) : ''}。${rule(r)}`;
  O3.push([v.g, stem, [ans, ...ds].map(show), exp, r[0], r[1], gloss(r)]);
});

fs.mkdirSync('src/onbin-quiz/data', { recursive: true });
const write = (f, v, title, rows) => fs.writeFileSync(`src/onbin-quiz/data/${f}.js`, `// 音便 ${title}：由 tools/gen_onbin.cjs 从 src/onbin/data.js VERBS 生成，勿手改。\n// [组, 题干, [正确, 干扰×3], 解析, 語, 読み, 意味 · English]\nconst ${v} = [\n` + rows.map(r => JSON.stringify(r)).join(',\n') + '\n];\n');
write('shurui', 'O1', '音便の種類', O1); write('te', 'O2', 'て形', O2); write('ta', 'O3', 'た形・たら・たり・ちゃう', O3);
console.log(`gen_onbin: ${VERBS.length} rows → shurui:${O1.length} te:${O2.length} ta:${O3.length}`);
