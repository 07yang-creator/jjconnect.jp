/* Navbar + search + footer, injected on every page. Site name lives here only. */
(function () {
  const SITE = { name: '日语学习', mark: '日', host: 'jp.jjconnect.jp' };
  const LINKS = [
    ['/', '首页'],
    ['/#topics', '专题'],
    ['/#tests', '在线测试'],
    ['/#materials', '学习资料'],
  ];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const path = location.pathname.replace(/\/index\.html$/, '/');
  const onSearchPage = /^\/s\/?$/.test(path);
  const here = new URLSearchParams(location.search).get('q') || '';

  const nav = document.createElement('header');
  nav.className = 'nav';
  nav.innerHTML = `
    <div class="in">
      <a class="brand" href="/"><span class="mark">${SITE.mark}</span>${SITE.name}<small>${SITE.host}</small></a>
      <nav class="links" id="navLinks">${LINKS.map(([h, t]) => {
        const cur = (h === '/' && path === '/') || (h !== '/' && !h.includes('#') && path.startsWith(h));
        return `<a href="${h}"${cur ? ' aria-current="page"' : ''}>${t}</a>`;
      }).join('')}</nav>
      <form class="search" id="navSearch" role="search" action="/s" method="get" autocomplete="off">
        <span class="ico" aria-hidden="true">🔍</span>
        <input type="search" name="q" id="navQ" value="${esc(onSearchPage ? here : '')}"
               placeholder="搜索单词・例句・题目" aria-label="搜索站内内容"
               aria-autocomplete="list" aria-expanded="false" aria-controls="navSx" role="combobox">
        <button class="clear" type="button" aria-label="清空" hidden>×</button>
        <div class="sx" id="navSx" role="listbox" aria-label="搜索建议" hidden></div>
      </form>
      <button class="searchbtn" type="button" aria-label="搜索" aria-expanded="false">🔍</button>
      <button class="new" type="button" data-wizard title="新建专题 / 上传资料">＋<span>新建</span></button>
      <button class="burger" type="button" aria-label="菜单" aria-expanded="false">☰</button>
    </div>`;
  document.body.prepend(nav);

  const burger = nav.querySelector('.burger');
  const links = nav.querySelector('#navLinks');
  const form = nav.querySelector('#navSearch');
  const input = nav.querySelector('#navQ');
  const box = nav.querySelector('#navSx');
  const clear = nav.querySelector('.search .clear');
  const toggle = nav.querySelector('.searchbtn');

  const closeSearchRow = () => { nav.classList.remove('searching'); toggle.setAttribute('aria-expanded', 'false'); };
  const closeMenu = () => { links.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); };

  burger.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
    if (open) { close(); closeSearchRow(); }   // never stack the two panels
  });
  links.addEventListener('click', closeMenu);

  /* ---------------- search ---------------- */
  const mark = (text, terms) => window.JP.mark(text, terms);
  const viewHref = (view, q, link) => window.JP.viewHref(view, q, link);
  let timer = null, seq = 0, items = [], active = -1, lastQ = null, wantOpen = false, composing = false;

  function close() {
    wantOpen = false;
    box.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  }
  function openPanel() {
    if (!wantOpen || !input.value.trim() || !box.innerHTML.trim()) return;
    box.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  toggle.addEventListener('click', () => {
    const on = !nav.classList.contains('searching');
    nav.classList.toggle('searching', on);
    toggle.setAttribute('aria-expanded', String(on));
    if (on) { closeMenu(); input.focus(); } else close();
  });

  clear.addEventListener('click', () => {
    input.value = ''; clear.hidden = true; lastQ = null; close(); input.focus();
  });

  function render(d) {
    const parts = [];
    if (d.words.length) {
      parts.push('<div class="sx-h">词条</div>');
      for (const w of d.words.slice(0, 4)) {
        parts.push(`<a class="sx-i word" role="option" aria-selected="false" href="${esc(viewHref(w.view, w.term || d.q, w.link))}">
          <b class="ja" lang="ja">${mark(w.key, d.terms)}</b>
          ${w.en ? `<span class="en">${mark(w.en, d.terms)}</span>` : ''}
          ${w.gloss ? `<span>${mark(w.gloss, d.terms)}</span>` : ''}
          <em>${esc(w.item.title)}${w.label ? ' · ' + esc(w.label) : ''}</em></a>`);
      }
    }
    const rest = d.results.filter((r) => !d.words.some((w) => w.view === r.view && w.key && r.hits[0]?.key === w.key)).slice(0, 5);
    if (rest.length) {
      parts.push('<div class="sx-h">内容</div>');
      for (const r of rest) {
        const h = r.hits[0];
        parts.push(`<a class="sx-i" role="option" aria-selected="false" href="${esc(viewHref(r.view, h?.term || d.q, h?.link || ''))}">
          <b>${esc(r.itemTitle)} <span class="chip ${esc(r.type)}">${r.type === 'test' ? '测试' : '资料'}</span></b>
          ${h ? `<span class="ja" lang="ja">${h.snippet.head ? '…' : ''}${mark(h.snippet.text, d.terms)}${h.snippet.tail ? '…' : ''}</span>` : ''}
          <em>${esc(r.topicTitle)}${h?.label ? ' · ' + esc(h.label) : ''}${r.total > 1 ? ` · ${r.total} 处` : ''}</em></a>`);
      }
    }
    if (!parts.length) {
      box.innerHTML = `<div class="sx-none">没有找到「${esc(d.q)}」<a href="/s?q=${encodeURIComponent(d.q)}">打开搜索页 →</a></div>`;
    } else {
      parts.push(`<a class="sx-all" role="option" aria-selected="false" href="/s?q=${encodeURIComponent(d.q)}">查看全部结果（${d.counts.hits} 处 · ${d.counts.items} 个文件）→</a>`);
      box.innerHTML = parts.join('');
    }
    items = [...box.querySelectorAll('a')];
    items.forEach((a, i) => { a.id = 'sx-opt-' + i; });
    active = -1;
    openPanel();
  }

  async function run(q) {
    if (q === lastQ) { openPanel(); return; }
    lastQ = q;
    const my = ++seq;
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=12`, { cache: 'no-store' });
      if (my !== seq) return;
      if (!r.ok) throw new Error('HTTP ' + r.status);
      render(await r.json());
    } catch (e) {
      if (my !== seq) return;
      lastQ = null;                       // let the same query be retried
      box.innerHTML = `<div class="sx-none">搜索暂时不可用<a href="/s?q=${encodeURIComponent(q)}">在搜索页重试 →</a></div>`;
      items = [...box.querySelectorAll('a')];
      openPanel();
    }
  }

  function onInput() {
    const q = input.value.trim();
    clear.hidden = !input.value;
    clearTimeout(timer);
    if (composing) return;                // wait for the IME to commit
    if (!q) { close(); lastQ = null; return; }
    wantOpen = true;
    timer = setTimeout(() => run(q), 170);
  }
  input.addEventListener('input', onInput);
  input.addEventListener('compositionstart', () => { composing = true; });
  input.addEventListener('compositionend', () => { composing = false; onInput(); });
  input.addEventListener('focus', () => { if (input.value.trim() && box.innerHTML.trim()) { wantOpen = true; openPanel(); } });

  function move(d) {
    if (box.hidden || !items.length) return;
    let next = active + d;
    if (next < -1) next = items.length - 1;
    if (next >= items.length) next = -1;
    active = next;
    items.forEach((a, i) => { a.classList.toggle('on', i === active); a.setAttribute('aria-selected', String(i === active)); });
    if (active >= 0) {
      items[active].scrollIntoView({ block: 'nearest' });
      input.setAttribute('aria-activedescendant', items[active].id);
    } else input.removeAttribute('aria-activedescendant');
  }

  input.addEventListener('keydown', (e) => {
    if (e.isComposing || composing || e.keyCode === 229) return;   // mid-IME
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Escape') { close(); input.blur(); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); items[active].click(); }
  });

  form.addEventListener('submit', (e) => { if (!input.value.trim()) e.preventDefault(); });
  form.addEventListener('focusout', (e) => { if (!form.contains(e.relatedTarget)) close(); });
  document.addEventListener('click', (e) => {
    if (!form.contains(e.target) && !toggle.contains(e.target)) close();
  });

  // "/" focuses search from anywhere on the site (not while typing or composing)
  document.addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    e.preventDefault();
    closeMenu();
    nav.classList.add('searching');
    toggle.setAttribute('aria-expanded', 'true');
    input.focus();
    input.select();
  });

  if (input.value) clear.hidden = false;
  // the results page owns the query; keep the navbar box in step with it
  window.addEventListener('jp:query', (e) => { input.value = e.detail || ''; clear.hidden = !input.value; lastQ = null; });

  // any [data-wizard] element opens the wizard (falls back to /new/ if it's not loaded)
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-wizard]');
    if (!b) return;
    e.preventDefault();
    if (window.JPWizard) window.JPWizard.open({ slug: b.dataset.wizard || undefined });
    else location.href = '/new/';
  });

  if (!document.body.dataset.nofoot) {
    const f = document.createElement('footer');
    f.className = 'foot';
    f.innerHTML = `<span>${SITE.name} · ${SITE.host}</span><span><a href="/s">搜索</a> · <a href="/">首页</a> · <a href="/new/">新建专题</a> · <a href="https://www.jjconnect.jp/">jjconnect.jp</a></span>`;
    document.body.append(f);
  }
})();
