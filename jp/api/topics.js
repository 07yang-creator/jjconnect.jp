import { allTopics, enabled, publicTopic } from '../lib/store.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const topics = await allTopics();
    res.status(200).json({ storage: enabled(), topics: topics.map(publicTopic) });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
