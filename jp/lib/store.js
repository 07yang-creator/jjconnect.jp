// Storage layer for jp.jjconnect.jp
//
// Two sources, one index:
//   static  — content/index.json + content/<slug>/<file>  (git-tracked, curated)
//   blob    — Vercel Blob:  meta/<slug>/topic-<rand>.json  +  c/<slug>/<file>-<rand>
//             (created on-page by the wizard; needs BLOB_READ_WRITE_TOKEN)
//
// Blob writes never overwrite: every save is a new random-suffixed object and the
// newest `meta/<slug>/` object wins, so the CDN cache on public blob URLs is never
// stale. Older versions are deleted after a successful save.

import { put, list, del } from '@vercel/blob';
import fs from 'node:fs';
import { INDEX_VERSION } from './extract.js';

// Resolved relative to THIS module, never process.cwd(): under a Vercel Root
// Directory the function's cwd is the repo root, not the site folder.
const INDEX_URL = new URL('../content/index.json', import.meta.url);

export const enabled = () => !!process.env.BLOB_READ_WRITE_TOKEN;

const KIND_BY_EXT = { html: 'html', htm: 'html', pdf: 'pdf', md: 'md', markdown: 'md', txt: 'md' };
export const CONTENT_TYPE = {
  html: 'text/html; charset=utf-8',
  pdf: 'application/pdf',
  md: 'text/markdown; charset=utf-8',
};

export function kindOf(name = '') {
  const ext = name.toLowerCase().split('.').pop();
  return KIND_BY_EXT[ext] || null;
}

// ---------- static ----------
export function staticIndex() {
  try {
    const j = JSON.parse(fs.readFileSync(INDEX_URL, 'utf8'));
    return (j.topics || []).map((t) => ({
      ...t,
      source: 'static',
      items: (t.items || []).map((i) => ({
        ...i,
        source: 'static',
        url: `/content/${t.slug}/${i.file}`,
      })),
    }));
  } catch (e) {
    console.error('staticIndex: cannot read content/index.json', e?.message || e);
    return [];
  }
}

// ---------- blob: meta ----------
async function listAll(prefix) {
  const out = [];
  let cursor;
  do {
    const r = await list({ prefix, cursor, limit: 1000 });
    out.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return out;
}

// newest meta object per slug
async function newestMetaObjects() {
  const m = new Map();
  if (!enabled()) return m;
  for (const b of await listAll('meta/')) {
    const slug = b.pathname.split('/')[1];
    if (!slug) continue;
    const cur = m.get(slug);
    if (!cur || new Date(b.uploadedAt) > new Date(cur.uploadedAt)) m.set(slug, b);
  }
  return m;
}

async function fetchJSON(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`blob fetch ${r.status}`);
  return r.json();
}

function decorate(meta) {
  return {
    ...meta,
    source: 'blob',
    items: (meta.items || []).map((i) => ({ ...i, source: 'blob', url: `/c/${meta.slug}/${i.file}` })),
  };
}

export async function readMeta(slug) {
  if (!enabled()) return null;
  const objs = await listAll(`meta/${slug}/`);
  if (!objs.length) return null;
  objs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  return fetchJSON(objs[0].url);
}

export async function blobTopics() {
  const m = await newestMetaObjects();
  const metas = await Promise.all([...m.values()].map((b) => fetchJSON(b.url).catch(() => null)));
  return metas.filter(Boolean).map(decorate);
}

// ---------- blob: search docs ----------
// Records extracted at publish time, kept beside the meta so /api/topics stays
// small and a search never downloads the content files. One doc per topic:
//   search/<slug>/index-<rand>.json  ->  { slug, files: { "<file>": [record] } }

export async function readSearchDoc(slug) {
  if (!enabled()) return null;
  const objs = await listAll(`search/${slug}/`);
  if (!objs.length) return null;
  objs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  const doc = await fetchJSON(objs[0].url).catch(() => null);
  if (!doc) return null;
  // records from an older extractor must not survive a merge-and-re-stamp
  return doc.v === INDEX_VERSION ? doc : { slug, v: INDEX_VERSION, files: {} };
}

export async function saveSearchDoc(slug, files) {
  if (!enabled()) throw new Error('storage-disabled');
  const at = Date.now();
  const res = await put(`search/${slug}/index.json`, JSON.stringify({ slug, v: INDEX_VERSION, files }), {
    access: 'public',
    addRandomSuffix: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });
  await pruneOlderThan(`search/${slug}/`, res.url, at);
  return res;
}

// Map "<slug>/<file>" -> records, across every wizard-created topic.
export async function allSearchDocs() {
  const m = new Map();
  if (!enabled()) return m;
  const newest = new Map();
  for (const b of await listAll('search/')) {
    const slug = b.pathname.split('/')[1];
    if (!slug) continue;
    const cur = newest.get(slug);
    if (!cur || new Date(b.uploadedAt) > new Date(cur.uploadedAt)) newest.set(slug, b);
  }
  const docs = await Promise.all([...newest.values()].map((b) => fetchJSON(b.url).catch(() => null)));
  for (const d of docs) {
    if (!d?.slug || !d.files) continue;
    if (d.v !== INDEX_VERSION) continue; // stale shape — let the backfill rebuild it
    for (const [file, recs] of Object.entries(d.files)) {
      if (Array.isArray(recs)) m.set(`${d.slug}/${file}`, recs);
    }
  }
  return m;
}

// ---------- merged view ----------
function nonEmpty(v) {
  if (Array.isArray(v)) return v.length ? v : undefined;
  return v === undefined || v === null || v === '' ? undefined : v;
}

export async function allTopics() {
  const out = new Map(staticIndex().map((t) => [t.slug, t]));
  for (const b of await blobTopics()) {
    const s = out.get(b.slug);
    if (!s) {
      out.set(b.slug, b);
      continue;
    }
    // overlay: blob may override title/category/tags/summary and appends items
    out.set(b.slug, {
      ...s,
      title: nonEmpty(b.title) ?? s.title,
      category: nonEmpty(b.category) ?? s.category,
      tags: nonEmpty(b.tags) ?? s.tags,
      summary: nonEmpty(b.summary) ?? s.summary,
      updated: [s.updated, b.updated].filter(Boolean).sort().pop(),
      items: [...s.items, ...b.items],
      source: 'mixed',
    });
  }
  return [...out.values()].sort((a, b) => String(b.updated || '').localeCompare(String(a.updated || '')));
}

// strip server-only fields before sending to the browser
export function publicTopic(t) {
  return { ...t, items: (t.items || []).map(({ blob, ...i }) => i) };
}

// ---------- blob: writes ----------
// Prune only objects written BEFORE ours. Deleting "everything but mine" means
// two concurrent writers delete each other and the topic loses its doc entirely.
async function pruneOlderThan(prefix, keepUrl, writtenAt) {
  const olds = (await listAll(prefix)).filter(
    (b) => b.url !== keepUrl && new Date(b.uploadedAt).getTime() < writtenAt,
  );
  if (olds.length) await del(olds.map((b) => b.url));
}

export async function saveMeta(meta) {
  if (!enabled()) throw new Error('storage-disabled');
  const at = Date.now();
  const res = await put(`meta/${meta.slug}/topic.json`, JSON.stringify(meta), {
    access: 'public',
    addRandomSuffix: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });
  await pruneOlderThan(`meta/${meta.slug}/`, res.url, at);
  return res;
}

export async function putFile(slug, filename, buffer, kind) {
  if (!enabled()) throw new Error('storage-disabled');
  return put(`c/${slug}/${filename}`, buffer, {
    access: 'public',
    addRandomSuffix: true,
    contentType: CONTENT_TYPE[kind] || 'application/octet-stream',
  });
}

export async function deleteBlobTopic(slug) {
  if (!enabled()) throw new Error('storage-disabled');
  const objs = [
    ...(await listAll(`meta/${slug}/`)),
    ...(await listAll(`c/${slug}/`)),
    ...(await listAll(`search/${slug}/`)),
  ];
  if (objs.length) await del(objs.map((b) => b.url));
  return objs.length;
}

export async function deleteUrls(urls) {
  if (!urls.length) return;
  await del(urls);
}

// ---------- helpers ----------
export function slugify(title = '') {
  const s = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40);
  return s.length >= 3 ? s : '';
}

export function randomSlug() {
  const d = new Date();
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, '');
  const r = Math.random().toString(36).slice(2, 6);
  return `t${ymd}-${r}`;
}

export function safeFilename(name = '', fallback = 'item') {
  const ext = (name.toLowerCase().match(/\.([a-z0-9]{1,8})$/) || [])[1] || '';
  let base = name
    .replace(/\.[a-z0-9]{1,8}$/i, '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 48);
  if (!base) base = fallback;
  return ext ? `${base}.${ext}` : base;
}

export function today() {
  // JST date, since the owner lives in Tokyo
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
