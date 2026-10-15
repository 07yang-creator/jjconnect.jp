#!/usr/bin/env node
/* 頻度順ドリル：BCCWJ 频度最高的 100 个五段动词（src/doushi-godan/data.js 的前 100，跳过 於く・御座る・下さる・つく・為さる 五个
   只作机能语或 ます形不规则的词）。按频率复现：越常用的词出的形越多。
     第 1 组 1–20 位  全部 11 形
     第 2 组 21–50 位  7 形（按词轮换）
     第 3 组 51–100 位 4 形（按词轮换）
   形的做法和干扰项复用 tools/gen_katsuyo.cjs。Row: [组（1 基本 2 条件・意志・命令 3 派生）, 题干, [正确, 干扰×3], 解析, 辞書形, 読み, 意味 · English, 頻度順位] */
const fs = require('fs');
const G = require('./gen_katsuyo.cjs');
const { GODAN } = new Function(fs.readFileSync('src/doushi-godan/data.js', 'utf8') + ';return {GODAN};')();
const EXCLUDE = new Set(['於く', '御座る', '下さる', 'つく', '為さる']);
// lemma → [display（辞書形用这个写）, 中文, English]
const W = {
  '有る': ['ある', '有・在', 'be, exist'], '言う': ['言う', '说', 'say'], '成る': ['なる', '成为', 'become'], '思う': ['思う', '想、认为', 'think'], '行く': ['行く', '去', 'go'],
  '因る': ['よる', '依据、由于', 'depend on, be due to'], '仕舞う': ['しまう', '收起；〜てしまう 做完', 'put away; finish'], '持つ': ['持つ', '拿、持有', 'hold, have'], '遣る': ['やる', '做；给', 'do; give'],
  '分かる': ['分かる', '明白', 'understand'], '居る': ['おる', '在（謙譲・方言）', 'be (humble)'], '行う': ['行う', '举行、实施', 'carry out'], '取る': ['取る', '拿、取', 'take'], '使う': ['使う', '使用', 'use'],
  '聞く': ['聞く', '听、问', 'listen, ask'], '知る': ['知る', '知道', 'know'], '置く': ['置く', '放置', 'put'], '入る': ['入る', '进入', 'enter'], '作る': ['作る', '做、制作', 'make'], '出す': ['出す', '拿出、提交', 'take out, submit'],
  '付く': ['付く', '附着、跟随', 'be attached'], '書く': ['書く', '写', 'write'], '貰う': ['もらう', '得到', 'receive'], '頂く': ['いただく', '领受（謙譲）', 'receive (humble)'], '掛かる': ['掛かる', '花费、挂上', 'take (time), hang'],
  '違う': ['違う', '不同、错', 'differ, be wrong'], '変わる': ['変わる', '变化', 'change'], '呼ぶ': ['呼ぶ', '叫、称呼', 'call'], '買う': ['買う', '买', 'buy'], '示す': ['示す', '显示、表示', 'show, indicate'],
  '返る': ['帰る', '回去（返る 归还）', 'go home; return'], '致す': ['いたす', '做（謙譲）', 'do (humble)'], '切る': ['切る', '切、断', 'cut'], '読む': ['読む', '读', 'read'], '立つ': ['立つ', '站、成立', 'stand'],
  '話す': ['話す', '说、谈', 'speak'], '飲む': ['飲む', '喝', 'drink'], '願う': ['願う', '希望、拜托', 'wish, request'], '待つ': ['待つ', '等', 'wait'], '続く': ['続く', '持续', 'continue'], '従う': ['従う', '遵从', 'follow'],
  '乗る': ['乗る', '乘坐', 'ride'], '終わる': ['終わる', '结束', 'end'], '開く': ['開く', '打开、召开', 'open, hold'], '含む': ['含む', '包含', 'include'], '会う': ['会う', '见面', 'meet'], '戻る': ['戻る', '返回', 'return'],
  '歩く': ['歩く', '走路', 'walk'], '当たる': ['当たる', '碰上、相当于', 'hit, apply to'], '図る': ['図る', '谋求', 'aim at, plan'], '向かう': ['向かう', '朝向、前往', 'head for'], '死ぬ': ['死ぬ', '死', 'die'],
  '残る': ['残る', '剩下', 'remain'], '選ぶ': ['選ぶ', '选择', 'choose'], '進む': ['進む', '前进', 'advance'], '始まる': ['始まる', '开始', 'begin'], '走る': ['走る', '跑', 'run'], '関わる': ['関わる', '相关、参与', 'be involved'],
  '働く': ['働く', '工作', 'work'], '送る': ['送る', '送、寄', 'send'], '渡る': ['渡る', '渡过', 'cross'], '起こる': ['起こる', '发生', 'happen'], '基づく': ['基づく', '基于', 'be based on'], '描く': ['描く', '描绘', 'depict, draw'],
  '笑う': ['笑う', '笑', 'laugh'], '済む': ['済む', '完了', 'be settled'], '引く': ['引く', '拉、查', 'pull, look up'], '動く': ['動く', '动', 'move'], '打つ': ['打つ', '打、敲', 'hit, strike'], '守る': ['守る', '遵守、保护', 'keep, protect'],
  '住む': ['住む', '居住', 'live'], '楽しむ': ['楽しむ', '享受', 'enjoy'], '頑張る': ['頑張る', '努力', "do one's best"], '気付く': ['気づく', '察觉', 'notice'], '異なる': ['異なる', '不同', 'differ'], '上がる': ['上がる', '上升', 'rise'],
  '伴う': ['伴う', '伴随', 'accompany'], '成す': ['なす', '做成、构成', 'form, accomplish'], '探す': ['探す', '寻找', 'look for'], '語る': ['語る', '讲述', 'tell, narrate'], '残す': ['残す', '留下', 'leave behind'], '至る': ['至る', '到达', 'reach, lead to'],
  '合う': ['合う', '合适、相合', 'fit, match'], '無くなる': ['なくなる', '消失、没了', 'disappear, run out'], '限る': ['限る', '限于', 'limit'], '経つ': ['経つ', '（时间）经过', 'pass (time)'], '座る': ['座る', '坐', 'sit'],
  '表わす': ['表す', '表示、表达', 'express'], '遊ぶ': ['遊ぶ', '玩', 'play'], '起こす': ['起こす', '引起、叫醒', 'cause, wake'], '決まる': ['決まる', '决定', 'be decided'], '殺す': ['殺す', '杀', 'kill'], '驚く': ['驚く', '吃惊', 'be surprised'],
  '困る': ['困る', '为难', 'be troubled'], '除く': ['除く', '除去', 'remove, except'], '思い出す': ['思い出す', '想起', 'recall'], '繰り返す': ['繰り返す', '重复', 'repeat'], '失う': ['失う', '失去', 'lose'], '売る': ['売る', '卖', 'sell'], '通す': ['通す', '通过、穿过', 'pass through'] };
const top = GODAN.filter(r => !EXCLUDE.has(r[0])).slice(0, 100);
const missing = top.filter(r => !W[r[0]]).map(r => r[0]); if (missing.length) { console.error('no gloss for: ' + missing.join('、')); process.exit(1); }
const verbs = top.map((r, i) => { const [disp, zh, en] = W[r[0]]; return { k: disp, r: r[1], cls: disp === 'ある' ? 'aru' : 'g5', m: `${zh} · ${en}`, rank: i + 1, freq: r[3] }; });
const FNAME = Object.fromEntries(G.FORMS);
const LV = { masu: 1, nai: 1, te: 1, ta: 1, katei: 2, ishi: 2, meirei: 2, kanou: 3, ukemi: 3, shieki: 3, shiekiukemi: 3 };
const BANDS = [[1, 20, 11], [21, 50, 7], [51, 100, 4]];
const sets = BANDS.map(() => []);
verbs.forEach((v, i) => {
  const b = BANDS.findIndex(([lo, hi]) => v.rank >= lo && v.rank <= hi), n = BANDS[b][2];
  const forms = n === 11 ? G.ALLF : Array.from({ length: n }, (_, j) => G.ALLF[(i * 3 + j) % 11]);
  for (const f of forms) {
    const ans = G.form(v, f); if (!ans) continue;
    const seen = new Set([ans.r]), ds = [];
    for (const w of G.wrongs(v, f)) { if (!seen.has(w.r) && w.k !== ans.k) { seen.add(w.r); ds.push(w); } if (ds.length === 3) break; }
    for (const g of G.ALLF) { if (ds.length === 3) break; if (g === f) continue; const w = G.form(v, g); if (w && !seen.has(w.r)) { seen.add(w.r); ds.push(w); } }
    if (ds.length < 3) throw new Error(`distractors: ${v.k} ${f}`);
    sets[b].push([LV[f], `「${G.show(v)}」の${FNAME[f]}はどれか。`, [ans, ...ds].map(G.show), G.explain(v, f, G.show(ans)), v.k, v.r, v.m, v.rank]);
  }
});
sets.forEach(s => s.sort((a, b) => a[0] - b[0] || a[7] - b[7]));
fs.mkdirSync('src/doushi-drill/data', { recursive: true });
sets.forEach((rows, i) => fs.writeFileSync(`src/doushi-drill/data/freq${i + 1}.js`, `// 頻度順ドリル 第${i + 1}组（五段 ${BANDS[i][0]}–${BANDS[i][1]} 位，每词 ${BANDS[i][2]} 形）：由 tools/gen_godan_drill.cjs 生成，勿手改。\n// [组, 题干, [正确, 干扰×3], 解析, 辞書形, 読み, 意味, 頻度順位]\nconst FQ${i + 1} = [\n` + rows.map(r => JSON.stringify(r)).join(',\n') + '\n];\n'));
console.log(`gen_godan_drill: ${verbs.length} verbs → ${sets.map((s, i) => `freq${i + 1}:${s.length}`).join(' ')} (last verb ${verbs[99].k})`);
