#!/usr/bin/env node
/* assemble.cjs <meta.json> <out.html> <js files...>
   Fills src/_engine/shell.html ({{TITLE}}, {{H1}}) and appends the data/config files, the shared engine and the footer. */
const fs = require('fs');
const [meta, out, ...files] = process.argv.slice(2);
const m = JSON.parse(fs.readFileSync(meta, 'utf8'));
let html = fs.readFileSync('src/_engine/shell.html', 'utf8').replace(/{{TITLE}}/g, m.title).replace(/{{H1}}/g, m.h1);
html += files.map(f => fs.readFileSync(f, 'utf8')).join('\n') + fs.readFileSync('src/_engine/quiz.js', 'utf8') + '</script>\n</body>\n</html>\n';
fs.writeFileSync(out, html);
