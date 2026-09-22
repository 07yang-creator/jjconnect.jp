// POST /api/publish
// {
//   slug?: string,                       // existing topic to update / append to
//   topic: { title, category, tags[], summary },
//   add:   [{ name, title, type: 'material'|'test', note, data: <base64> }],
//   remove: [itemId, ...]                // blob items only
// }
import {
  enabled, staticIndex, readMeta, saveMeta, putFile, deleteUrls,
  slugify, randomSlug, safeFilename, kindOf, today,
} from '../lib/store.js';

const MAX_FILE = 3.5 * 1024 * 1024; // Vercel function body cap is 4.5 MB (base64 inflates ~33%)
const MAX_ITEMS = 12;

function bad(res, code, msg) {
  res.status(code).json({ error: msg });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return bad(res, 405, 'POST only');
  if (!enabled()) return bad(res, 503, '存储未配置（BLOB_READ_WRITE_TOKEN 缺失）');

  // optional shared key — only enforced when the env var is set
  if (process.env.PUBLISH_KEY && req.headers['x-publish-key'] !== process.env.PUBLISH_KEY) {
    return bad(res, 401, '发布密钥不正确');
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return bad(res, 400, 'JSON 无法解析'); }
  }
  if (!body || typeof body !== 'object') return bad(res, 400, '请求体为空');

  const topicIn = body.topic || {};
  const title = String(topicIn.title || '').trim();
  if (!title) return bad(res, 400, '请填写专题标题');

  const add = Array.isArray(body.add) ? body.add : [];
  const remove = Array.isArray(body.remove) ? body.remove.map(String) : [];
  if (add.length > MAX_ITEMS) return bad(res, 400, `一次最多上传 ${MAX_ITEMS} 个文件`);

  // ---- resolve slug ----
  const statics = staticIndex();
  let slug = String(body.slug || '').trim().toLowerCase();
  let existing = null;
  if (slug) {
    if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(slug)) return bad(res, 400, 'slug 格式不正确');
    existing = await readMeta(slug);
  } else {
    slug = slugify(title) || randomSlug();
    const taken = new Set(statics.map((t) => t.slug));
    if (taken.has(slug) || (await readMeta(slug))) slug = randomSlug();
  }
  const staticTopic = statics.find((t) => t.slug === slug) || null;

  // ---- build meta ----
  const now = today();
  const meta = existing || { slug, created: now, items: [] };
  meta.title = title;
  meta.category = String(topicIn.category || '').trim() || (staticTopic?.category ?? '未分类');
  meta.tags = (Array.isArray(topicIn.tags) ? topicIn.tags : String(topicIn.tags || '').split(/[,，、\s]+/))
    .map((s) => String(s).trim()).filter(Boolean).slice(0, 12);
  meta.summary = String(topicIn.summary || '').trim().slice(0, 600);
  meta.updated = now;
  meta.items = Array.isArray(meta.items) ? meta.items : [];

  // ---- remove items (blob ones only) ----
  const toDelete = [];
  if (remove.length) {
    const keep = [];
    for (const it of meta.items) {
      if (remove.includes(String(it.id))) { if (it.blob) toDelete.push(it.blob); }
      else keep.push(it);
    }
    meta.items = keep;
  }

  // ---- add files ----
  const usedNames = new Set([
    ...meta.items.map((i) => i.file),
    ...((staticTopic?.items || []).map((i) => i.file)),
  ]);
  const uploaded = [];
  try {
    for (const [n, a] of add.entries()) {
      const name = String(a.name || `item-${n + 1}.html`);
      const kind = kindOf(name);
      if (!kind) return bad(res, 400, `不支持的文件类型：${name}（仅 HTML / PDF / Markdown）`);
      const data = String(a.data || '');
      const buf = Buffer.from(data, 'base64');
      if (!buf.length) return bad(res, 400, `文件为空：${name}`);
      if (buf.length > MAX_FILE) return bad(res, 413, `文件过大：${name}（上限 3.5 MB）`);

      let file = safeFilename(name, `item-${n + 1}`);
      let k = 2;
      while (usedNames.has(file)) file = file.replace(/(\.[a-z0-9]+)?$/i, (ext) => `-${k++}${ext || ''}`);
      usedNames.add(file);

      const put = await putFile(slug, file, buf, kind);
      uploaded.push(put.url);
      meta.items.push({
        id: `${Date.now().toString(36)}${n}`,
        type: a.type === 'test' ? 'test' : 'material',
        kind,
        title: String(a.title || name.replace(/\.[a-z0-9]+$/i, '')).trim().slice(0, 120),
        note: String(a.note || '').trim().slice(0, 160),
        file,
        size: buf.length,
        created: now,
        blob: put.url,
      });
    }
    await saveMeta(meta);
  } catch (e) {
    // roll back anything uploaded in this request
    if (uploaded.length) await deleteUrls(uploaded).catch(() => {});
    return bad(res, 500, `发布失败：${e?.message || e}`);
  }
  if (toDelete.length) await deleteUrls(toDelete).catch(() => {});

  res.status(200).json({ ok: true, slug, url: `/t/${slug}`, items: meta.items.length });
}
