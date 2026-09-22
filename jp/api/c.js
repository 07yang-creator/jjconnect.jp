// GET /c/<slug>/<file>  (rewritten to /api/c?slug=&file=)
// Serves a wizard-uploaded file from Vercel Blob on our own origin, with the
// right content type (Blob itself forces HTML to download).
import { enabled, readMeta, CONTENT_TYPE } from '../lib/store.js';

export default async function handler(req, res) {
  const slug = String(req.query.slug || '').toLowerCase();
  const file = String(req.query.file || '');
  if (!enabled()) return res.status(503).send('storage disabled');
  if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(slug) || !/^[a-z0-9._-]{1,64}$/i.test(file)) {
    return res.status(400).send('bad path');
  }
  const meta = await readMeta(slug);
  const item = meta?.items?.find((i) => i.file === file);
  if (!item?.blob) return res.status(404).send('not found');

  const r = await fetch(item.blob);
  if (!r.ok) return res.status(502).send('upstream error');
  const buf = Buffer.from(await r.arrayBuffer());
  res.setHeader('Content-Type', CONTENT_TYPE[item.kind] || 'application/octet-stream');
  res.setHeader('Content-Length', String(buf.length));
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.status(200).end(buf);
}
