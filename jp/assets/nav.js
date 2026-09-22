/* Navbar + footer, injected on every page. Site name lives here only. */
(function () {
  const SITE = { name: '日语学习', mark: '日', host: 'jp.jjconnect.jp' };
  const LINKS = [
    ['/', '首页'],
    ['/#topics', '专题'],
    ['/#tests', '在线测试'],
    ['/#materials', '学习资料'],
  ];
  const path = location.pathname.replace(/\/index\.html$/, '/');
  const nav = document.createElement('header');
  nav.className = 'nav';
  nav.innerHTML = `
    <div class="in">
      <a class="brand" href="/"><span class="mark">${SITE.mark}</span>${SITE.name}<small>${SITE.host}</small></a>
      <nav class="links" id="navLinks">${LINKS.map(([h, t]) => {
        const cur = (h === '/' && path === '/') || (h !== '/' && !h.includes('#') && path.startsWith(h));
        return `<a href="${h}"${cur ? ' aria-current="page"' : ''}>${t}</a>`;
      }).join('')}</nav>
      <span class="sp"></span>
      <button class="new" type="button" data-wizard title="新建专题 / 上传资料">＋<span>新建</span></button>
      <button class="burger" type="button" aria-label="菜单" aria-expanded="false">☰</button>
    </div>`;
  document.body.prepend(nav);

  const burger = nav.querySelector('.burger');
  const links = nav.querySelector('#navLinks');
  burger.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
  });
  links.addEventListener('click', () => links.classList.remove('open'));

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
    f.innerHTML = `<span>${SITE.name} · ${SITE.host}</span><span><a href="/">首页</a> · <a href="/new/">新建专题</a> · <a href="https://www.jjconnect.jp/">jjconnect.jp</a></span>`;
    document.body.append(f);
  }
})();
