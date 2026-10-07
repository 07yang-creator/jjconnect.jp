/* Shared data layer + render helpers */
window.JP = (function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KIND = { html: '网页', pdf: 'PDF', md: 'Markdown' };
  const TYPE = { material: '资料', test: '测试' };

  let _p = null;
  async function load(force) {
    if (_p && !force) return _p;
    _p = fetch('/api/topics', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('api ' + r.status))))
      .catch(async () => {
        // static fallback (e.g. plain file server without functions)
        const j = await fetch('/content/index.json', { cache: 'no-store' }).then((r) => r.json());
        return {
          storage: false, fallback: true,
          topics: j.topics.map((t) => ({ ...t, source: 'static', items: t.items.map((i) => ({ ...i, source: 'static', url: `/content/${t.slug}/${i.file}` })) })),
        };
      });
    return _p;
  }

  const isNew = (d) => d && (Date.now() - new Date(d).getTime()) < 7 * 86400e3;
  const fmtDate = (d) => (d ? String(d).slice(0, 10) : '');

  // Mark the matches in the RAW text, then escape: marking escaped text would
  // let a query like "amp" highlight the inside of an &amp; entity.
  function mark(text, terms) {
    let s = String(text ?? '').replace(/[\u0000-\u0008\u000b-\u001f]/g, ' ');
    for (const t of terms || []) {
      const term = String(t ?? '');
      if (!term) continue;
      s = s.replace(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), (m) => `\u0001${m}\u0002`);
    }
    return esc(s).split('\u0001').join('<mark>').split('\u0002').join('</mark>');
  }

  // A search hit's destination: the viewer, carrying the exact text that matched
  // (not the whole query, which may be several words the page cannot find as one
  // string) plus whatever jump the page declared for itself, e.g. n=42.
  const viewHref = (view, q, link) => `${view}?q=${encodeURIComponent(q ?? '')}${link ? '&' + link : ''}`;
  const snipHTML = (s, terms) => (s.head ? '…' : '') + mark(s.text, terms) + (s.tail ? '…' : '');

  function topicCard(t) {
    const nm = t.items.filter((i) => i.type === 'material').length;
    const nt = t.items.filter((i) => i.type === 'test').length;
    return `<a class="card" href="/t/${esc(t.slug)}">
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
        <span class="chip">${esc(t.category || '未分类')}</span>
        ${isNew(t.updated) ? '<span class="chip new">NEW</span>' : ''}
      </div>
      <h3>${esc(t.title)}</h3>
      ${t.summary ? `<p class="sum">${esc(t.summary)}</p>` : ''}
      ${t.tags?.length ? `<div class="tags">${t.tags.slice(0, 5).map((x) => `<span class="tag">${esc(x)}</span>`).join('')}</div>` : ''}
      <div class="meta"><span>📄 ${nm} 资料</span><span>✎ ${nt} 测试</span><span>更新 ${fmtDate(t.updated)}</span></div>
    </a>`;
  }

  function itemRow(i, t, opts = {}) {
    const view = `/v/${esc(t.slug)}/${esc(i.file)}`;
    return `<div class="row">
      <div class="ico ${i.type}">${i.type === 'test' ? '問' : i.kind === 'pdf' ? 'PDF' : '資'}</div>
      <div class="body">
        <b><a href="${view}">${esc(i.title)}</a></b>
        <span>${opts.showTopic ? `<a href="/t/${esc(t.slug)}">${esc(t.title)}</a> · ` : ''}${esc(KIND[i.kind] || i.kind)}${i.note ? ' · ' + esc(i.note) : ''}${opts.showDate && i.created ? ' · ' + fmtDate(i.created) : ''}</span>
      </div>
      <div class="act">
        <a class="btn sm primary" href="${view}">${i.type === 'test' ? '开始' : '打开'}</a>
        <a class="btn sm" href="${esc(i.url)}" target="_blank" rel="noopener" title="新窗口打开原文件">↗</a>
      </div>
    </div>`;
  }

  return { esc, load, topicCard, itemRow, KIND, TYPE, fmtDate, isNew, mark, viewHref, snipHTML };
})();
