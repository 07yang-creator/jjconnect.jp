/* On-page wizard: create a topic / append materials & tests / edit / delete.
   Opens from the navbar ＋ button, the home-page drop zone, topic-page 编辑, or /new/. */
window.JPWizard = (function () {
  const { esc } = window.JP;
  const CATS = ['语法', '词汇', '汉字', '听力', '阅读', '会话', '写作', '商务日语', 'JLPT', '其他'];
  const MAX_FILE = 3.5 * 1024 * 1024;
  const KIND_BY_EXT = { html: 'html', htm: 'html', pdf: 'pdf', md: 'md', markdown: 'md', txt: 'md' };
  const kindOf = (n = '') => KIND_BY_EXT[n.toLowerCase().split('.').pop()] || null;
  const guessType = (s = '') => (/quiz|test|exam|题|測|問|練習|练习|测验|試験|问答/i.test(s) ? 'test' : 'material');
  const fmtSize = (n) => (n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');

  let dlg, st;

  function ensure() {
    if (dlg) return;
    dlg = document.createElement('dialog');
    dlg.className = 'wiz';
    dlg.innerHTML = `<div class="box">
      <div class="hd"><h2 id="wzTitle">新建专题</h2><div class="steps" id="wzSteps"></div><button class="x" type="button" aria-label="关闭">×</button></div>
      <div class="bd" id="wzBody"></div>
      <div class="ft" id="wzFoot"></div></div>`;
    document.body.append(dlg);
    dlg.querySelector('.x').addEventListener('click', close);
    dlg.addEventListener('cancel', (e) => { if (st?.busy) e.preventDefault(); });
  }
  function close() { if (st?.busy) return; dlg.close(); }

  async function open({ slug, files } = {}) {
    ensure();
    st = {
      step: 1, mode: slug ? 'edit' : 'new', slug: slug || '',
      topic: { title: '', category: '', tags: '', summary: '' },
      existing: [], source: '', add: [], remove: [], busy: false, err: '', done: null,
      storage: true, topics: [],
    };
    render();
    dlg.showModal();
    try {
      const data = await window.JP.load(true);
      st.storage = !!data.storage;
      st.topics = data.topics;
      if (slug) loadTopic(slug);
    } catch (e) { st.err = '无法读取专题列表：' + e.message; }
    if (files?.length) { await addFiles(files); if (st.mode === 'edit') st.step = 2; }
    render();
  }

  function loadTopic(slug) {
    const t = st.topics.find((x) => x.slug === slug);
    if (!t) { st.err = '未找到专题 ' + slug; return; }
    st.slug = slug; st.source = t.source; st.existing = t.items || []; st.remove = [];
    st.topic = { title: t.title, category: t.category || '', tags: (t.tags || []).join(', '), summary: t.summary || '' };
  }

  const readB64 = (blob) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = no; r.readAsDataURL(blob); });

  async function addFiles(files) {
    for (const f of files) {
      const kind = kindOf(f.name);
      if (!kind) { st.err = `不支持的文件类型：${f.name}（仅 HTML / PDF / Markdown）`; continue; }
      if (f.size > MAX_FILE) { st.err = `文件过大：${f.name}（上限 3.5 MB）`; continue; }
      let title = f.name.replace(/\.[a-z0-9]+$/i, '');
      if (kind === 'html') { try { const t = new DOMParser().parseFromString(await f.text(), 'text/html').title; if (t?.trim()) title = t.trim(); } catch {} }
      else if (kind === 'md') { try { const m = (await f.text()).match(/^#\s+(.+)$/m); if (m) title = m[1].trim(); } catch {} }
      st.add.push({ name: f.name, kind, size: f.size, title, type: guessType(f.name + ' ' + title), note: '', data: await readB64(f) });
    }
    if (st.step === 1 && st.mode === 'new' && !st.topic.title && st.add[0]) st.topic.title = st.add[0].title;
  }

  async function addPasted(text) {
    text = text.trim(); if (!text) return;
    const isHtml = /^\s*(<!doctype|<html|<head|<body|<meta|<div|<h1)/i.test(text);
    const name = (isHtml ? 'pasted-' : 'note-') + Date.now().toString(36) + (isHtml ? '.html' : '.md');
    let title = '';
    if (isHtml) title = new DOMParser().parseFromString(text, 'text/html').title || '';
    else title = (text.match(/^#\s+(.+)$/m) || [])[1] || '';
    title = title.trim() || (isHtml ? '粘贴的网页' : '粘贴的笔记');
    st.add.push({ name, kind: isHtml ? 'html' : 'md', size: text.length, title, type: guessType(title), note: '', data: await readB64(new Blob([text])) });
  }

  /* ---------- render ---------- */
  function render() {
    const T = dlg.querySelector('#wzTitle'), S = dlg.querySelector('#wzSteps'), B = dlg.querySelector('#wzBody'), F = dlg.querySelector('#wzFoot');
    T.textContent = st.done ? '发布完成' : st.mode === 'edit' ? '编辑专题' : st.mode === 'append' ? '追加到已有专题' : '新建专题';
    S.innerHTML = ['专题', '内容', '发布'].map((n, i) => `<span class="${st.step === i + 1 ? 'on' : ''}">${i + 1} ${n}</span>`).join('');
    if (st.done) { S.innerHTML = ''; B.innerHTML = renderDone(); F.innerHTML = `<span class="sp"></span><button class="btn" type="button" data-act="close">关闭</button><a class="btn primary" href="${esc(st.done.url)}">打开专题 →</a>`; bind(B, F); return; }

    const banner = !st.storage ? `<div class="note">⚠ 在线存储尚未配置（缺少 BLOB_READ_WRITE_TOKEN）。可以填写并预览，但发布会失败。</div>` : '';
    const err = st.err ? `<div class="err">${esc(st.err)}</div>` : '';
    B.innerHTML = banner + err + (st.step === 1 ? renderStep1() : st.step === 2 ? renderStep2() : renderStep3());

    const canNext = st.step === 1 ? !!st.topic.title.trim() : st.step === 2 ? (st.add.length + st.existing.length - st.remove.length) > 0 || st.mode !== 'new' : true;
    F.innerHTML = `
      ${st.mode === 'edit' && st.source !== 'static' ? `<button class="btn sm danger" type="button" data-act="delete" ${st.busy ? 'disabled' : ''}>删除专题</button>` : ''}
      <span class="sp">${st.busy ? '正在发布…' : st.step === 2 ? '可多选文件；类型可手动切换' : ''}</span>
      ${st.step > 1 ? `<button class="btn" type="button" data-act="prev" ${st.busy ? 'disabled' : ''}>上一步</button>` : `<button class="btn" type="button" data-act="close">取消</button>`}
      ${st.step < 3 ? `<button class="btn primary" type="button" data-act="next" ${canNext ? '' : 'disabled'}>下一步</button>`
                    : `<button class="btn primary" type="button" data-act="publish" ${st.busy || !st.storage ? 'disabled' : ''}>${st.mode === 'new' ? '发布专题' : '保存更改'}</button>`}`;
    bind(B, F);
  }

  function renderStep1() {
    const cats = [...new Set([...st.topics.map((t) => t.category).filter(Boolean), ...CATS])];
    const seg = st.mode === 'edit' ? '' : `<div class="f"><div class="seg" role="group">
        <button type="button" data-mode="new" aria-pressed="${st.mode === 'new'}">新建专题</button>
        <button type="button" data-mode="append" aria-pressed="${st.mode === 'append'}">追加到已有专题</button></div></div>`;
    const pick = st.mode === 'append' ? `<div class="f"><label>选择专题</label><select id="wzPick"><option value="">— 请选择 —</option>${st.topics.map((t) => `<option value="${esc(t.slug)}" ${t.slug === st.slug ? 'selected' : ''}>${esc(t.title)}（${esc(t.category || '未分类')}）</option>`).join('')}</select></div>` : '';
    return `${seg}${pick}
      <div class="f"><label>专题标题 *</label><input type="text" id="wzT" value="${esc(st.topic.title)}" placeholder="例：日语接续表达" ${st.mode === 'append' && !st.slug ? 'disabled' : ''}></div>
      <div class="f2">
        <div class="f"><label>分类</label><input type="text" id="wzC" list="wzCats" value="${esc(st.topic.category)}" placeholder="语法 / 词汇 / …"><datalist id="wzCats">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist></div>
        <div class="f"><label>标签（逗号分隔）</label><input type="text" id="wzG" value="${esc(st.topic.tags)}" placeholder="接続詞, N3"></div>
      </div>
      <div class="f"><label>简介</label><textarea id="wzS" rows="3" placeholder="一两句话说明这个专题包含什么">${esc(st.topic.summary)}</textarea></div>
      ${st.mode === 'edit' && st.source === 'static' ? '<div class="note">此专题的原有内容由代码库管理（不可在此删除）；在这里追加的资料会保存到在线存储。</div>' : ''}`;
  }

  function renderStep2() {
    const ex = st.existing.length ? `<div class="f"><label>已有内容（${st.existing.length}）</label>${st.existing.map((i) => {
      const removed = st.remove.includes(String(i.id));
      const locked = i.source === 'static';
      return `<div class="item existing" style="${removed ? 'opacity:.4;text-decoration:line-through' : ''}">
        <div class="ico ${i.kind}">${i.kind.toUpperCase()}</div>
        <div class="fields"><div><b>${esc(i.title)}</b> <span class="chip ${i.type}">${i.type === 'test' ? '测试' : '资料'}</span></div><div class="sub">${esc(i.file)}${i.note ? ' · ' + esc(i.note) : ''}</div></div>
        ${locked ? '<span class="sub" title="由代码库管理">🔒</span>' : `<button class="rm" type="button" data-rm="${esc(i.id)}" title="${removed ? '恢复' : '移除'}">${removed ? '↺' : '×'}</button>`}
      </div>`; }).join('')}</div>` : '';
    const items = st.add.map((a, k) => `<div class="item">
        <div class="ico ${a.kind}">${a.kind.toUpperCase()}</div>
        <div class="fields">
          <input type="text" data-k="${k}" data-f="title" value="${esc(a.title)}" placeholder="显示标题">
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <div class="seg"><button type="button" data-k="${k}" data-type="material" aria-pressed="${a.type === 'material'}">📄 资料</button><button type="button" data-k="${k}" data-type="test" aria-pressed="${a.type === 'test'}">✎ 测试</button></div>
            <input type="text" data-k="${k}" data-f="note" value="${esc(a.note)}" placeholder="备注（如：100 题 · 五级）" style="flex:1;min-width:160px">
          </div>
          <div class="sub">${esc(a.name)} · ${fmtSize(a.size)}</div>
        </div>
        <button class="rm" type="button" data-del="${k}" title="移除">×</button>
      </div>`).join('');
    return `${ex}
      <div class="f"><label>添加内容</label>
        <div class="drop" id="wzDrop"><b>拖入文件，或点击选择</b>HTML 网页 · PDF · Markdown（单个 ≤ 3.5 MB）</div>
        <input type="file" id="wzFile" multiple accept=".html,.htm,.pdf,.md,.markdown,.txt" hidden>
        <details class="paste"><summary>或粘贴 HTML / Markdown 文本</summary>
          <textarea id="wzPaste" rows="5" placeholder="粘贴完整的 HTML 页面，或 Markdown 笔记"></textarea>
          <div style="text-align:right;margin-top:6px"><button class="btn sm" type="button" data-act="paste">加入列表</button></div></details>
      </div>
      ${items ? `<div class="f"><label>本次新增（${st.add.length}）</label>${items}</div>` : ''}`;
  }

  function renderStep3() {
    const kept = st.existing.filter((i) => !st.remove.includes(String(i.id)));
    const li = (i) => `<li>${i.type === 'test' ? '✎' : '📄'} ${esc(i.title)} <span class="chip kind">${esc(window.JP.KIND[i.kind] || i.kind)}</span></li>`;
    return `<table class="sumtab">
      <tr><td>专题</td><td><b>${esc(st.topic.title)}</b>${st.slug ? ` <span class="chip kind">/t/${esc(st.slug)}</span>` : ''}</td></tr>
      <tr><td>分类</td><td>${esc(st.topic.category || '未分类')}</td></tr>
      <tr><td>标签</td><td>${esc(st.topic.tags || '—')}</td></tr>
      <tr><td>简介</td><td>${esc(st.topic.summary || '—')}</td></tr>
      ${kept.length ? `<tr><td>保留</td><td><ul style="margin:0;padding-left:18px">${kept.map(li).join('')}</ul></td></tr>` : ''}
      ${st.remove.length ? `<tr><td>移除</td><td>${st.remove.length} 项</td></tr>` : ''}
      <tr><td>新增</td><td>${st.add.length ? `<ul style="margin:0;padding-left:18px">${st.add.map(li).join('')}</ul>` : '—'}</td></tr>
    </table>${st.busy ? '<progress style="margin-top:14px"></progress>' : ''}`;
  }

  function renderDone() {
    return `<div class="ok">✓ 已发布：<b>${esc(st.topic.title)}</b><br><span style="font-size:13px">共 ${st.done.items} 项内容 · 地址 <code>${esc(location.origin + st.done.url)}</code></span></div>`;
  }

  /* ---------- events ---------- */
  function bind(B, F) {
    F.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => act(b.dataset.act)));
    B.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => act(b.dataset.act)));
    B.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { st.mode = b.dataset.mode; if (st.mode === 'new') { st.slug = ''; st.existing = []; st.source = ''; } st.err = ''; render(); }));
    B.querySelector('#wzPick')?.addEventListener('change', (e) => { st.err = ''; if (e.target.value) loadTopic(e.target.value); else { st.slug = ''; st.existing = []; } render(); });
    const on = (id, key) => B.querySelector(id)?.addEventListener('input', (e) => { st.topic[key] = e.target.value; if (key === 'title') F.querySelector('[data-act=next]')?.toggleAttribute('disabled', !e.target.value.trim()); });
    on('#wzT', 'title'); on('#wzC', 'category'); on('#wzG', 'tags'); on('#wzS', 'summary');

    const drop = B.querySelector('#wzDrop'), file = B.querySelector('#wzFile');
    if (drop) {
      drop.addEventListener('click', () => file.click());
      file.addEventListener('change', async () => { st.err = ''; await addFiles([...file.files]); render(); });
      ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
      ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
      drop.addEventListener('drop', async (e) => { st.err = ''; await addFiles([...e.dataTransfer.files]); render(); });
    }
    B.querySelectorAll('[data-f]').forEach((i) => i.addEventListener('input', () => { st.add[+i.dataset.k][i.dataset.f] = i.value; }));
    B.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => { st.add[+b.dataset.k].type = b.dataset.type; render(); }));
    B.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => { st.add.splice(+b.dataset.del, 1); render(); }));
    B.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { const id = b.dataset.rm; const k = st.remove.indexOf(id); k >= 0 ? st.remove.splice(k, 1) : st.remove.push(id); render(); }));
  }

  async function act(a) {
    if (a === 'close') return close();
    if (a === 'prev') { st.err = ''; st.step--; return render(); }
    if (a === 'next') {
      if (st.step === 1 && st.mode === 'append' && !st.slug) { st.err = '请选择要追加的专题'; return render(); }
      st.err = ''; st.step++; return render();
    }
    if (a === 'paste') { const ta = dlg.querySelector('#wzPaste'); await addPasted(ta.value); render(); return; }
    if (a === 'publish') return publish();
    if (a === 'delete') return remove();
  }

  async function publish() {
    st.busy = true; st.err = ''; render();
    try {
      const body = {
        slug: st.slug || undefined,
        topic: { ...st.topic, tags: st.topic.tags.split(/[,，、\s]+/).map((s) => s.trim()).filter(Boolean) },
        add: st.add.map(({ name, title, type, note, data }) => ({ name, title, type, note, data })),
        remove: st.remove,
      };
      const r = await fetch('/api/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      st.done = j; st.busy = false; render();
      window.JP.load(true).then(() => document.dispatchEvent(new CustomEvent('jp:changed', { detail: j })));
    } catch (e) { st.busy = false; st.err = e.message; render(); }
  }

  async function remove() {
    if (!confirm(`删除专题「${st.topic.title}」及其在线存储的全部内容？此操作不可恢复。`)) return;
    st.busy = true; st.err = ''; render();
    try {
      const r = await fetch('/api/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: st.slug }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      st.busy = false; dlg.close(); location.href = '/';
    } catch (e) { st.busy = false; st.err = e.message; render(); }
  }

  return { open, close };
})();
