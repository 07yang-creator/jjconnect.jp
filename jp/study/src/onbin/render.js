const esc=s=>String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
const PARTS={1:"第一部　音便",2:"第二部　「ん」の正体"};
const link=(id,cat,t)=>`<a href="#${id}"><span class="c">${esc(cat)}</span>${esc(t)}</a>`;
const secLink=s=>link(s.id,s.cat,s.t.split("──")[0].split("（")[0].trim());

/* ---------- 讲解 ---------- */
function section(s){return `
<section id="${s.id}">
  <span class="cat">${esc(s.cat)}</span>
  <h2><span class="ja" lang="ja">${esc(s.t)}</span></h2>
  <p class="lead">${esc(s.lead)}</p>
  <table><thead><tr>${s.tb[0].map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead>
  <tbody>${s.tb.slice(1).map(r=>`<tr>${r.map((c,j)=>`<td${j===0?' class="ja" lang="ja"':""}>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>
  <div class="ex">${s.ex.map(([ok,ja,zh])=>`<div class="e ${ok?"o":"x"}"><div class="m">${ok?"○":"×"}</div><div><div class="s ja" lang="ja">${esc(ja)}</div><div class="n">${esc(zh)}</div></div></div>`).join("")}</div>
  <div class="tip"><b>记法　</b>${esc(s.tip)}</div>
</section>`}

/* ---------- 音便一覧 ---------- */
const OCLS={"撥音便":"hn","促音便":"sk","イ音便":"io","ウ音便":"uo","なし":"no"};
const OSUB={"撥音便":"む・ぶ・ぬ → んで／んだ","促音便":"う・つ・る → って／った（＋例外 行く）","イ音便":"く → いて／ぐ → いで","ウ音便":"く → う：挨拶の中に残る・問う→問うて","なし":"す・一段・する・来る：連用形のまま"};
const OGROUPS=[...new Set(VERBS.map(r=>r[3]))];
const OHEAD=`<thead><tr><th>音便</th><th>語</th><th>語尾</th><th>て形</th><th>た形</th><th>備考</th></tr></thead>`;
function verbsSection(){return `
<section id="onbin-hyo">
  <span class="cat">一覧表</span>
  <h2><span class="ja" lang="ja">音便一覧（${VERBS.length} 語）</span></h2>
  <p class="lead">按音便的种类分五组，每组按词尾排。配套测验的全部动词都在这张表里；可按类别筛选，或输入辞書形・読み・て形・意思检索。</p>
  <div class="filters"><div class="chips" id="vf">${["全部",...OGROUPS].map(k=>`<button data-k="${k}" aria-pressed="${k==="全部"}">${k==="なし"?"音便なし":k}</button>`).join("")}</div>
  <input id="vq" type="search" placeholder="検索：読む・よんで・read…" aria-label="一覧表检索"><span class="cnt" id="vcnt"></span></div>
  <div class="vgnav" id="vgnav">${OGROUPS.map((g,i)=>`<a href="#vg-${i}">${g==="なし"?"音便なし":g}</a>`).join("")}</div>
  <div id="vt"></div>
</section>`}
let vk="全部",vq="";
function hl(s){s=String(s);if(!vq)return esc(s);const i=s.toLowerCase().indexOf(vq.toLowerCase());return i<0?esc(s):esc(s.slice(0,i))+"<mark>"+esc(s.slice(i,i+vq.length))+"</mark>"+esc(s.slice(i+vq.length))}
const vrow=r=>`<tr>
    <td><span class="k ${OCLS[r[3]]}">${r[3]==="なし"?"音便なし":r[3]}</span></td>
    <td class="ja hw" lang="ja">${hl(r[0])}<span class="yomi">${hl(r[1])}</span><span class="yomi imi">${hl(r[6])} · ${hl(r[7])}</span></td>
    <td class="ja" lang="ja">${hl(r[2])}</td><td class="ja" lang="ja">${hl(r[4])}</td><td class="ja" lang="ja">${hl(r[5])}</td>
    <td class="note">${hl(r[8])}</td></tr>`;
function renderVerbs(){
  const q=vq.toLowerCase();
  const rows=VERBS.filter(r=>(vk==="全部"||r[3]===vk)&&(!q||r.slice(0,9).some(c=>String(c).toLowerCase().includes(q))));
  document.getElementById("vt").innerHTML=OGROUPS.map((g,i)=>{const rs=rows.filter(r=>r[3]===g);if(!rs.length)return "";
    return `<h3 class="vg" id="vg-${i}"><span class="ja" lang="ja">${g==="なし"?"音便なし":g}</span><small>${esc(OSUB[g])}　·　${rs.length} 語</small></h3><div class="tw"><table>${OHEAD}<tbody>${rs.map(vrow).join("")}</tbody></table></div>`}).join("")
    ||`<p style="color:var(--sub)">没有匹配的词</p>`;
  document.getElementById("vcnt").textContent=`${rows.length} / ${VERBS.length}`;
}

/* ---------- 组装 ---------- */
const navParts=[[1,[]],[2,[]]];
SEC.forEach(s=>navParts.find(p=>p[0]===s.p)[1].push(secLink(s)));
navParts[0][1].push(link("onbin-hyo","表",`音便一覧（${VERBS.length}語）`));
document.getElementById("nav").innerHTML=navParts.map(([p,ls])=>`<p class="nt">${PARTS[p]}</p>`+ls.join("")).join("");
let html="",lastP=0;
SEC.forEach(s=>{
  if(s.p!==lastP){if(lastP===1)html+=verbsSection();html+=`<div class="partbar">${PARTS[s.p]}</div>`;lastP=s.p}
  html+=section(s);
});
document.getElementById("main").innerHTML=html;
document.getElementById("fcount").textContent=`音便一覧 ${VERBS.length} 語・讲解 ${SEC.length} 组`;
renderVerbs();
document.getElementById("vf").onclick=e=>{const b=e.target.closest("button");if(!b)return;vk=b.dataset.k;[...e.currentTarget.children].forEach(x=>x.setAttribute("aria-pressed",x===b));renderVerbs()};
document.getElementById("vq").oninput=e=>{vq=e.target.value.trim();renderVerbs()};
/* 站内搜索的深链接 ?q= ：预填一览表检索 */
try{const q=new URLSearchParams(location.search).get("q");if(q){const el=document.getElementById("vq");el.value=q;vq=q.trim();renderVerbs();if(VERBS.some(r=>r.slice(0,8).some(c=>String(c).includes(vq))))document.getElementById("onbin-hyo").scrollIntoView()}}catch(e){}

const links=[...document.querySelectorAll("#nav a")];
const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){links.forEach(a=>a.classList.toggle("on",a.getAttribute("href")==="#"+e.target.id))}})},{rootMargin:"-70px 0px -70% 0px"});
document.querySelectorAll("section").forEach(s=>io.observe(s));
const topBtn=document.getElementById("top");
addEventListener("scroll",()=>topBtn.classList.toggle("show",scrollY>600));
topBtn.onclick=()=>scrollTo({top:0,behavior:"smooth"});
