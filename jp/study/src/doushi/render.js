const esc=s=>String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
const PARTS={1:"第一部　活用",2:"第二部　受身形",3:"第三部　自動詞・他動詞"};
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

/* ---------- 活用表 ---------- */
const KCLS={"五段":"g5","一段":"g1","特殊":"gs"};
function verbsSection(){return `
<section id="katsuyo-hyo">
  <span class="cat">活用表</span>
  <h2><span class="ja" lang="ja">動詞活用表（50 語）</span></h2>
  <p class="lead">終止形・連体形＝辞書形，省略。一段的可能形写标准形，口语的ら抜き形在备注栏。可按类别筛选或输入任何活用形检索。</p>
  <div class="filters"><div class="chips" id="vf">${["全部","五段","一段","特殊"].map(k=>`<button data-k="${k}" aria-pressed="${k==="全部"}">${k}</button>`).join("")}</div>
  <input id="vq" type="search" placeholder="検索：辞書形・読み・活用形（例：られる）" aria-label="活用表检索"><span class="cnt" id="vcnt"></span></div>
  <div class="tw"><table id="vt"><thead><tr><th>辞書形</th><th>類</th><th>未然形</th><th>連用形</th><th>仮定形</th><th>命令形</th><th>使役形</th><th>受身形</th><th>可能形</th><th>備考</th></tr></thead><tbody></tbody></table></div>
</section>`}
let vk="全部",vq="";
function hl(s){if(!vq)return esc(s);const i=s.indexOf(vq);return i<0?esc(s):esc(s.slice(0,i))+"<mark>"+esc(s.slice(i,i+vq.length))+"</mark>"+esc(s.slice(i+vq.length))}
function renderVerbs(){
  const rows=VERBS.filter(r=>(vk==="全部"||r[2]===vk)&&(!vq||r.some(c=>c.includes(vq))));
  document.querySelector("#vt tbody").innerHTML=rows.map(r=>`<tr>
    <td class="ja" lang="ja">${hl(r[0])}<span class="yomi">${hl(r[1])}</span></td>
    <td><span class="k ${KCLS[r[2]]}">${r[2]}</span></td>
    ${r.slice(3,10).map(c=>`<td class="ja" lang="ja">${hl(c)}</td>`).join("")}
    <td class="note">${hl(r[10])}</td></tr>`).join("")||`<tr><td colspan="10" style="color:var(--sub)">没有匹配的词</td></tr>`;
  document.getElementById("vcnt").textContent=`${rows.length} / ${VERBS.length}`;
}

/* ---------- 自他表 ---------- */
const TY={"対":["t1","词汇对子"],"使":["t2","使役代用"],"受":["t3","受身代用"],"類":["t4","近义・用法有别"]};
function pairsSection(){return `
<section id="jita-hyo">
  <span class="cat">自他表</span>
  <h2><span class="ja" lang="ja">自動詞・他動詞 対応表（46 組）</span></h2>
  <p class="lead">按自然現象・情感・動作三类和频度列出。「型」说明右栏是什么：真正的他动词、没有他动词时的使役形、没有自动词时的受身形，或意思相近但用法有别的一组。</p>
  <div class="filters"><div class="chips" id="pf">${["全部","自然現象","情感","動作"].map(k=>`<button data-k="${k}" aria-pressed="${k==="全部"}">${k}</button>`).join("")}</div>
  <div class="chips" id="pt">${["全部","対","使","受","類"].map(k=>`<button data-k="${k}" aria-pressed="${k==="全部"}">${k==="全部"?"全部の型":k}</button>`).join("")}</div><span class="cnt" id="pcnt"></span></div>
  <div class="legend">${Object.entries(TY).map(([k,[c,n]])=>`<span class="ty ${c}">${k}</span>${n}　`).join("")}</div>
  <div class="tw"><table id="pt-table"><thead><tr><th>自動詞</th><th>他動詞（右栏）</th><th>分類</th><th>頻度</th><th>型</th><th>備考</th></tr></thead><tbody></tbody></table></div>
</section>`}
let pk="全部",pty="全部";
function renderPairs(){
  const rows=PAIRS.filter(r=>(pk==="全部"||r[4]===pk)&&(pty==="全部"||r[6]===pty));
  document.querySelector("#pt-table tbody").innerHTML=rows.map(r=>`<tr>
    <td class="ja" lang="ja">${esc(r[0])}<span class="yomi">${esc(r[1])}</span></td>
    <td class="ja" lang="ja">${esc(r[2])}<span class="yomi">${esc(r[3])}</span></td>
    <td>${esc(r[4])}</td><td>${esc(r[5])}</td>
    <td><span class="ty ${TY[r[6]][0]}">${r[6]}</span></td>
    <td class="note">${esc(r[7])}</td></tr>`).join("");
  document.getElementById("pcnt").textContent=`${rows.length} / ${PAIRS.length}`;
}

/* ---------- 组装 ---------- */
const navParts=[[1,[link("katsuyo-hyo","表","活用表（50語）")]],[2,[]],[3,[link("jita-hyo","表","自他対応表（46組）")]]];
SEC.forEach(s=>navParts.find(p=>p[0]===s.p)[1].push(secLink(s)));
document.getElementById("nav").innerHTML=navParts.map(([p,ls])=>`<p class="nt">${PARTS[p]}</p>`+ls.join("")).join("");
let html="",lastP=0;
SEC.forEach(s=>{
  if(s.p!==lastP){html+=`<div class="partbar">${PARTS[s.p]}</div>`;if(s.p===1)html+=verbsSection();if(s.p===3)html+=pairsSection();lastP=s.p}
  html+=section(s);
});
document.getElementById("main").innerHTML=html;
renderVerbs();renderPairs();
document.getElementById("vf").onclick=e=>{const b=e.target.closest("button");if(!b)return;vk=b.dataset.k;[...e.currentTarget.children].forEach(x=>x.setAttribute("aria-pressed",x===b));renderVerbs()};
document.getElementById("vq").oninput=e=>{vq=e.target.value.trim();renderVerbs()};
document.getElementById("pf").onclick=e=>{const b=e.target.closest("button");if(!b)return;pk=b.dataset.k;[...e.currentTarget.children].forEach(x=>x.setAttribute("aria-pressed",x===b));renderPairs()};
document.getElementById("pt").onclick=e=>{const b=e.target.closest("button");if(!b)return;pty=b.dataset.k;[...e.currentTarget.children].forEach(x=>x.setAttribute("aria-pressed",x===b));renderPairs()};
/* 站内搜索的深链接 ?q= ：预填活用表检索 */
try{const q=new URLSearchParams(location.search).get("q");if(q){const el=document.getElementById("vq");el.value=q;vq=q.trim();renderVerbs();if(VERBS.some(r=>r.some(c=>c.includes(vq))))document.getElementById("katsuyo-hyo").scrollIntoView()}}catch(e){}

const links=[...document.querySelectorAll("#nav a")];
const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){links.forEach(a=>a.classList.toggle("on",a.getAttribute("href")==="#"+e.target.id))}})},{rootMargin:"-70px 0px -70% 0px"});
document.querySelectorAll("section").forEach(s=>io.observe(s));
const topBtn=document.getElementById("top");
addEventListener("scroll",()=>topBtn.classList.toggle("show",scrollY>600));
topBtn.onclick=()=>scrollTo({top:0,behavior:"smooth"});
