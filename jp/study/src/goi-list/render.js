const esc=s=>String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
const LIST=[
 {name:"名詞",lv:["日常・生活","社会・仕事","抽象・漢語","読み"],raw:QA},
 {name:"動詞",lv:["日常動作","変化・状態","人間関係・心理","複合・漢語動詞"],raw:QB},
 {name:"形容詞",lv:["い形容詞①","い形容詞②","な形容詞①","な形容詞②"],raw:QC},
 {name:"副詞・接続詞・その他",lv:["程度・頻度","様態・陳述","接続詞","カタカナ語・擬態語"],raw:QD}];
const ROWS=[];LIST.forEach((S,si)=>S.raw.forEach((q,i)=>ROWS.push({si,i,g:q[0],word:q[4]||q[2][0],yomi:q[5]||"",zh:q[6]||"",ex:q[1].replace(/（　）/g,"〔"+q[2][0]+"〕"),ans:q[2][0]})));
let sk=-1,sq="";
const hl=s=>{if(!sq)return esc(s);const i=s.indexOf(sq);return i<0?esc(s):esc(s.slice(0,i))+"<mark>"+esc(s.slice(i,i+sq.length))+"</mark>"+esc(s.slice(i+sq.length))};
const exHtml=r=>hl(r.ex).replace(/〔([^〕]*)〕/g,"<b>$1</b>");
function render(){
  const rows=ROWS.filter(r=>(sk<0||r.si===sk)&&(!sq||[r.word,r.yomi,r.zh,r.ex].some(c=>c.includes(sq))));
  document.getElementById("main").innerHTML=LIST.map((S,si)=>{const rs=rows.filter(r=>r.si===si);if(!rs.length)return "";
    return `<section id="s${si}"><h2>${esc(S.name)}<small style="font-size:13px;color:var(--sub);font-weight:400">　${rs.length} 语</small></h2>`+
      S.lv.map((g,gi)=>{const gr=rs.filter(r=>r.g===gi+1);if(!gr.length)return "";
        return `<h3>${esc(g)}<small>${gr.length} 语</small></h3><table><thead><tr><th>単語</th><th>読み</th><th>意味</th><th>例文（题干）</th></tr></thead><tbody>${gr.map(r=>`<tr><td class="w ja" lang="ja">${hl(r.word)}</td><td class="y ja" lang="ja">${hl(r.yomi)}</td><td>${hl(r.zh)}</td><td class="e ja" lang="ja">${exHtml(r)}</td></tr>`).join("")}</tbody></table>`}).join("")+`</section>`}).join("")||`<p class="empty">没有匹配的词。</p>`;
  document.getElementById("scnt").textContent=`${rows.length} / ${ROWS.length}`;
}
const sf=document.getElementById("sf");
[["全部",-1],...LIST.map((S,i)=>[S.name,i])].forEach(([n,v])=>{const b=document.createElement("button");b.textContent=n;b.setAttribute("aria-pressed",sk===v);
  b.onclick=()=>{sk=v;[...sf.children].forEach(x=>x.setAttribute("aria-pressed",x===b));render()};sf.appendChild(b)});
document.getElementById("sq").oninput=e=>{sq=e.target.value.trim();render()};
try{const q=new URLSearchParams(location.search).get("q");if(q){document.getElementById("sq").value=q;sq=q.trim()}}catch(e){}
render();
