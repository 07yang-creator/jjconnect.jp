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
/* 読み → ローマ字，辞書形旁边标出词干末尾：五段 ka<b>k</b>-u（辅音结尾），一段 tab<b>e</b>-ru（元音结尾） */
const RK={あ:"a",い:"i",う:"u",え:"e",お:"o",か:"ka",き:"ki",く:"ku",け:"ke",こ:"ko",さ:"sa",し:"shi",す:"su",せ:"se",そ:"so",た:"ta",ち:"chi",つ:"tsu",て:"te",と:"to",な:"na",に:"ni",ぬ:"nu",ね:"ne",の:"no",は:"ha",ひ:"hi",ふ:"fu",へ:"he",ほ:"ho",ま:"ma",み:"mi",む:"mu",め:"me",も:"mo",や:"ya",ゆ:"yu",よ:"yo",ら:"ra",り:"ri",る:"ru",れ:"re",ろ:"ro",わ:"wa",を:"o",ん:"n",が:"ga",ぎ:"gi",ぐ:"gu",げ:"ge",ご:"go",ざ:"za",じ:"ji",ず:"zu",ぜ:"ze",ぞ:"zo",だ:"da",ぢ:"ji",づ:"zu",で:"de",ど:"do",ば:"ba",び:"bi",ぶ:"bu",べ:"be",ぼ:"bo",ぱ:"pa",ぴ:"pi",ぷ:"pu",ぺ:"pe",ぽ:"po",きゃ:"kya",きゅ:"kyu",きょ:"kyo",しゃ:"sha",しゅ:"shu",しょ:"sho",ちゃ:"cha",ちゅ:"chu",ちょ:"cho",にゃ:"nya",にゅ:"nyu",にょ:"nyo",ひゃ:"hya",ひゅ:"hyu",ひょ:"hyo",みゃ:"mya",みゅ:"myu",みょ:"myo",りゃ:"rya",りゅ:"ryu",りょ:"ryo",ぎゃ:"gya",ぎゅ:"gyu",ぎょ:"gyo",じゃ:"ja",じゅ:"ju",じょ:"jo",びゃ:"bya",びゅ:"byu",びょ:"byo",ぴゃ:"pya",ぴゅ:"pyu",ぴょ:"pyo"};
function romaji(h){let o="";for(let i=0;i<h.length;i++){const c=h[i],d=h[i+1];if(c==="っ"){const nx=RK[h.slice(i+1,i+3)]||RK[d]||"";o+=nx[0]||"";continue}if(d&&RK[c+d]){o+=RK[c+d];i++;continue}o+=RK[c]||c}return o}
const STEM_C={う:"w",く:"k",ぐ:"g",す:"s",つ:"t",ぬ:"n",ぶ:"b",む:"m",る:"r"};
function romStem(yomi,cls){const y=yomi.replace(/（.*/,"");if(cls==="五段"){const c=STEM_C[y.slice(-1)];return c?romaji(y.slice(0,-1))+"<b>"+c+"</b>-u":""}if(cls==="一段"){const b=romaji(y.slice(0,-1));return b?b.slice(0,-1)+"<b>"+b.slice(-1)+"</b>-ru":""}return ""}

const KCLS={"五段":"g5","一段":"g1","特殊":"gs"},KORD={"五段":0,"一段":1,"特殊":2}; // 每组内 五段→一段→特殊 排列，五段行浅色底
const VGROUPS=[...new Set(VERBS.map(r=>r[11]))];
/* 活用表按段排：辞書形（う段）｜あ段：ない・受身・使役｜い段：ます｜え段：命令・可能｜お段：意志。
   未然形・連用形不单列（它们不是能独立使用的词），ない形・ます形・意志形由数据里的未然形／連用形推出；每格与辞書形不同的部分着色 */
const OROW={か:"こ",が:"ご",さ:"そ",た:"と",な:"の",ば:"ぼ",ま:"も",ら:"ろ",わ:"お"};
const suf=(s,x)=>!s||s==="—"?"—":s.includes("（")?s.replace(/^(.*?)（(.*?)）$/,`$1${x}（$2${x}）`):s+x;
function derive(r){const k=r[0],nai=k==="ある"?"ない":suf(r[3],"ない"),masu=suf(r[4],"ます");let ishi;
  if(k==="ある")ishi="—";else if(k==="来る")ishi="来よう（こよう）";else if(r[2]!=="五段")ishi=r[4]+"よう";
  else{const m=r[3],l=m[m.length-1];ishi=OROW[l]?m.slice(0,-1)+OROW[l]+"う":"—"}
  return{nai,masu,ishi,te:teForm(r)}}
// て形＝連用形＋て，五段按連用形末尾的假名走音便（行く 例外）；一段・特殊直接＋て
function teForm(r){const ren=r[4];if(!ren||ren==="—")return "—";const conv=s=>{if(r[2]!=="五段")return s+"て";const last=s.slice(-1),b=s.slice(0,-1);if(r[0]==="行く")return b+"って";return last==="き"?b+"いて":last==="ぎ"?b+"いで":last==="し"?s+"て":"ちいり".includes(last)?b+"って":"にびみ".includes(last)?b+"んで":s+"て"};const m=ren.match(/^(.*?)（(.*?)）$/);return m?`${conv(m[1])}（${conv(m[2])}）`:conv(ren)}
// 严格按 あ・い・う・え・お 排：辞書形（う段）放在 い段 和 え段 之间
// 第三个元素 true＝该列是一个段的第一列，画分隔线
// ます形不单列：連用形＋ます 是標準的連用用法
const VC1=[[(r,d)=>d.nai,"hk",1],[r=>r[8],"uk"],[r=>r[7],"sk"],[r=>r[4],"hk",1],[(r,d)=>d.te,"hk"]],VC2=[[r=>r[6],"hk",1],[r=>r[9],r=>r[9]===r[8]?"uk":"kn"],[(r,d)=>d.ishi,"hk",1]]; // 可能形与受身形同形（一段・来る）时用同一种颜色，一眼看出是同一个形
const vcell=(base,r,d)=>([g,c,gs])=>`<td class="ja${gs?" gs":""}" lang="ja">${fcell(base,g(r,d),typeof c==="function"?c(r):c)}</td>`;
const VHEAD=`<thead><tr><th rowspan="3">類</th><th colspan="3" class="gs">あ段</th><th colspan="2" class="gs">い段</th><th class="gs">う段</th><th colspan="2" class="gs">え段</th><th class="gs">お段</th><th rowspan="3" class="gs">備考</th></tr>
<tr><th rowspan="2" class="gs">ない</th><th rowspan="2">受身</th><th rowspan="2">使役</th><th class="gs">連用</th><th>て形</th><th rowspan="2" class="gs">辞書形</th><th rowspan="2" class="gs">命令</th><th rowspan="2">可能</th><th rowspan="2" class="gs">意志</th></tr>
<tr class="sub"><th class="gs">＋ます＝ます形</th><th>連用形＋て（五段音便）<br>て→た＝た形</th></tr></thead>`;
const VLEGEND=`<ol class="legend lg">
<li><b>列按段排</b>：あ段＝ない・受身・使役，い段＝連用形・て形，う段＝辞書形，え段＝命令・可能，お段＝意志。一段动词没有段，一律去 る 接后缀。</li>
<li><b>不单列的三个</b>：未然形（＝ない形去掉 ない）、仮定形（＝え段＋ば：書けば・食べれば）、ます形（＝連用形＋ます）。它们都是「底座＋后缀」，看对应的那一列就有。て形单列，是因为五段要过音便（行き→行って），た形＝て→た。</li>
<li><b>連用形还能接</b>：たい・ながら・やすい／にくい・そうだ・すぎる・に行く・なさい・方；中止法 〜し、；敬語 お＋連用形＋する／ください；本身当名词（支払い・申し込み）。详见「連用形の用法」。</li>
<li><b>着色</b>＝与辞書形不同的部分：<span class="f kn">可能形</span>・<span class="f uk">受身形</span>・<span class="f sk">使役形</span>・<span class="f hk">其他</span>。可能形与受身形同形时同色：食べ<span class="f uk">られる</span>／食べ<span class="f uk">られる</span>（意思靠助词和语境分）。</li>
<li><b>罗马字</b>（读音右边）标出词干末尾：五段 ka<b class="rmb">k</b>-u 辅音结尾，一段 tab<b class="rmb">e</b>-ru 元音结尾，后缀接在连字符后面。</li>
<li><i class="sw"></i><b>浅色底</b>＝五段（换段的），无底色＝一段（去る的）・特殊；每组内五段在前。類 旁的 <span class="jt ji">自</span><span class="jt ta">他</span>＝有自他对子，備考里 ⇄ 后面是对方（出自<a href="/v/jita/map.html" target="_top">自他動詞マップ</a>和下面的自他表）。</li>
</ol>`;
function fcell(base,s,cls){if(!s||s==="—")return hl(s||"");let i=0;while(i<s.length&&i<base.length&&s[i]===base[i])i++;return (hl(s.slice(0,i))+(i<s.length?`<span class="f ${cls}">${hl(s.slice(i))}</span>`:"")).replace(/（([^）]+)）/g,'<small class="rd">$1</small>')} // 括号里的读音另起一小行，特殊动词不撑宽整列
function verbsSection(){return `
<section id="katsuyo-hyo">
  <span class="cat">活用表</span>
  <h2><span class="ja" lang="ja">五段八形 ── 動詞活用表（${VERBS.length} 語・${VGROUPS.length} 組）</span></h2>
  <ol class="lead memo">
    <li><b>先定类</b>：五段还是一段（非る→五段；a・u・o＋る→五段；i・e 在送り仮名里→一段；漢字一拍＋る 背九个一段）。</li>
    <li><b>五段</b>＝词尾换段再接后缀：あ段＋ない・れる・せる，い段＋ます・て，え段＝命令／＋ば／＋る（可能），お段＋う（意志）。</li>
    <li><b>一段</b>＝去 る 直接接：ない・ます・て・れば・ろ・よう・られる（可能＝受身）・させる。</li>
    <li><b>て形</b>五段过音便：く→いて、ぐ→いで、う・つ・る→って、む・ぶ・ぬ→んで、す→して；行く→行って。</li>
    <li><b>特殊</b>只有 する・来る；例外四个：ある→ない、くれる→くれ、行く→行って、問う→問うて。</li>
  </ol>
  <p class="lead">按意思分成 ${VGROUPS.length} 组，列按 あ・い・う・え・お 的段排；表的读法见筛选框下面的六条。</p>
  <div class="filters"><div class="chips" id="vf">${["全部","五段","一段","特殊"].map(k=>`<button data-k="${k}" aria-pressed="${k==="全部"}">${k}</button>`).join("")}</div>
  <input id="vq" type="search" placeholder="検索：辞書形・読み・活用形（例：られる）" aria-label="活用表检索"><span class="cnt" id="vcnt"></span></div>
  ${VLEGEND}
  <div class="vgnav" id="vgnav">${VGROUPS.map((g,i)=>`<a href="#vg-${i}">${esc(g)}</a>`).join("")}</div>
  <div id="vt"></div>
</section>`}
let vk="全部",vq="";
function hl(s){if(!vq)return esc(s);const i=s.indexOf(vq);return i<0?esc(s):esc(s.slice(0,i))+"<mark>"+esc(s.slice(i,i+vq.length))+"</mark>"+esc(s.slice(i+vq.length))}
const vrow=(r,cb)=>{const base=r[0].split("（")[0],d=derive(r);return `<tr class="${KCLS[r[2]]}${cb?" cb":""}">
    <td><span class="k ${KCLS[r[2]]}">${r[2]}</span>${JITA[base]?`<span class="jt ${JITA[base][0]==="自"?"ji":"ta"}" title="${JITA[base][0]==="自"?"自動詞，他動詞は":"他動詞，自動詞は"} ${esc(JITA[base][1])}">${JITA[base][0]}</span>`:""}</td>
    ${VC1.map(vcell(base,r,d)).join("")}
    <td class="ja hw gs" lang="ja">${hl(r[0].split("（")[0])}${r[0].includes("（")?`<span class="yomi">${hl(r[0].slice(r[0].indexOf("（")+1,-1))}</span>`:""}<span class="yomi">${hl(r[1])}${(rm=>rm?`<i class="rm">${rm}</i>`:"")(romStem(r[1],r[2]))}</span>${r[13]?`<span class="yomi imi">${hl(r[13])}${r[14]?" · "+hl(r[14]):""}</span>`:""}</td>
    ${VC2.map(vcell(base,r,d)).join("")}
    <td class="note gs">${JITA[base]?`<span class="jtp">⇄ ${esc(JITA[base][1])}</span>`:""}${hl(r[10])}</td></tr>`};
function renderVerbs(){
  const rows=VERBS.filter(r=>(vk==="全部"||r[2]===vk)&&(!vq||[...r.slice(0,11),r[13]||"",(r[14]||"").toLowerCase(),...Object.values(derive(r))].some(c=>c.includes(vq.toLowerCase()))));
  document.getElementById("vt").innerHTML=VGROUPS.map((g,i)=>{let rs=rows.filter(r=>r[11]===g);if(!rs.length)return "";
    rs=rs.map((r,k)=>[r,k]).sort((a,b)=>(KORD[a[0][2]]-KORD[b[0][2]])||(a[1]-b[1])).map(x=>x[0]);
    return `<h3 class="vg" id="vg-${i}"><span class="ja" lang="ja">${esc(g)}</span><small>${rs.length} 語</small></h3><div class="tw"><table>${VHEAD}<tbody>${rs.map((r,i)=>vrow(r,i>0&&rs[i-1][2]!==r[2])).join("")}</tbody></table></div>`}).join("")
    ||`<p style="color:var(--sub)">没有匹配的词</p>`;
  document.getElementById("vcnt").textContent=`${rows.length} / ${VERBS.length}`;
  unifyCols();
}
/* 七张组表共用一套列宽：按各列内容的最大需要定前 10 列，備考吃掉剩余 */
function unifyCols(){const ts=[...document.querySelectorAll("#vt table")];if(!ts.length)return;const N=11,w=Array(N).fill(0);
  ts.forEach(t=>{t.style.tableLayout="auto";t.style.width="max-content";t.querySelectorAll("colgroup").forEach(c=>c.remove());t.querySelector("thead").style.display="none"}); // 量宽时不算表头，表头第三行的注可以换行
  ts.forEach(t=>{const tr=t.querySelector("tbody tr");if(tr)[...tr.children].forEach((td,i)=>{w[i]=Math.max(w[i],td.getBoundingClientRect().width)})});
  w[6]=Math.min(w[6],120); // 辞書形列（第 7 列）封顶：释义行允许换行，不让它挤掉備考
  ts.forEach(t=>{t.querySelector("thead").style.display="";const cg=document.createElement("colgroup");for(let i=0;i<N;i++){const c=document.createElement("col");if(i<N-1)c.style.width=Math.ceil(w[i])+"px";cg.appendChild(c)}t.insertBefore(cg,t.firstChild);t.style.tableLayout="fixed";t.style.width="100%"})}

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
SEC.forEach(s=>{navParts.find(p=>p[0]===s.p)[1].push(secLink(s));if(s.id==="keimei")navParts[0][1].push(link("katsuyo-hyo","表",`五段八形 活用表（${VERBS.length}語）`))}); // 活用表紧跟「形の名前の整理」，在变形规则之前
document.getElementById("nav").innerHTML=navParts.map(([p,ls])=>`<p class="nt">${PARTS[p]}</p>`+ls.join("")).join("");
let html="",lastP=0;
SEC.forEach(s=>{
  if(s.p!==lastP){html+=`<div class="partbar">${PARTS[s.p]}</div>`;if(s.p===3)html+=pairsSection();lastP=s.p}
  html+=section(s);if(s.id==="keimei")html+=verbsSection();
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
