const esc=s=>String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
const GYO=["全部","カ行","ガ行","サ行","タ行","ナ行","バ行","マ行","ラ行","ワア行"];
const GYO_NOTE={"カ行":"く → いて","ガ行":"ぐ → いで","サ行":"す → して（不音便）","タ行":"つ → って","ナ行":"ぬ → んで（只有 死ぬ 一族）","バ行":"ぶ → んで","マ行":"む → んで","ラ行":"る → って","ワア行":"う → って（否定 わ）"};
const TH=[["頻度 ≥ 1000（常用）",1000],["≥ 100",100],["≥ 10",10],["全部",0]];
let gyo="全部",th=1000,ie=false,q="";
const $=id=>document.getElementById(id);
function hl(s){s=String(s);if(!q)return esc(s);const i=s.indexOf(q);return i<0?esc(s):esc(s.slice(0,i))+"<mark>"+esc(s.slice(i,i+q.length))+"</mark>"+esc(s.slice(i+q.length))}
function render(){
  const rows=GODAN.filter(r=>(gyo==="全部"||r[2]===gyo)&&r[3]>=th&&(!ie||r[5].includes("ie"))&&(!q||r[0].includes(q)||r[1].includes(q)));
  $("cnt").textContent=`${rows.length} / ${GODAN.length}`;
  $("note").textContent=gyo==="全部"?"":`${gyo}：${GYO_NOTE[gyo]}`;
  const max=400;
  $("tb").innerHTML=rows.slice(0,max).map((r,i)=>`<tr${r[5].includes("ie")?' class="ie"':""}>
    <td class="n">${GODAN.indexOf(r)+1}</td>
    <td class="ja hw" lang="ja">${hl(r[0])}<span class="yomi">${hl(r[1])}</span></td>
    <td><span class="k">${esc(r[2])}</span></td>
    <td class="n">${r[3].toLocaleString()}</td>
    <td class="n">${r[4]}</td>
    <td class="note">${[r[6]?esc(r[6]):"",r[5].includes("ie")?"い・え段＋る，像一段":"",r[5].includes("混")?"混種（片仮名・新造 等）":"",r[5].includes("複")?"複合動詞":"",r[5].includes("規則")?"UniDic 未收，按词尾判定":""].filter(Boolean).join("　·　")}</td></tr>`).join("")
    +(rows.length>max?`<tr><td colspan="6" class="more">只显示前 ${max} 条，请缩小范围或检索。</td></tr>`:"");
}
$("gyo").innerHTML=GYO.map(k=>`<button data-k="${k}" aria-pressed="${k===gyo}">${k}</button>`).join("");
$("th").innerHTML=TH.map(([n,v])=>`<button data-v="${v}" aria-pressed="${v===th}">${n}</button>`).join("");
$("gyo").onclick=e=>{const b=e.target.closest("button");if(!b)return;gyo=b.dataset.k;[...e.currentTarget.children].forEach(x=>x.setAttribute("aria-pressed",x===b));render()};
$("th").onclick=e=>{const b=e.target.closest("button");if(!b)return;th=+b.dataset.v;[...e.currentTarget.children].forEach(x=>x.setAttribute("aria-pressed",x===b));render()};
$("ie").onchange=e=>{ie=e.target.checked;render()};
$("q").oninput=e=>{q=e.target.value.trim();if(q)th=0,[...$("th").children].forEach(x=>x.setAttribute("aria-pressed",x.dataset.v==="0"));render()};
$("meta").textContent=`来源：${GODAN_META.source}。語彙表里动词 ${GODAN_META.verbs.toLocaleString()} 个，其中五段 ${GODAN_META.godan.toLocaleString()}、一段 ${GODAN_META.ichidan.toLocaleString()}，其余为 する・来る 及文語。頻度＝该词在约 1 亿词的语料里出现的次数，pmw＝每百万词出现次数。`;
try{const p=new URLSearchParams(location.search).get("q");if(p){$("q").value=p;q=p.trim();th=0;render()}}catch(e){}
render();
