#!/usr/bin/env node
/* Build src/doushi/jita_index.js: 辞書形 → [自|他, 対になる相手] from the 124 pairs of src/jita/map.html (const RAW)
   plus the 型「対」rows of PAIRS in src/doushi/data.js. The verb table marks 自／他 on the 類 column with it. */
const fs = require('fs');
const RAW = fs.readFileSync('src/jita/map.html', 'utf8').match(/const RAW = `([\s\S]*?)`;/)[1];
const { PAIRS } = new Function(fs.readFileSync('src/doushi/data.js', 'utf8') + ';return {PAIRS};')();
const idx = {};
for (const l of RAW.trim().split('\n')) { const [, ji, , ta] = l.split('|'); if (ji && ta) { idx[ji] = idx[ji] || ['自', ta]; idx[ta] = idx[ta] || ['他', ji]; } }
for (const r of PAIRS) if (r[6] === '対') { idx[r[0]] = idx[r[0]] || ['自', r[2]]; idx[r[2]] = idx[r[2]] || ['他', r[0]]; }
fs.writeFileSync('src/doushi/jita_index.js', `// 自他対の索引（由 tools/gen_jita_index.cjs 从 jita/map.html 的 124 对＋data.js PAIRS 的 対 行生成，勿手改）：辞書形 → [自|他, 相手]\nconst JITA=${JSON.stringify(idx)};\n`);
console.log(`gen_jita_index: ${Object.keys(idx).length} verbs`);
