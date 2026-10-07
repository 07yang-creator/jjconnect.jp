// Turn a content file into search records: { text, label, link, key, gloss }
//
//   text  — what we match and snippet
//   label — where inside the page it is ("三、转折・让步", "第 42 题")
//   link  — extra query string so the viewer can jump there ("n=42"); may be ''
//   key   — the headword this record defines ("ただし"), when the page says so.
//           A query equal to a key is a word lookup and ranks as an entry.
//   gloss — one-line meaning shown beside the headword
//
// Three paths, in order of precision:
//
// 1. A page may declare where its data lives:
//      <script type="application/json" id="jp-search">
//      {"var":"Q","label":"第 {i} 题","link":"n={i}"}
//      </script>
//    `key` / `gloss` / `ex` are indexes into each row — `ex` may be a list, e.g.
//    {"var":"SECTIONS","key":0,"gloss":3,"ex":[4,5]} for headword, meaning and
//    the example sentence with its translation.
//    We then parse that JS array literal (JSON-compatible data, comments and
//    trailing commas tolerated) and make one record per innermost row. This is
//    how an interactive page that renders from JS stays searchable.
// 2. Otherwise the visible text, one record per block element, labelled by the
//    nearest preceding heading. Table rows stay whole (cells joined).
// 3. Plus, from <script> bodies, any line holding CJK string literals — the
//    common shape of a Claude-built single-file page that renders from an array.
//    Deduped against path 2, so a server-rendered page gains nothing noisy.

const MAX_RECORDS = 3000;
const MAX_TEXT = 600;

// Bump when extraction changes shape — stored indexes with an older version are
// ignored and rebuilt, so a better extractor reaches old uploads too.
export const INDEX_VERSION = 4;

// A single-file page built by Claude keeps its content in top-level arrays
// (often several: Q, Q2, Q3). We find every all-caps data array and merge them,
// which gives real per-row records instead of a soup of strings.
const DECL = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\[/g;
const NAMED_GUESS = /^(q|qs|questions|items|data|sections?|secs?|rows|list|words|entries|cards|table|grammar|vocab|points|notes)\d*$/i;
// styling and code strings that are not study content
const NOISE = /var\(--|rgba?\(|#[0-9a-fA-F]{3,8}\b|=>|function\s*\(|document\.|querySelector|classList|localStorage/;

/* ---------------- entities + tags ---------------- */

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ensp: ' ', emsp: ' ', thinsp: ' ', middot: '·', hellip: '…', mdash: '—', ndash: '–', times: '×', copy: '©', reg: '®', deg: '°', laquo: '«', raquo: '»', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’' };

export function decodeEntities(s) {
  return String(s).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]{1,31});/g, (m, g) => {
    if (g[0] === '#') {
      const code = g[1] === 'x' || g[1] === 'X' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
    }
    return NAMED[g] ?? NAMED[g.toLowerCase()] ?? m;
  });
}

const CJK = /[぀-ヿ㐀-䶿一-鿿豈-﫿ｦ-ﾟ]/;
const hasCJK = (s) => CJK.test(s);

function clean(text) {
  return decodeEntities(text)
    // control characters would collide with the highlighter's sentinels
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ')
    .replace(/[\t 　 ]+/g, ' ')
    .trim();
}

function usable(s) {
  if (!s) return false;
  const t = s.trim();
  if (t.length < 2) return false;
  // drop pure punctuation / separators
  return /[\p{L}\p{N}]/u.test(t);
}

/* ---------------- 1. declared data ---------------- */

export function readHint(html) {
  const m = html.match(/<script[^>]+type=["']application\/json["'][^>]*id=["']jp-search["'][^>]*>([\s\S]*?)<\/script>/i)
    || html.match(/<script[^>]+id=["']jp-search["'][^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return null;
  try {
    const h = JSON.parse(m[1]);
    return h && typeof h === 'object' && typeof h.var === 'string' ? h : null;
  } catch {
    return null;
  }
}

// Scan a JS array literal starting at `[`, returning JSON-safe source: strips
// // and /* */ comments and trailing commas, re-quotes strings, and quotes bare
// object keys ({t:"…"} is normal in hand-written data but is not JSON).
const MAX_LITERAL = 6 * 1024 * 1024;

function sliceArrayLiteral(src, start) {
  let depth = 0, i = start;
  const parts = [];            // token list, so dropping a trailing comma is O(1)
  const stack = [];
  const dropTrailingComma = () => {
    while (parts.length && /^\s*$/.test(parts[parts.length - 1])) parts.pop();
    if (parts.length && parts[parts.length - 1] === ',') parts.pop();
  };
  while (i < src.length) {
    if (i - start > MAX_LITERAL) return null;
    const c = src[i];
    if (stack[stack.length - 1] === '{' && /[A-Za-z_$]/.test(c)) {
      let j = i;
      while (j < src.length && /[\w$]/.test(src[j])) j++;
      const word = src.slice(i, j);
      let k = j;
      while (k < src.length && /\s/.test(src[k])) k++;
      if (src[k] === ':') { parts.push(JSON.stringify(word), ':'); i = k + 1; continue; }
      parts.push(word); i = j; continue;      // true / false / null pass through
    }
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      let s = i + 1, str = '';
      while (s < src.length) {
        if (src[s] === '\\') { str += src[s] + src[s + 1]; s += 2; continue; }
        if (src[s] === quote) break;
        str += src[s++];
      }
      if (s >= src.length) return null; // unterminated
      // re-emit as a JSON double-quoted string
      parts.push(JSON.stringify(unescapeJs(str, quote)));
      i = s + 1;
      continue;
    }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); if (e < 0) return null; i = e + 2; continue; }
    if (c === '[' || c === '{') { depth++; stack.push(c); parts.push(c); i++; continue; }
    if (c === ']' || c === '}') {
      depth--;
      stack.pop();
      dropTrailingComma();
      parts.push(c);
      i++;
      if (depth === 0) return parts.join('');
      continue;
    }
    parts.push(c);
    i++;
  }
  return null;
}

function unescapeJs(str, quote) {
  return str.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (m, g) => {
    if (g[0] === 'u' && g[1] === '{') return String.fromCodePoint(parseInt(g.slice(2, -1), 16));
    if (g[0] === 'u') return String.fromCharCode(parseInt(g.slice(1), 16));
    if (g[0] === 'x') return String.fromCharCode(parseInt(g.slice(1), 16));
    return { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', '0': '\0' }[g] ?? g;
  });
}

export function parseDeclaredArray(src, varName) {
  if (!/^[A-Za-z_$][\w$]*$/.test(varName)) return null;
  const re = new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*\\[`);
  const m = re.exec(src);
  if (!m) return null;
  const json = sliceArrayLiteral(src, m.index + m[0].length - 1);
  if (!json) return null;
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

const scalar = (v) => v === null || ['string', 'number', 'boolean'].includes(typeof v);
const scalarish = (v) => scalar(v) || (Array.isArray(v) && v.every(scalar));
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const values = (x) => (Array.isArray(x) ? x : Object.values(x));

// A row is the innermost array OR object whose fields are all plain values.
function isLeafRow(x) {
  if (!x || typeof x !== 'object') return false;
  const v = values(x);
  return v.length > 0 && v.every(scalarish) && v.some((s) => typeof s === 'string' && s.trim());
}

function rowStrings(row) {
  if (isObj(row)) {
    const out = [];
    for (const [k, v] of Object.entries(row)) {
      if (SKIP_KEYS.test(k)) continue;
      if (typeof v === 'string') out.push(v);
      else if (Array.isArray(v)) for (const x of v) if (typeof x === 'string') out.push(x);
    }
    return out;
  }
  const out = [];
  for (const v of values(row)) {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) for (const x of v) if (typeof x === 'string') out.push(x);
  }
  return out;
}

// For a container, the string that best names it — used to locate its children.
const LABEL_KEYS = ['t', 'title', 'name', 'h', 'head', 'heading', 'label', 'cat', 'group', 'topic'];
// plumbing, not study content
const SKIP_KEYS = /^(id|key|slug|cls|class|icon|color|colour|href|url|src|img|image|anchor|ref|uid)$/i;
const contentFields = (obj) =>
  Object.entries(obj).filter(([k, v]) => typeof v === 'string' && v.trim() && !SKIP_KEYS.test(k)).map(([, v]) => v);
function ownLabel(node) {
  if (isObj(node)) {
    for (const k of LABEL_KEYS) if (typeof node[k] === 'string' && node[k].trim()) return node[k];
  }
  const s = values(node).filter((v) => typeof v === 'string' && v.trim());
  return s.length ? s[0] : '';
}

function flattenRows(node, ancestors, out, depth = 0) {
  if (!node || typeof node !== 'object' || out.length >= MAX_RECORDS || depth > 12) return;
  values(node).forEach((child, idx) => {
    if (out.length >= MAX_RECORDS || !child || typeof child !== 'object') return;
    if (isLeafRow(child)) {
      out.push({ row: child, strings: rowStrings(child), ancestors, i: idx + 1 });
      return;
    }
    const label = ownLabel(child);
    // a container's own plain fields are content too (an entry's title + lead-in)
    if (isObj(child)) {
      const own = contentFields(child);
      if (own.length) out.push({ row: child, strings: own, ancestors, i: idx + 1 });
    }
    flattenRows(child, label ? [...ancestors, label] : ancestors, out, depth + 1);
  });
}

// hint.key / hint.gloss are indexes into the row; a value that is itself an
// array is joined, so {"key":0} works whether row[0] is a string or a list.
function atIndex(row, idx) {
  if (idx === undefined || idx === null || !row || typeof row !== 'object') return '';
  if (Array.isArray(idx)) return idx.map((k) => atIndex(row, k)).filter(Boolean).join('　');
  const v = row[idx];
  if (typeof v === 'string') return clean(v);
  if (Array.isArray(v)) return clean(v.filter((x) => typeof x === 'string').join(' '));
  return '';
}

const SAFE_LINK = /^[a-z][a-z0-9_]{0,15}=[A-Za-z0-9._-]{1,32}$/i;

function fill(tpl, vars) {
  return String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : ''));
}

function recordsFromHint(html, hint) {
  const rows = parseDeclaredArray(html, hint.var);
  if (!rows) return null;
  const flat = [];
  if (isLeafRow(rows)) flat.push({ row: rows, strings: rowStrings(rows), ancestors: [], i: 1 });
  else flattenRows(rows, [], flat);
  if (!flat.length) return null;
  return flat
    .map(({ row, strings, ancestors, i }) => {
      const vars = { i, a: ancestors[ancestors.length - 1] || '', A: ancestors.join(' · ') };
      const link = fill(hint.link || '', vars);
      return {
        text: clean(strings.join('  ')).slice(0, MAX_TEXT),
        label: (clean(fill(hint.label || '{A}', vars)) || clean(ancestors.join(' · '))).slice(0, 80),
        // the hint comes from an uploaded file, so the jump must be a plain param
        link: SAFE_LINK.test(link) ? link : '',
        key: atIndex(row, hint.key).slice(0, 60),
        gloss: atIndex(row, hint.gloss).slice(0, 160),
        ex: atIndex(row, hint.ex).slice(0, 220),
      };
    })
    .filter((r) => usable(r.text));
}

/* ---------------- 2+3. generic HTML ---------------- */

const SEP = '\u0000';
const H_OPEN = '\u0001';
const H_CLOSE = '\u0002';

// Walk raw-text elements instead of matching them with a lazy regex: on a file
// full of unclosed <script> tags a lazy match rescans to EOF from every start,
// which is quadratic — 500 KB took 4 s, and an upload is allowed 3.5 MB.
const RAW_OPEN = /<(script|style|noscript|template|svg|head)\b/g;

export function stripRawText(s) {
  const low = s.toLowerCase();
  let out = '', last = 0, m;
  RAW_OPEN.lastIndex = 0;
  while ((m = RAW_OPEN.exec(low))) {
    if (m.index < last) { RAW_OPEN.lastIndex = last; continue; }
    out += s.slice(last, m.index) + ' ';
    const gt = low.indexOf('>', m.index);
    if (gt === -1) return out;                       // malformed: drop the tail
    const close = low.indexOf('</' + m[1], gt + 1);
    if (close === -1) return out;                    // unclosed: drop the tail
    const closeGt = low.indexOf('>', close);
    last = closeGt === -1 ? low.length : closeGt + 1;
    RAW_OPEN.lastIndex = last;
  }
  return out + s.slice(last);
}

// Same reasoning for reading <script> bodies.
export function scriptBodies(html) {
  const low = html.toLowerCase();
  const out = [];
  let i = 0;
  while (true) {
    const open = low.indexOf('<script', i);
    if (open === -1) break;
    const gt = low.indexOf('>', open);
    if (gt === -1) break;
    const close = low.indexOf('</script', gt + 1);
    if (close === -1) break;
    out.push({ tag: html.slice(open, gt + 1), body: html.slice(gt + 1, close) });
    const closeGt = low.indexOf('>', close);
    i = closeGt === -1 ? low.length : closeGt + 1;
  }
  return out;
}

export function htmlToBlocks(html) {
  let s = stripRawText(String(html).replace(/<!--[\s\S]*?-->/g, ' '));

  s = s
    .replace(/<h([1-6])\b[^>]*>/gi, SEP + H_OPEN)
    .replace(/<\/h[1-6]\s*>/gi, H_CLOSE + SEP)
    .replace(/<(td|th)\b[^>]*>/gi, ' ')
    .replace(/<\/(td|th)\s*>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?(p|div|section|article|aside|header|footer|main|nav|tr|li|dd|dt|blockquote|pre|figcaption|table|thead|tbody|ul|ol|dl|form|label|option|details|summary|hr)\b[^>]*>/gi, SEP)
    .replace(/<[^>]+>/g, '');

  const blocks = [];
  let heading = '';
  for (const raw of s.split(SEP)) {
    let piece = raw;
    const isHeading = piece.includes(H_OPEN);
    piece = clean(piece.split(H_OPEN).join('').split(H_CLOSE).join(''));
    if (!usable(piece)) continue;
    if (isHeading) {
      heading = piece.slice(0, 80);
      blocks.push({ text: piece.slice(0, MAX_TEXT), label: '', heading: true });
    } else {
      blocks.push({ text: piece.slice(0, MAX_TEXT), label: heading, heading: false });
    }
  }
  return blocks;
}

export function scriptLiteralLines(html) {
  const out = [];
  for (const { tag, body } of scriptBodies(html)) {
    if (/type=["']application\/json["']/i.test(tag)) continue;
    for (const line of body.split('\n')) {
      if (!hasCJK(line)) continue;
      const lits = [];
      const lre = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
      let lm;
      while ((lm = lre.exec(line))) {
        const raw = lm[1] ?? lm[2] ?? lm[3] ?? '';
        const v = clean(unescapeJs(raw, '"'));
        if (hasCJK(v) && usable(v)) lits.push(v);
      }
      if (lits.length) out.push(clean(lits.join('  ')).slice(0, MAX_TEXT));
      if (out.length >= MAX_RECORDS) return out;
    }
  }
  return out;
}

/* ---------------- markdown ---------------- */

export function recordsFromMarkdown(md) {
  const out = [];
  let heading = '';
  for (const raw of String(md).split(/\n{2,}|\n(?=[-*+>#|]|\d+\.)/)) {
    const h = raw.match(/^\s{0,3}#{1,6}\s+(.*)$/m);
    const text = clean(raw.replace(/^\s{0,3}#{1,6}\s+/gm, '').replace(/[*_`~]{1,3}/g, '').replace(/^\s*[-*+]\s+/gm, '').replace(/\s*\n\s*/g, ' '));
    if (!usable(text)) continue;
    if (h) {
      heading = clean(h[1]).slice(0, 80);
      out.push({ text: text.slice(0, MAX_TEXT), label: '', link: '', key: '', gloss: '' });
    } else {
      out.push({ text: text.slice(0, MAX_TEXT), label: heading, link: '', key: '', gloss: '' });
    }
    if (out.length >= MAX_RECORDS) break;
  }
  return out;
}

/* ---------------- public ---------------- */

// No hint: find every data array the page declares and merge them.
function autoDetect(html) {
  const names = [];
  DECL.lastIndex = 0;
  let m;
  while ((m = DECL.exec(html)) && names.length < 16) {
    const n = m[1];
    if (names.includes(n)) continue;
    if (/^[A-Z][A-Z0-9_]*$/.test(n) || NAMED_GUESS.test(n)) names.push(n);
  }
  const out = [];
  for (const name of names) {
    const r = recordsFromHint(html, { var: name, label: '{A}' });
    if (!r) continue;
    const good = r.filter((x) => CJK.test(x.text) && !NOISE.test(x.text));
    if (good.length >= 5) out.push(...good);   // several arrays can hold content
  }
  if (!out.length) return null;
  const seen = new Set();
  return out
    .filter((r) => (seen.has(r.text) ? false : (seen.add(r.text), true)))
    // the page never declared what a row means, so locate rows by number
    .map((r, k) => ({ ...r, label: r.label ? `${r.label} · ${k + 1}` : `#${k + 1}` }));
}

export function recordsFromHtml(html) {
  const hint = readHint(html);
  if (hint) {
    const r = recordsFromHint(html, hint);
    if (r && r.length) return r;
  }

  const blocks = htmlToBlocks(html);
  const out = [];
  const seen = new Set();
  const push = (r) => {
    if (!usable(r.text) || seen.has(r.text) || out.length >= MAX_RECORDS) return;
    seen.add(r.text);
    out.push(r);
  };

  // structured rows first, then the visible page, then anything still only in
  // script strings (a second data array that would not parse, for instance)
  for (const r of autoDetect(html) || []) push(r);
  for (const b of blocks) push({ text: b.text, label: b.label, link: '', key: '', gloss: '' });
  for (const text of scriptLiteralLines(html)) {
    if (!NOISE.test(text)) push({ text, label: '', link: '', key: '', gloss: '' });
  }
  if (out.length >= MAX_RECORDS) console.error(`extract: hit the ${MAX_RECORDS}-record cap; later content is not searchable`);
  return out;
}

export function recordsFor(kind, buffer) {
  const s = Buffer.isBuffer(buffer) ? buffer.toString('utf8') : String(buffer);
  if (kind === 'html') return recordsFromHtml(s);
  if (kind === 'md') return recordsFromMarkdown(s);
  return []; // pdf: indexed by title/note only
}
