#!/usr/bin/env node
/* Generate the 動詞活用 drill bank: every form of every verb in the material
   (src/doushi/data.js VERBS + the 124 pairs of src/jita/map.html), with distractors that are the real wrong formations
   (ら抜き, さ入れ, wrong 音便, 五段/一段 rule swapped). Deterministic. Output: src/doushi-drill/data/<form>.js (const F_<form>).
   Row: [level, stem, [correct, d1, d2, d3], explanation, 辞書形, 読み, ""] */
const fs = require('fs');
const data = new Function(fs.readFileSync('src/doushi/data.js', 'utf8') + ';return {VERBS,PAIRS};')();
const RAW = fs.readFileSync('src/jita/map.html', 'utf8').match(/const RAW = `([\s\S]*?)`;/)[1];
const GODAN_RU = new Set(['入る', '減る', '切る', '散る', '照る', '返る', '帰る', '千切る', '走る', '知る', '要る', '限る', '蹴る', '滑る', '喋る', '握る', '混じる', '参る', '焦る', '戻る', '擦る']);
const I_ROW = 'いきしちにひみりぎじぢびぴ', E_ROW = 'えけせてねへめれげぜでべぺ';
const ROWS = { 'う': 'わいうえお', 'く': 'かきくけこ', 'ぐ': 'がぎぐげご', 'す': 'さしすせそ', 'つ': 'たちつてと', 'ぬ': 'なにぬねの', 'ぶ': 'ばびぶべぼ', 'む': 'まみむめも', 'る': 'らりるれろ' };
const looksIchidan = r => r.endsWith('る') && r.length >= 2 && (I_ROW.includes(r[r.length - 2]) || E_ROW.includes(r[r.length - 2]));

/* ---- verb list ---- */
const verbs = []; const seen = new Set();
const add = (k, r, cls, src) => { if (seen.has(k)) return; seen.add(k); verbs.push({ k, r, cls, src }); };
for (const row of data.VERBS) {
  const [k, r, type] = row;
  if (k === 'ある') add(k, r, 'aru', 'v'); else if (k === 'する') add(k, r, 'suru', 'v'); else if (k.startsWith('〜する')) add('勉強する', 'べんきょうする', 'suru', 'v');
  else if (k === '来る') add(k, r, 'kuru', 'v'); else if (k === 'くれる') add(k, r, 'kureru', 'v');
  else if (type === '一段') add(k, r, 'g1', 'v'); else add(k, r, 'g5', 'v');
}
for (const l of RAW.trim().split('\n')) { const [, jk, jr, tk, tr] = l.split('|'); for (const [k, r] of [[jk, jr], [tk, tr]]) add(k, r, GODAN_RU.has(k) ? 'g5' : looksIchidan(r) ? 'g1' : 'g5', 'p'); }
const level = v => v.cls === 'g5' ? (looksIchidan(v.r) ? 3 : 1) : v.cls === 'g1' ? 2 : 4;
verbs.sort((a, b) => level(a) - level(b));

/* ---- forms ---- */
const g5 = (s, f) => { const last = s[s.length - 1], base = s.slice(0, -1), row = ROWS[last] || 'らりるれろ'; return f({ s, last, base, a: base + row[0], i: base + row[1], e: base + row[3], o: base + row[4] }); };
const onbin = (s, t) => g5(s, ({ last, base, s }) => (s.endsWith('行く') || s === 'いく') ? base + 'っ' + t : 'うつる'.includes(last) ? base + 'っ' + t : 'むぶぬ'.includes(last) ? base + 'ん' + (t === 'て' ? 'で' : 'だ') : last === 'く' ? base + 'い' + t : last === 'ぐ' ? base + 'い' + (t === 'て' ? 'で' : 'だ') : base + 'し' + t);
const G5 = {
  masu: s => g5(s, x => x.i + 'ます'), nai: s => g5(s, x => x.a + 'ない'), te: s => onbin(s, 'て'), ta: s => onbin(s, 'た'),
  ishi: s => g5(s, x => x.o + 'う'), meirei: s => g5(s, x => x.e), katei: s => g5(s, x => x.e + 'ば'), kanou: s => g5(s, x => x.e + 'る'),
  ukemi: s => g5(s, x => x.a + 'れる'), shieki: s => g5(s, x => x.a + 'せる'), shiekiukemi: s => g5(s, x => x.last === 'す' ? x.a + 'せられる' : x.a + 'される') };
const G1 = { masu: s => s.slice(0, -1) + 'ます', nai: s => s.slice(0, -1) + 'ない', te: s => s.slice(0, -1) + 'て', ta: s => s.slice(0, -1) + 'た', ishi: s => s.slice(0, -1) + 'よう', meirei: s => s.slice(0, -1) + 'ろ', katei: s => s.slice(0, -1) + 'れば', kanou: s => s.slice(0, -1) + 'られる', ukemi: s => s.slice(0, -1) + 'られる', shieki: s => s.slice(0, -1) + 'させる', shiekiukemi: s => s.slice(0, -1) + 'させられる' };
const SURU = { masu: 'します', nai: 'しない', te: 'して', ta: 'した', ishi: 'しよう', meirei: 'しろ', katei: 'すれば', kanou: 'できる', ukemi: 'される', shieki: 'させる', shiekiukemi: 'させられる' };
const KURU = { masu: ['来ます', 'きます'], nai: ['来ない', 'こない'], te: ['来て', 'きて'], ta: ['来た', 'きた'], ishi: ['来よう', 'こよう'], meirei: ['来い', 'こい'], katei: ['来れば', 'くれば'], kanou: ['来られる', 'こられる'], ukemi: ['来られる', 'こられる'], shieki: ['来させる', 'こさせる'], shiekiukemi: ['来させられる', 'こさせられる'] };
const ARU = { masu: 'あります', nai: 'ない', te: 'あって', ta: 'あった', meirei: 'あれ', katei: 'あれば' };
const KURERU = { masu: 'くれます', nai: 'くれない', te: 'くれて', ta: 'くれた', ishi: 'くれよう', meirei: 'くれ', katei: 'くれれば' };
function form(v, f) {
  if (v.cls === 'g5') return { k: G5[f](v.k), r: G5[f](v.r) };
  if (v.cls === 'g1') return { k: G1[f](v.k), r: G1[f](v.r) };
  if (v.cls === 'suru') { const P = v.k.slice(0, -2), p = v.r.slice(0, -2); return { k: P + SURU[f], r: p + SURU[f] }; }
  if (v.cls === 'kuru') return { k: KURU[f][0], r: KURU[f][1] };
  if (v.cls === 'aru') return ARU[f] ? { k: ARU[f], r: ARU[f] } : null;
  if (v.cls === 'kureru') return KURERU[f] ? { k: KURERU[f], r: KURERU[f] } : null;
}
/* ---- wrong formations (candidate lists, applied to kanji and kana alike) ---- */
const both = (v, fn) => { const k = fn(v.k), r = fn(v.r); return { k, r }; };
function wrongs(v, f) {
  const c = v.cls, L = [];
  const W = fn => L.push(both(v, fn));
  if (c === 'g5') {
    const last = v.r[v.r.length - 1];
    const tri = { masu: [x => x.a + 'ます', x => x.e + 'ます', x => x.base + 'ます'], nai: [x => x.base + 'ない', x => x.i + 'ない', x => x.e + 'ない'],
      ishi: [x => x.base + 'よう', x => x.a + 'う', x => x.i + 'よう'], meirei: [x => x.base + 'ろ', x => x.i, x => x.e + 'ろ'], katei: [x => x.s + 'ば', x => x.i + 'ば', x => x.e + 'れば'],
      kanou: [x => x.a + 'れる', x => x.base + 'られる', x => x.e + 'られる'], ukemi: [x => x.e + 'る', x => x.e + 'られる', x => x.base + 'られる'],
      shieki: [x => x.a + 'させる', x => x.i + 'させる', x => x.base + 'させる'],
      shiekiukemi: last === 'す' ? [x => x.a + 'される', x => x.a + 'れさせる', x => x.e + 'させられる'] : [x => x.a + 'さされる', x => x.a + 'れさせる', x => x.e + 'させられる'] };
    if (tri[f]) tri[f].forEach(fn => W(s => g5(s, fn)));
    else { const t = f === 'te' ? 'て' : 'た', d = f === 'te' ? 'で' : 'だ';
      const all = [x => x.base + 'っ' + t, x => x.base + 'ん' + d, x => x.base + 'い' + t, x => x.base + 'い' + d, x => x.base + 'し' + t, x => x.i + t];
      all.forEach(fn => W(s => g5(s, fn))); }
  } else if (c === 'g1') {
    const st = s => s.slice(0, -1);
    const tri = { masu: ['ります', 'るます', 'えます'], nai: ['らない', 'るない', 'れない'], te: ['って', 'いて', 'んで'], ta: ['った', 'いた', 'んだ'], ishi: ['ろう', 'るよう', 'おう'],
      meirei: ['れ', '', 'るろ'], katei: ['れ', 'るば', 'りば'], kanou: ['れる', 'えられる', 'れられる'], ukemi: ['れる', 'らる', 'される'], shieki: ['せる', 'らせる', 'させれる'], shiekiukemi: ['される', 'さされる', 'られさせる'] };
    tri[f].forEach(suf => W(s => st(s) + suf));
  } else if (c === 'suru') {
    const P = v.k.slice(0, -2), p = v.r.slice(0, -2);
    const tri = { masu: ['すります', 'しります', 'するます'], nai: ['すない', 'しらない', 'さない'], te: ['すて', 'しって', 'すって'], ta: ['すた', 'しった', 'すった'], ishi: ['すろう', 'しろう', 'すよう'], meirei: ['すれ', 'しれ', 'すろ'], katei: ['しれば', 'するば', 'せば'], kanou: ['すれる', 'しられる', 'できられる'], ukemi: ['すられる', 'しられる', 'せられる'], shieki: ['しさせる', 'すせる', 'させれる'], shiekiukemi: ['さされる', 'させれる', 'されさせる'] };
    tri[f].forEach(suf => L.push({ k: P + suf, r: p + suf }));
  } else if (c === 'kuru') {
    const tri = { masu: [['来ります', 'くります'], ['来ます', 'こます'], ['来るます', 'くるます']], nai: [['来ない', 'きない'], ['来ない', 'くない'], ['来らない', 'くらない']], te: [['来て', 'くて'], ['来て', 'こて'], ['来って', 'きって']], ta: [['来た', 'くた'], ['来た', 'こた'], ['来った', 'きった']],
      ishi: [['来よう', 'きよう'], ['来ろう', 'くろう'], ['来よう', 'くよう']], meirei: [['来ろ', 'くろ'], ['来ろ', 'きろ'], ['来れ', 'くれ']], katei: [['来れば', 'これば'], ['来れば', 'きれば'], ['来るば', 'くるば']],
      kanou: [['来れる', 'これる'], ['来られる', 'きられる'], ['来れる', 'くれる']], ukemi: [['来られる', 'きられる'], ['来られる', 'くられる'], ['来れる', 'これる']], shieki: [['来させる', 'きさせる'], ['来らせる', 'くらせる'], ['来さす', 'こさす']], shiekiukemi: [['来させられる', 'きさせられる'], ['来される', 'こされる'], ['来らされる', 'くらされる']] };
    tri[f].forEach(([k, r]) => L.push({ k, r }));
  } else if (c === 'aru') {
    const tri = { masu: ['あるます', 'あらます', 'ありです'], nai: ['あらない', 'あるない', 'ありない'], te: ['ありて', 'あいて', 'あんで'], ta: ['ありた', 'あいた', 'あんだ'], meirei: ['あり', 'あら', 'あるろ'], katei: ['あるば', 'ありば', 'あらば'] };
    (tri[f] || []).forEach(s => L.push({ k: s, r: s }));
  } else if (c === 'kureru') {
    const tri = { masu: ['くれります', 'くれるます', 'くります'], nai: ['くれらない', 'くれるない', 'くらない'], te: ['くれって', 'くりて', 'くれいて'], ta: ['くれった', 'くりた', 'くれいた'], ishi: ['くれろう', 'くれるよう', 'くろう'], meirei: ['くれれ', 'くれよう', 'くれい'], katei: ['くれば', 'くれるば', 'くれりば'] };
    (tri[f] || []).forEach(s => L.push({ k: s, r: s }));
  }
  return L;
}
const show = w => w.k === w.r ? w.k : `${w.k}（${w.r}）`;
const FORMS = [['masu', 'ます形'], ['nai', 'ない形'], ['te', 'て形'], ['ta', 'た形'], ['ishi', '意志形'], ['meirei', '命令形'], ['katei', '仮定形（〜ば）'], ['kanou', '可能形'], ['ukemi', '受身形'], ['shieki', '使役形'], ['shiekiukemi', '使役受身形']];
const ALLF = FORMS.map(f => f[0]);
/* ---- explanations ---- */
function explain(v, f, c) {
  const cls = v.cls, lv = level(v), st = v.k.slice(0, -1);
  const ex = lv === 3 ? '（る前虽是 i／e 段，但它是五段，不能直接去る）' : '';
  const g5x = s => g5(v.k, s);
  const E = {
    masu: { g5: `五段：連用形（い段）＋ます → ${c}${ex}。あ段「${g5x(x => x.a)}ます」、え段「${g5x(x => x.e)}ます」都不对。`, g1: `一段：去る＋ます → ${c}。「${st}ります」是把一段当成了五段。`, suru: `する→します。`, kuru: `来る→来ます（きます），連用形读 き。`, aru: `ある→あります。`, kureru: `くれる 是一段：くれます。` },
    nai: { g5: `五段：未然形（あ段）＋ない → ${c}${ex}${v.r.endsWith('う') ? '；う段动词的未然形是わ' : ''}。`, g1: `一段：去る＋ない → ${c}。「${st}らない」是五段的做法。`, suru: `する→しない。`, kuru: `来る→来ない（こない），未然形读 こ。`, aru: `ある的否定是特殊形「ない」，不说 あらない。`, kureru: `くれる→くれない（一段）。` },
    te: { g5: `五段て形的音便：く→いて、ぐ→いで、う・つ・る→って、む・ぶ・ぬ→んで、す→して（行く 例外→行って） → ${c}。`, g1: `一段：去る＋て → ${c}，没有音便。`, suru: `する→して。`, kuru: `来る→来て（きて）。`, aru: `ある→あって（促音便）。`, kureru: `くれる→くれて（一段）。` },
    ta: { g5: `五段た形与て形同样音便：く→いた、ぐ→いだ、う・つ・る→った、む・ぶ・ぬ→んだ、す→した（行く→行った） → ${c}。`, g1: `一段：去る＋た → ${c}。`, suru: `する→した。`, kuru: `来る→来た（きた）。`, aru: `ある→あった。`, kureru: `くれる→くれた。` },
    ishi: { g5: `五段：お段＋う → ${c}${ex}。`, g1: `一段：去る＋よう → ${c}。「${st}ろう」是五段的做法。`, suru: `する→しよう。`, kuru: `来る→来よう（こよう）。`, kureru: `くれる→くれよう。` },
    meirei: { g5: `五段：命令形＝え段 → ${c}${ex}。`, g1: `一段：去る＋ろ → ${c}（书面也可用 よ）。「${st}れ」是仮定形，不是命令。`, suru: `する→しろ（书面 せよ）。`, kuru: `来る→来い（こい）。`, aru: `ある→あれ。`, kureru: `くれる 的命令形是特殊形「くれ」。` },
    katei: { g5: `五段：え段＋ば → ${c}${ex}。`, g1: `一段：去る＋れば → ${c}。`, suru: `する→すれば。`, kuru: `来る→来れば（くれば）。`, aru: `ある→あれば。`, kureru: `くれる→くれれば。` },
    kanou: { g5: `五段：え段＋る → ${c}${ex}；あ段＋れる「${g5x(x => x.a)}れる」是受身形。`, g1: `一段：去る＋られる → ${c}（与受身同形）。「${st}れる」是ら抜き（口语），文书里不用。`, suru: `する 的可能形是 できる。`, kuru: `来る→来られる（こられる）；来れる 是ら抜き。` },
    ukemi: { g5: `五段：あ段＋れる → ${c}${ex}；え段＋る「${g5x(x => x.e)}る」是可能形。`, g1: `一段：去る＋られる → ${c}（与可能同形）；「${st}れる」是ら抜きの可能形，不能表受身。`, suru: `する→される。`, kuru: `来る→来られる（こられる）。` },
    shieki: { g5: `五段：あ段＋せる → ${c}${ex}；「${g5x(x => x.a)}させる」是さ入れ（多了さ）。`, g1: `一段：去る＋させる → ${c}。「${st}せる」少了さ。`, suru: `する→させる。`, kuru: `来る→来させる（こさせる）。` },
    shiekiukemi: { g5: v.r.endsWith('す') ? `す结尾的五段：使役「${g5x(x => x.a)}せる」＋られる → ${c}，不能缩成「${g5x(x => x.a)}される」。` : `五段：使役「${g5x(x => x.a)}せる」＋られる＝${g5x(x => x.a)}せられる，口语缩成 ${c}（す结尾不能缩）。`, g1: `一段：去る＋させられる → ${c}。`, suru: `する→させられる。`, kuru: `来る→来させられる（こさせられる）。` } };
  return (E[f][cls] || E[f].g5);
}
/* ---- build ---- */
const out = {}; ALLF.forEach(f => out[f] = []);
for (const v of verbs) for (const [f, fname] of FORMS) {
  const ans = form(v, f); if (!ans) continue;
  const seenR = new Set([ans.r]); const ds = [];
  for (const w of wrongs(v, f)) { if (!seenR.has(w.r) && w.k !== ans.k) { seenR.add(w.r); ds.push(w); } if (ds.length === 3) break; }
  for (const g of ALLF) { if (ds.length === 3) break; if (g === f) continue; const w = form(v, g); if (w && !seenR.has(w.r)) { seenR.add(w.r); ds.push(w); } }
  if (ds.length < 3) throw new Error(`distractors: ${v.k} ${f}`);
  const stem = `「${v.k === v.r ? v.k : v.k + '（' + v.r + '）'}」の${fname}はどれか。`;
  out[f].push([level(v), stem, [ans, ...ds].map(show), explain(v, f, show(ans)), v.k, v.r, '']);
}
fs.mkdirSync('src/doushi-drill/data', { recursive: true });
for (const [f, fname] of FORMS) fs.writeFileSync(`src/doushi-drill/data/${f}.js`, `// 動詞活用ドリル ${fname}：由 tools/gen_katsuyo.cjs 从 活用表＋自他对 生成，勿手改。\n// [组, 题干, [正确, 干扰×3], 解析, 辞書形, 読み, ""]\nconst F_${f} = [\n` + out[f].map(r => JSON.stringify(r)).join(',\n') + '\n];\n');
const lv = {}; verbs.forEach(v => lv[level(v)] = (lv[level(v)] || 0) + 1);
console.log(`gen_katsuyo: ${verbs.length} verbs (levels ${JSON.stringify(lv)}) → ${ALLF.map(f => f + ':' + out[f].length).join(' ')}`);
