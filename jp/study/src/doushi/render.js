const esc=s=>String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
const PARTS={1:"第一部　活用",2:"第二部　受身形",3:"第三部　自動詞・他動詞"};
const link=(id,cat,t)=>`<a href="#${id}"><span class="c">${esc(cat)}</span>${esc(t)}</a>`;
const secLink=s=>link(s.id,s.cat,s.t.split("──")[0].split("（")[0].trim());

/* ---------- 讲解 ---------- */
/* 表格・例句里的 ｛…｝ ＝ 与辞書形不同的部分，按列头或行头的形着色（仮定 kt・可能 kn・受身 uk・使役 sk・使役受身 su），
   没有形的用 s.hk（节的默认色）或 hk（茶色） */
const FKEY=x=>{const s=String(x).replace(/^[あいうえお]段[^：]*：/,"");return /^使役受身/.test(s)?"su":/^受身/.test(s)?"uk":/^使役/.test(s)?"sk":/^可能/.test(s)?"kn":/^仮定/.test(s)?"kt":null};
const mk=(s,key)=>esc(s).replace(/｛(.+?)｝/g,`<span class="f ${key}">$1</span>`);
function section(s){const hd=s.tb[0],dk=s.hk||"hk";return `
<section id="${s.id}">
  <span class="cat">${esc(s.cat)}</span>
  <h2><span class="ja" lang="ja">${esc(s.t)}</span></h2>
  <p class="lead">${esc(s.lead)}</p>
  ${s.wide?'<div class="tw">':""}<table><thead><tr>${hd.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead>
  <tbody>${s.tb.slice(1).map(r=>`<tr>${r.map((c,j)=>`<td${j===0?' class="ja" lang="ja"':""}>${mk(c,FKEY(hd[j])||FKEY(r[0])||dk)}</td>`).join("")}</tr>`).join("")}</tbody></table>${s.wide?"</div>":""}
  <div class="ex">${s.ex.map(([ok,ja,zh])=>`<div class="e ${ok?"o":"x"}"><div class="m">${ok?"○":"×"}</div><div><div class="s ja" lang="ja">${mk(ja,dk)}</div><div class="n">${esc(zh)}</div></div></div>`).join("")}</div>
  <div class="tip"><b>记法　</b>${esc(s.tip)}</div>
</section>`}

/* ---------- 活用表 ---------- */
const KCLS={"五段":"g5","一段":"g1","特殊":"gs"},KORD={"五段":0,"一段":1,"特殊":2}; // 每组内 五段→一段→特殊 排列，五段行浅色底
const VGROUPS=[...new Set(VERBS.map(r=>r[11]))];
/* 活用表按段排：辞書形（う段）｜あ段：ない・受身・使役｜い段：ます｜え段：命令・可能｜お段：意志。
   未然形・連用形不单列（它们不是能独立使用的词），ない形・ます形・意志形由数据里的未然形／連用形推出；每格与辞書形不同的部分着色 */
const OROW={か:"こ",が:"ご",さ:"そ",た:"と",な:"の",ば:"ぼ",ま:"も",ら:"ろ",わ:"お"};
const suf=(s,x)=>!s||s==="—"?"—":s.includes("（")?s.replace(/^(.*?)（(.*?)）$/,`$1${x}（$2${x}）`):s+x;
function derive(r){const k=r[0],nai=k==="ある"?"ない":suf(r[3],"ない"),masu=suf(r[4],"ます");let ishi;
  if(k==="ある")ishi="—";else if(k==="来る")ishi="来よう（こよう）";else if(r[2]!=="五段")ishi=r[4]+"よう";
  else{const m=r[3],l=m[m.length-1];ishi=OROW[l]?m.slice(0,-1)+OROW[l]+"う":"—"}
  return{nai,masu,ishi}}
// 严格按 あ・い・う・え・お 排：辞書形（う段）放在 い段 和 え段 之间
// 第三个元素 true＝该列是一个段的第一列，画分隔线
const VC1=[[(r,d)=>d.nai,"hk",1],[r=>r[8],"uk"],[r=>r[7],"sk"],[r=>r[4],"hk",1],[(r,d)=>d.masu,"hk"]],VC2=[[r=>r[6],"hk",1],[r=>r[9],"kn"],[(r,d)=>d.ishi,"hk",1]];
const vcell=(base,r,d)=>([g,c,gs])=>`<td class="ja${gs?" gs":""}" lang="ja">${fcell(base,g(r,d),c)}</td>`;
const VHEAD=`<thead><tr><th rowspan="2">類</th><th colspan="3" class="gs">あ段</th><th colspan="2" class="gs">い段</th><th rowspan="2" class="gs">辞書形<small class="dan">う段</small></th><th colspan="2" class="gs">え段</th><th class="gs">お段</th><th rowspan="2" class="gs">備考</th></tr>
<tr><th class="gs">ない</th><th>受身</th><th>使役</th><th class="gs">連用</th><th>ます</th><th class="gs">命令</th><th>可能</th><th class="gs">意志</th></tr></thead>`;
const VLEGEND=`<div class="legend">列严格按 あ・い・う・え・お 排，竖线隔开每个段：あ段＝ない・受身・使役，い段＝連用形・ます（て形＝連用形＋音便），う段＝辞書形，え段＝命令・可能，お段＝意志（一段动词没有段，一律去 る 接后缀）。着色＝与辞書形不同的部分：<span class="f kn">可能形</span>・<span class="f uk">受身形</span>・<span class="f sk">使役形</span>・<span class="f hk">其他</span>；可能・受身：書<span class="f kn">ける</span>／書<span class="f uk">かれる</span>，一段同形 食べ<span class="f kn">られる</span>／食べ<span class="f uk">られる</span>。て形见<a href="/v/onbin/material.html" target="_top">音便</a>，仮定＝え段＋ば。<br><i class="sw"></i>浅色底＝五段（换段的）；无底色＝一段（去る的）・特殊。每组内五段在前，一段在后。</div>`;
function fcell(base,s,cls){if(!s||s==="—")return hl(s||"");let i=0;while(i<s.length&&i<base.length&&s[i]===base[i])i++;return hl(s.slice(0,i))+(i<s.length?`<span class="f ${cls}">${hl(s.slice(i))}</span>`:"")}
function verbsSection(){return `
<section id="katsuyo-hyo">
  <span class="cat">活用表</span>
  <h2><span class="ja" lang="ja">五段八形 ── 動詞活用表（${VERBS.length} 語・${VGROUPS.length} 組）</span></h2>
  <p class="lead">按意思分成 ${VGROUPS.length} 组，列按 あ・い・う・え・お 的段排。未然形・仮定形这些「半个词」不单列（ない形＝未然形＋ない，仮定＝え段＋ば）；連用形留着，因为它能独立用（中止法・名词化・お〜する）。一段的可能形写标准形，口语的ら抜き形在备注栏。各形的做法见下面的「活用の作り方」和「五段の段の対応」。可按类别筛选或输入任何活用形检索。</p>
  <div class="filters"><div class="chips" id="vf">${["全部","五段","一段","特殊"].map(k=>`<button data-k="${k}" aria-pressed="${k==="全部"}">${k}</button>`).join("")}</div>
  <input id="vq" type="search" placeholder="検索：辞書形・読み・活用形（例：られる）" aria-label="活用表检索"><span class="cnt" id="vcnt"></span></div>
  ${VLEGEND}
  <div class="vgnav" id="vgnav">${VGROUPS.map((g,i)=>`<a href="#vg-${i}">${esc(g)}</a>`).join("")}</div>
  <div id="vt"></div>
</section>`}
let vk="全部",vq="";
function hl(s){if(!vq)return esc(s);const i=s.indexOf(vq);return i<0?esc(s):esc(s.slice(0,i))+"<mark>"+esc(s.slice(i,i+vq.length))+"</mark>"+esc(s.slice(i+vq.length))}
const vrow=(r,cb)=>{const base=r[0].split("（")[0],d=derive(r);return `<tr class="${KCLS[r[2]]}${cb?" cb":""}">
    <td><span class="k ${KCLS[r[2]]}">${r[2]}</span></td>
    ${VC1.map(vcell(base,r,d)).join("")}
    <td class="ja hw gs" lang="ja">${hl(r[0])}<span class="yomi">${hl(r[1])}</span>${r[13]?`<span class="yomi imi">${hl(r[13])}${r[14]?" · "+hl(r[14]):""}</span>`:""}</td>
    ${VC2.map(vcell(base,r,d)).join("")}
    <td class="note gs">${hl(r[10])}</td></tr>`};
function renderVerbs(){
  const rows=VERBS.filter(r=>(vk==="全部"||r[2]===vk)&&(!vq||[...r.slice(0,11),r[13]||"",(r[14]||"").toLowerCase(),...Object.values(derive(r))].some(c=>c.includes(vq.toLowerCase()))));
  document.getElementById("vt").innerHTML=VGROUPS.map((g,i)=>{let rs=rows.filter(r=>r[11]===g);if(!rs.length)return "";
    rs=rs.map((r,k)=>[r,k]).sort((a,b)=>(KORD[a[0][2]]-KORD[b[0][2]])||(a[1]-b[1])).map(x=>x[0]);
    return `<h3 class="vg" id="vg-${i}"><span class="ja" lang="ja">${esc(g)}</span><small>${rs.length} 語</small></h3><div class="tw"><table>${VHEAD}<tbody>${rs.map((r,i)=>vrow(r,i>0&&rs[i-1][2]!==r[2])).join("")}</tbody></table></div>`}).join("")
    ||`<p style="color:var(--sub)">没有匹配的词</p>`;
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
const navParts=[[1,[]],[2,[]],[3,[link("jita-hyo","表","自他対応表（46組）")]]];
SEC.forEach(s=>{navParts.find(p=>p[0]===s.p)[1].push(secLink(s));if(s.id==="mikiwake")navParts[0][1].push(link("katsuyo-hyo","表",`五段八形 活用表（${VERBS.length}語）`))}); // 活用表紧跟 見分け方，在变形规则之前
document.getElementById("nav").innerHTML=navParts.map(([p,ls])=>`<p class="nt">${PARTS[p]}</p>`+ls.join("")).join("");
let html="",lastP=0;
SEC.forEach(s=>{
  if(s.p!==lastP){html+=`<div class="partbar">${PARTS[s.p]}</div>`;if(s.p===3)html+=pairsSection();lastP=s.p}
  html+=section(s);if(s.id==="mikiwake")html+=verbsSection();
});
document.getElementById("main").innerHTML=html;
document.getElementById("fcount").textContent=`活用表 ${VERBS.length} 词（${VGROUPS.length} 组）・自他 ${PAIRS.length} 组・讲解 ${SEC.length} 组`;
renderVerbs();renderPairs();
document.getElementById("vf").onclick=e=>{const b=e.target.closest("button");if(!b)return;vk=b.dataset.k;[...e.currentTarget.children].forEach(x=>x.setAttribute("aria-pressed",x===b));renderVerbs()};
document.getElementById("vq").oninput=e=>{vq=e.target.value.trim();renderVerbs()};
document.getElementById("pf").onclick=e=>{const b=e.target.closest("button");if(!b)return;pk=b.dataset.k;[...e.currentTarget.children].forEach(x=>x.setAttribute("aria-pressed",x===b));renderPairs()};
document.getElementById("pt").onclick=e=>{const b=e.target.closest("button");if(!b)return;pty=b.dataset.k;[...e.currentTarget.children].forEach(x=>x.setAttribute("aria-pressed",x===b));renderPairs()};
/* 站内搜索的深链接 ?q= ：预填活用表检索 */
try{const q=new URLSearchParams(location.search).get("q");if(q){const el=document.getElementById("vq");el.value=q;vq=q.trim();renderVerbs();if(VERBS.some(r=>r.slice(0,11).some(c=>c.includes(vq))))document.getElementById("katsuyo-hyo").scrollIntoView()}}catch(e){}

const links=[...document.querySelectorAll("#nav a")];
const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){links.forEach(a=>a.classList.toggle("on",a.getAttribute("href")==="#"+e.target.id))}})},{rootMargin:"-70px 0px -70% 0px"});
document.querySelectorAll("section").forEach(s=>io.observe(s));
const topBtn=document.getElementById("top");
addEventListener("scroll",()=>topBtn.classList.toggle("show",scrollY>600));
topBtn.onclick=()=>scrollTo({top:0,behavior:"smooth"});
