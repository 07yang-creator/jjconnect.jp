#!/usr/bin/env node
/* Checks for the 五段動詞一覧 data (src/doushi-godan/data.js): row shape, 行 valid, sorted by frequency, unique 語＋読み,
   GODAN_META consistent, known traps classified as 五段 (入る・切る・知る・走る・帰る＝返る・要る・減る・喋る・ググる・サボる). */
const fs = require('fs');
const { GODAN, GODAN_META } = new Function(fs.readFileSync('src/doushi-godan/data.js', 'utf8') + ';return {GODAN,GODAN_META};')();
const GYO = new Set(['カ行', 'ガ行', 'サ行', 'タ行', 'ナ行', 'バ行', 'マ行', 'ラ行', 'ワア行']);
let bad = 0;
const shape = GODAN.filter(r => r.length !== 7 || !r[0] || !r[1] || !GYO.has(r[2]) || typeof r[3] !== 'number' || typeof r[4] !== 'number').length;
const sorted = GODAN.every((r, i) => i === 0 || r[3] <= GODAN[i - 1][3]);
const keys = new Set(GODAN.map(r => r[0] + '/' + r[1]));
const ie = GODAN.filter(r => r[5].includes('ie')).length;
console.log(`  godan: ${GODAN.length} rows, bad shape ${shape}, sorted ${sorted}, dup ${GODAN.length - keys.size}, い・え段＋る ${ie}, meta.godan ${GODAN_META.godan}`);
if (shape || !sorted || keys.size !== GODAN.length || GODAN_META.godan !== GODAN.length) bad = 1;
const has = (w, y) => GODAN.some(r => r[0] === w && (!y || r[1] === y));
for (const [w, y] of [['入る', 'はいる'], ['切る', 'きる'], ['知る', 'しる'], ['走る', 'はしる'], ['返る', 'かえる'], ['要る', 'いる'], ['減る', 'へる'], ['喋る', 'しゃべる'], ['ググる', 'ぐぐる'], ['サボる', 'さぼる'], ['書く', 'かく'], ['読む', 'よむ'], ['買う', 'かう'], ['話す', 'はなす'], ['待つ', 'まつ'], ['死ぬ', 'しぬ'], ['飛ぶ', 'とぶ'], ['泳ぐ', 'およぐ'], ['有る', 'ある'], ['成る', 'なる'], ['居る', 'おる'], ['割る', 'わる']]) if (!has(w, y)) { console.log(`  TRAP FAIL: ${w}（${y}） not in 五段 list`); bad = 1; }
for (const [w, y] of [['食べる', 'たべる'], ['見る', 'みる'], ['着る', 'きる'], ['借りる', 'かりる'], ['為る', 'する'], ['来る', 'くる'], ['居る', 'いる'], ['出来る', 'できる'], ['伏せる', 'ふせる']]) if (has(w, y)) { console.log(`  TRAP FAIL: ${w}（${y}） should not be 五段`); bad = 1; }
process.exit(bad);
