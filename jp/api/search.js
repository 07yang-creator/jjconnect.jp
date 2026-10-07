// GET /api/search?q=ただし[&limit=30][&type=material|test]
import { search } from '../lib/search.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const q = String(req.query?.q ?? '');
    if (q.length > 120) return res.status(400).json({ error: '搜索词过长' });
    res.status(200).json(await search(q, { limit: req.query?.limit, type: req.query?.type }));
  } catch (e) {
    console.error('search failed', e);       // detail to the log, not the client
    res.status(500).json({ error: '搜索服务暂时不可用' });
  }
}
