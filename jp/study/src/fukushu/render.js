const esc=s=>s.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
const link=s=>`<a href="#${s.id}"><span class="c">${esc(s.cat)}</span>${esc(s.t.split("（")[0].split(" / ")[0])}</a>`;
document.getElementById("nav").innerHTML=`<p class="nt">第一部　文型</p>`+SEC.filter(s=>s.p===1).map(link).join("")+`<p class="nt">第二部　語彙</p>`+SEC.filter(s=>s.p===2).map(link).join("");
document.getElementById("main").innerHTML=SEC.map((s,i)=>`
${i===0?'<div class="partbar">第一部　文型編</div>':""}${s.p===2&&SEC[i-1].p===1?'<div class="partbar">第二部　語彙編</div>':""}
<section id="${s.id}">
  <span class="cat">${esc(s.cat)}</span>
  <h2><span class="ja" lang="ja">${esc(s.t)}</span></h2>
  <p class="lead">${esc(s.lead)}</p>
  <table><thead><tr>${s.tb[0].map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead>
  <tbody>${s.tb.slice(1).map(r=>`<tr>${r.map((c,j)=>`<td${j===0?' class="ja" lang="ja"':""}>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>
  <div class="ex">${s.ex.map(([ok,ja,zh])=>`<div class="e ${ok?"o":"x"}"><div class="m">${ok?"○":"×"}</div><div><div class="s ja" lang="ja">${esc(ja)}</div><div class="n">${esc(zh)}</div></div></div>`).join("")}</div>
  <div class="tip"><b>记法　</b>${esc(s.tip)}</div>
</section>`).join("");
const links=[...document.querySelectorAll("#nav a")];
const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){links.forEach(a=>a.classList.toggle("on",a.getAttribute("href")==="#"+e.target.id))}})},{rootMargin:"-70px 0px -70% 0px"});
document.querySelectorAll("section").forEach(s=>io.observe(s));
const topBtn=document.getElementById("top");
addEventListener("scroll",()=>topBtn.classList.toggle("show",scrollY>600));
topBtn.onclick=()=>scrollTo({top:0,behavior:"smooth"});
