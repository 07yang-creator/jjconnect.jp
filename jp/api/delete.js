// POST /api/delete  { slug }  — removes the blob-stored part of a topic (meta + files)
import { enabled, staticIndex, readMeta, deleteBlobTopic } from '../lib/store.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!enabled()) return res.status(503).json({ error: '存储未配置' });
  if (process.env.PUBLISH_KEY && req.headers['x-publish-key'] !== process.env.PUBLISH_KEY) {
    return res.status(401).json({ error: '发布密钥不正确' });
  }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const slug = String(body?.slug || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(slug)) return res.status(400).json({ error: 'slug 格式不正确' });

  const isStatic = staticIndex().some((t) => t.slug === slug);
  const meta = await readMeta(slug);
  if (!meta && isStatic) return res.status(400).json({ error: '该专题由代码库管理，需在仓库中删除' });
  if (!meta) return res.status(404).json({ error: '专题不存在' });

  const n = await deleteBlobTopic(slug);
  res.status(200).json({ ok: true, removed: n, staticRemains: isStatic });
}
