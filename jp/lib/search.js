// Site-wide word search across topic metadata and the inside of every file.
//
// Matching is substring-on-normalized-text, which is what Japanese and Chinese
// need (no spaces to tokenize on). Normalizing also drops the decorations a
// grammar list uses, so 「～ても」 is found by typing ても, and 【ただし】 by ただし.
//
// Static content is read from disk once per instance (immutable within a
// deployment); wizard uploads carry their records in a Blob doc written at
// publish time, so a search never fetches the content files themselves.

import fs from 'node:fs';
import { allTopics, allSearchDocs, readSearchDoc, saveSearchDoc, enabled } from './store.js';
import { recordsFromHtml, recordsFromMarkdown, recordsFor } from './extract.js';

const SNIP = 46; // characters of context either side

/* ---------------- normalization ---------------- */

// Decorations that should not stand between a query and a match.
// Every separator — whitespace, punctuation, 「」, ～, ・ — becomes a boundary
// rather than disappearing. Deleting them glues neighbours together and invents
// matches: 「だって～もん」 would contain ても, 「ところが ちなみに」 would contain がち.
// A boundary still lets a query match inside decorations, so ても finds ～ても／～でも.
const SEPARATOR = /[\s　~〜～\-–—_･・、。，．,.:：;；!！?？'"“”‘’`(（)）\[\]【】「」『』〔〕{}｛｝<>＜＞/／\\|｜*＊+＋=＝%％#＃&＆@＠^]/;
const SEPARATOR_G = new RegExp(SEPARATOR.source, 'g');
const BOUND = '\u0001';
const trimB = (s) => s.replace(/^\u0001+|\u0001+$/g, '');

export function norm(s) {
  return String(s ?? '').normalize('NFKC').toLowerCase().replace(SEPARATOR_G, BOUND).replace(/\u0001+/g, BOUND);
}

export function tokenize(q) {
  return String(q ?? '')
    .split(/[\s　]+/)
    .map((t) => ({ raw: t.trim(), n: trimB(norm(t)) }))
    .filter((t) => t.n.length > 0)
    .slice(0, MAX_TERMS);
}
const MAX_TERMS = 24;

function countOf(hay, needle) {
  if (!needle) return 0;
  let n = 0, i = 0;
  while ((i = hay.indexOf(needle, i)) !== -1) { n++; i += needle.length; }
  return n;
}

/* ---------------- snippets ---------------- */

// Normalize for matching while remembering, for each normalized character, where
// it came from in the ORIGINAL text — so a snippet is shown with its real
// punctuation, not the stripped form we matched against.
function normMap(s) {
  const src = String(s ?? '');
  let out = '';
  const idx = [];
  let i = 0;
  for (const ch of src) {
    for (const c of ch.normalize('NFKC').toLowerCase()) {
      if (SEPARATOR.test(c)) {
        if (out.endsWith(BOUND)) continue;   // collapse, exactly as norm() does
        out += BOUND;
      } else out += c;
      idx.push(i);
    }
    i += ch.length;
  }
  idx.push(src.length); // sentinel, so a match ending at the last char has an end
  return { src, n: out, idx };
}

export function snippet(text, terms) {
  const { src, n, idx } = normMap(text);
  let at = -1, term = null;
  for (const t of terms) {
    const p = n.indexOf(t.n);
    if (p !== -1 && (at === -1 || p < at)) { at = p; term = t; }
  }
  if (at === -1) {
    // per-character and whole-string NFKC can disagree (decomposed kana, ㍻);
    // fall back to the raw text so the card still shows the match
    for (const t of terms) {
      const p = src.toLowerCase().indexOf(t.raw.toLowerCase());
      if (p !== -1) {
        const from = Math.max(0, p - SNIP), to = Math.min(src.length, p + t.raw.length + SNIP);
        return { text: src.slice(from, to), head: from > 0, tail: to < src.length, term: t.raw };
      }
    }
    return { text: src.slice(0, SNIP * 2), head: false, tail: src.length > SNIP * 2, term: '' };
  }
  const start = idx[at] ?? 0;
  const end = idx[Math.min(at + term.n.length, idx.length - 1)] ?? src.length;
  const from = Math.max(0, start - SNIP);
  const to = Math.min(src.length, end + SNIP);
  return {
    text: src.slice(from, to),
    head: from > 0,
    tail: to < src.length,
    // the literal text that matched, so an in-page search can find it too
    term: src.slice(start, end),
  };
}

/* ---------------- index ---------------- */

const SAFE = /^[a-z0-9][a-z0-9._-]*$/i;
let staticCache = null;

function readStaticRecords(slug, file, kind) {
  if (!SAFE.test(slug) || !SAFE.test(file) || file.includes('..')) return [];
  if (kind !== 'html' && kind !== 'md') return [];
  try {
    const url = new URL(`../content/${slug}/${file}`, import.meta.url);
    const raw = fs.readFileSync(url, 'utf8');
    return kind === 'html' ? recordsFromHtml(raw) : recordsFromMarkdown(raw);
  } catch (e) {
    console.error(`search: cannot read content/${slug}/${file}`, e?.message || e);
    return [];
  }
}

// { "<slug>/<file>": [record, ...] } for every git-tracked content file
function staticRecords(topics) {
  if (staticCache) return staticCache;
  const m = new Map();
  for (const t of topics) {
    for (const i of t.items || []) {
      if (i.source !== 'static') continue;
      m.set(`${t.slug}/${i.file}`, readStaticRecords(t.slug, i.file, i.kind));
    }
  }
  staticCache = m;
  return m;
}

/* ---------------- scoring ---------------- */

const W = { title: 120, tag: 70, summary: 40, itemTitle: 60, note: 35, key: 90, gloss: 20, body: 10 };

function scoreField(value, terms, weight, out, preNormalized) {
  const hay = preNormalized ? value : norm(value);
  if (!hay) return false;
  let all = true;
  let s = 0;
  for (const t of terms) {
    const c = countOf(hay, t.n);
    if (!c) { all = false; continue; }
    s += weight * (1 + Math.min(c - 1, 3) * 0.15);
    if (hay === t.n) s += weight * 1.5;          // exact
    else if (hay.startsWith(t.n)) s += weight * 0.4; // prefix
  }
  if (s) out.score += all ? s : s * 0.45;        // partial term coverage is worth less
  return all;
}

/* ---------------- corpus ---------------- */

// Search-as-you-type would otherwise list and fetch Blob storage on every
// keystroke. Hold the topic list and the upload records for a few seconds;
// /api/topics stays uncached, so nothing else goes stale.
const TTL = 15000;
let hot = null;
let inflight = null;

async function corpus() {
  if (hot && Date.now() - hot.at < TTL) return hot.value;
  if (inflight) return inflight;          // concurrent searches share one build
  inflight = (async () => {
    const [topics, blobDocs] = await Promise.all([allTopics(), allSearchDocs()]);
    await backfill(topics, blobDocs);
    hot = { at: Date.now(), value: { topics, blobDocs } };
    return hot.value;
  })().finally(() => { inflight = null; });
  return inflight;
}

// Files uploaded before indexing existed (or whose indexing failed) carry no
// records. Index them on the next search and write the result back, so this
// costs one slower search per file and never repeats. Bounded hard, because it
// runs inside a user-facing request.
const BACKFILL = { files: 8, bytes: 8e6, ms: 9000 };
const unreachable = new Set();   // fetch failed in this instance — stop retrying

async function backfill(topics, blobDocs) {
  if (!enabled()) return;
  const missing = [];
  for (const t of topics) {
    for (const i of t.items || []) {
      if (i.source !== 'blob' || !i.blob) continue;
      if (i.kind !== 'html' && i.kind !== 'md') continue;
      const key = `${t.slug}/${i.file}`;
      if (blobDocs.has(key) || unreachable.has(key)) continue;
      // only our own store, never an arbitrary URL out of a stored document
      if (!/^https:\/\/[a-z0-9.-]+\.(?:public\.)?blob\.vercel-storage\.com\//i.test(i.blob)) {
        console.error('search: refusing to index a non-Blob url for', key);
        unreachable.add(key);
        continue;
      }
      missing.push({ slug: t.slug, item: i, key });
    }
  }
  if (!missing.length) return;

  const started = Date.now();
  const touched = new Map();
  let files = 0, bytes = 0;
  for (const { slug, item, key } of missing) {
    if (files >= BACKFILL.files || bytes >= BACKFILL.bytes || Date.now() - started > BACKFILL.ms) {
      console.error(`search: backfill budget reached, ${missing.length - files} file(s) still unindexed`);
      break;
    }
    try {
      const r = await fetch(item.blob, { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      files++; bytes += buf.length;
      const recs = recordsFor(item.kind, buf);
      blobDocs.set(key, recs);
      // persisted even when empty, so a file with nothing to index settles
      if (!touched.has(slug)) touched.set(slug, {});
      touched.get(slug)[item.file] = recs;
    } catch (e) {
      console.error('search: backfill failed for', key, e?.message || e);
      blobDocs.set(key, []);
      unreachable.add(key);  // transient or not, stop hammering it from here
    }
  }
  for (const [slug, addedFiles] of touched) {
    try {
      const existing = (await readSearchDoc(slug))?.files || {};
      await saveSearchDoc(slug, { ...existing, ...addedFiles });
    } catch (e) {
      console.error('search: cannot persist backfill for', slug, e?.message || e);
    }
  }
}

/* ---------------- search ---------------- */

export async function search(q, opts = {}) {
  const n = parseInt(opts.limit, 10);
  const limit = Number.isFinite(n) && n > 0 ? Math.min(n, 100) : 30;
  const typeFilter = opts.type === 'material' || opts.type === 'test' ? opts.type : null;
  const terms = tokenize(q);
  const asked = String(q ?? '').split(/[\s　]+/).filter(Boolean).length;
  if (!terms.length) {
    return { q: String(q ?? ''), terms: [], words: [], results: [], topics: [], droppedTerms: 0,
             counts: { words: 0, items: 0, hits: 0, topics: 0 } };
  }

  const { topics, blobDocs } = await corpus();
  const statics = staticRecords(topics);

  const words = [];
  const results = [];
  const topicHits = [];

  for (const t of topics) {
    // --- topic metadata ---
    const tOut = { score: 0 };
    const tAll =
      [scoreField(t.title, terms, W.title, tOut),
       scoreField((t.tags || []).join(' '), terms, W.tag, tOut),
       scoreField(t.category, terms, W.tag * 0.6, tOut),
       scoreField(t.summary, terms, W.summary, tOut)].some(Boolean);
    if (tOut.score && tAll) {
      topicHits.push({ slug: t.slug, title: t.title, category: t.category || '', summary: t.summary || '', score: tOut.score, items: (t.items || []).length });
    }

    for (const i of t.items || []) {
      if (typeFilter && i.type !== typeFilter) continue;
      const iOut = { score: 0 };
      const titleAll = scoreField(i.title, terms, W.itemTitle, iOut);
      const noteAll = scoreField(i.note, terms, W.note, iOut);
      const metaScore = titleAll || noteAll ? iOut.score : 0; // every term, or it is not a hit

      const recs = (i.source === 'static' ? statics.get(`${t.slug}/${i.file}`) : blobDocs.get(`${t.slug}/${i.file}`)) || [];
      const hits = [];
      for (const r of recs) {
        const rOut = { score: 0 };
        let matched = false;
        if (r.key) {
          const keyAll = scoreField(trimB(norm(r.key)), terms, W.key, rOut, true);
          if (keyAll) matched = true;
        }
        if (r.gloss) scoreField(r.gloss, terms, W.gloss, rOut);
        const bodyAll = scoreField(r.text, terms, W.body, rOut);
        if (bodyAll) matched = true;
        if (!matched || !rOut.score) continue;

        const snip = snippet(r.text, terms);
        const hit = {
          label: r.label || '',
          link: r.link || '',
          score: rOut.score,
          snippet: snip,
          // the literal string that matched here, so the page can find it again
          term: snip.term || terms[0].raw,
        };
        if (r.key) { hit.key = r.key; hit.gloss = r.gloss || ''; hit.ex = r.ex || ''; }
        hits.push(hit);
      }

      if (!hits.length && !metaScore) continue;
      hits.sort((a, b) => b.score - a.score);

      // a headword match is a word lookup — surface it on its own
      for (const h of hits) {
        if (!h.key) continue;
        const nk = trimB(norm(h.key));
        const isWord = terms.every((t2) => nk.includes(t2.n));
        if (!isWord) continue;
        // a headword that IS the query beats one that merely contains it:
        // searching ても should surface ～ても／～でも, not いずれにしても／…
        const tight = terms.reduce((a, t2) => a + t2.n.length, 0) / Math.max(nk.length, 1);
        words.push({
          key: h.key,
          gloss: h.gloss,
          label: h.label,
          text: h.ex || h.snippet.text,   // prefer the page's own example sentence
          term: h.term,
          exact: terms.length === 1 && nk === terms[0].n,
          score: h.score * (0.6 + 0.8 * Math.min(tight, 1)),
          topic: { slug: t.slug, title: t.title },
          item: { file: i.file, title: i.title, type: i.type, kind: i.kind },
          view: `/v/${t.slug}/${i.file}`,
          link: h.link,
        });
      }

      const best = hits.reduce((a, h) => a + h.score, 0);
      results.push({
        slug: t.slug,
        topicTitle: t.title,
        category: t.category || '',
        file: i.file,
        itemTitle: i.title,
        note: i.note || '',
        type: i.type,
        kind: i.kind,
        url: i.url,
        view: `/v/${t.slug}/${i.file}`,
        indexed: recs.length > 0,
        score: metaScore * 2 + Math.min(best, 600) + (hits.length ? 20 : 0),
        total: hits.length,
        hits: hits.slice(0, 4),
      });
    }
  }

  words.sort((a, b) => (b.exact ? 1 : 0) - (a.exact ? 1 : 0) || b.score - a.score);
  results.sort((a, b) => b.score - a.score);
  topicHits.sort((a, b) => b.score - a.score);

  const shownWords = words.slice(0, 12);
  const shownResults = results.slice(0, limit);
  return {
    q: String(q ?? ''),
    terms: terms.map((t) => t.raw),
    droppedTerms: Math.max(0, asked - terms.length),
    words: shownWords,
    results: shownResults,
    topics: topicHits.slice(0, 8),
    counts: {
      words: shownWords.length,
      items: shownResults.length,
      hits: shownResults.reduce((a, r) => a + r.total, 0),
      topics: topicHits.length,
      moreFiles: Math.max(0, results.length - shownResults.length),
    },
  };
}

