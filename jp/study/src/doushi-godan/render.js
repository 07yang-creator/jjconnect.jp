const esc=s=>String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
/* 読み → ローマ字，辞書形旁边标出词干末尾：五段 ka<b>k</b>-u（辅音结尾），一段 tab<b>e</b>-ru（元音结尾） */
const RK={あ:"a",い:"i",う:"u",え:"e",お:"o",か:"ka",き:"ki",く:"ku",け:"ke",こ:"ko",さ:"sa",し:"shi",す:"su",せ:"se",そ:"so",た:"ta",ち:"chi",つ:"tsu",て:"te",と:"to",な:"na",に:"ni",ぬ:"nu",ね:"ne",の:"no",は:"ha",ひ:"hi",ふ:"fu",へ:"he",ほ:"ho",ま:"ma",み:"mi",む:"mu",め:"me",も:"mo",や:"ya",ゆ:"yu",よ:"yo",ら:"ra",り:"ri",る:"ru",れ:"re",ろ:"ro",わ:"wa",を:"o",ん:"n",が:"ga",ぎ:"gi",ぐ:"gu",げ:"ge",ご:"go",ざ:"za",じ:"ji",ず:"zu",ぜ:"ze",ぞ:"zo",だ:"da",ぢ:"ji",づ:"zu",で:"de",ど:"do",ば:"ba",び:"bi",ぶ:"bu",べ:"be",ぼ:"bo",ぱ:"pa",ぴ:"pi",ぷ:"pu",ぺ:"pe",ぽ:"po",きゃ:"kya",きゅ:"kyu",きょ:"kyo",しゃ:"sha",しゅ:"shu",しょ:"sho",ちゃ:"cha",ちゅ:"chu",ちょ:"cho",にゃ:"nya",にゅ:"nyu",にょ:"nyo",ひゃ:"hya",ひゅ:"hyu",ひょ:"hyo",みゃ:"mya",みゅ:"myu",みょ:"myo",りゃ:"rya",りゅ:"ryu",りょ:"ryo",ぎゃ:"gya",ぎゅ:"gyu",ぎょ:"gyo",じゃ:"ja",じゅ:"ju",じょ:"jo",びゃ:"bya",びゅ:"byu",びょ:"byo",ぴゃ:"pya",ぴゅ:"pyu",ぴょ:"pyo"};
function romaji(h){let o="";for(let i=0;i<h.length;i++){const c=h[i],d=h[i+1];if(c==="っ"){const nx=RK[h.slice(i+1,i+3)]||RK[d]||"";o+=nx[0]||"";continue}if(d&&RK[c+d]){o+=RK[c+d];i++;continue}o+=RK[c]||c}return o}
const STEM_C={う:"w",く:"k",ぐ:"g",す:"s",つ:"t",ぬ:"n",ぶ:"b",む:"m",る:"r"};
function romStem(yomi,cls){const y=yomi.replace(/（.*/,"");if(cls==="五段"){const c=STEM_C[y.slice(-1)];return c?romaji(y.slice(0,-1))+"<b>"+c+"</b>-u":""}if(cls==="一段"){const b=romaji(y.slice(0,-1));return b?b.slice(0,-1)+"<b>"+b.slice(-1)+"</b>-ru":""}return ""}
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
    <td class="ja hw" lang="ja">${hl(r[0])}<span class="yomi">${hl(r[1])}<i class="rm">${romStem(r[1],"五段")}</i></span></td>
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
