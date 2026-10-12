const GL=[null,{n:"第1组 -ar／-e",c:"var(--l1)"},{n:"第2组 -r／-s",c:"var(--l2)"},{n:"第3组 ＋-as",c:"var(--l3)"},{n:"第4组 -i／-os",c:"var(--l4)"},{n:"第5A组 自＋e",c:"var(--l5)"},{n:"第5B组 他＋e",c:"var(--l6)"},{n:"例外组 -ase",c:"var(--l7)"}];
const SETS=[
 {name:"自→他 124题",lv:GL,raw:Q1},
 {name:"他→自 124题",lv:GL,raw:Q2},
 {name:"受身形 124题",lv:GL,raw:Q3},
 {name:"使役形 124题",lv:GL,raw:Q4},
 {name:"ている／てある 124题",lv:GL,raw:Q5},
 {name:"自他判定 124题",lv:GL,raw:Q6}];
const KEY="jp-jita-v1";
function rng(s){return()=>{s=(Math.imul(s,1103515245)+12345)&0x7fffffff;return s/0x7fffffff}}
// option order is fixed per question, but a set gets a new seed whenever its practice record is reset
function buildItems(si){const S=SETS[si],salt=st.salt[si]||0;S.items=S.raw.map((q,i)=>{const r=rng((i+1)*7919+17+si*131+salt*7001);const idx=[0,1,2,3];
  for(let j=3;j>0;j--){const k=Math.floor(r()*(j+1));[idx[j],idx[k]]=[idx[k],idx[j]]}
  return{lv:q[0],stem:q[1],opts:idx.map(x=>q[2][x]),ans:idx.indexOf(0),exp:q[3],correct:q[2][0],ji:q[4]||"",ta:q[5]||""}})}
let st={set:0,a:[],cur:[],f:0,mode:"practice",range:0,count:20,exam:null,salt:[],mist:[]};
try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&Array.isArray(s.a))st=Object.assign(st,s)}catch(e){}
for(const k of ["a","cur","salt","mist"])if(!Array.isArray(st[k]))st[k]=[];
while(st.a.length<SETS.length)st.a.push({});while(st.cur.length<SETS.length)st.cur.push(0);
while(st.salt.length<SETS.length)st.salt.push(0);while(st.mist.length<SETS.length)st.mist.push({});
if(st.mode==="review")st.mode="practice";
SETS.forEach((_,si)=>buildItems(si));
const SET=()=>SETS[st.set], IT=()=>SET().items, LVS=()=>SET().lv, ANS=()=>st.a[st.set], N=()=>IT().length, MIST=()=>st.mist[st.set];
const CUR=()=>st.cur[st.set], setCur=v=>{st.cur[st.set]=v};
function save(){try{localStorage.setItem(KEY,JSON.stringify(st))}catch(e){}}
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
const fill=(it,txt)=>esc(it.stem).replace(/（　）/g,`<span class="blank">${txt}</span>`);
const lvTag=(it,L)=>`<i style="background:${(L||LVS())[it.lv].c}"></i>${(L||LVS())[it.lv].n}`;
const lvIds=(items,l)=>items.map((_,i)=>i).filter(i=>items[i].lv===l);
const today=()=>new Date().toISOString().slice(0,10);

/* ---------- mistakes ---------- */
function rec(si,i,k){const m=st.mist[si],it=SETS[si].items[i];const e=m[i]||{n:0};e.n++;e.a=k==null?"未作答":it.opts[k];e.t=today();m[i]=e}
const mistTotal=()=>st.mist.reduce((s,m)=>s+Object.keys(m).length,0);
function mistMd(){let md=`# 自他動詞 错题（${today()}）\n\n`,n=0;
  SETS.forEach((S,si)=>{const m=st.mist[si],ids=Object.keys(m).map(Number).sort((a,b)=>a-b);if(!ids.length)return;md+=`## ${S.name}\n\n`;
    ids.forEach(i=>{const it=S.items[i],e=m[i];n++;
      md+=`- **${it.ji}／${it.ta}**　｜ 第 ${i+1} 题・${S.lv[it.lv].n}\n  - ${it.stem}　→　${it.correct}\n  - 你的答案：${e.a}　｜ 错 ${e.n} 次　｜ ${e.t}\n  - ${it.exp}\n`});md+="\n"});
  return n?md:""}
function download(name,text){const b=new Blob([text],{type:"text/markdown;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},0)}
function msg(t){const el=$("rMsg");el.textContent=t;el.hidden=!t;if(t)setTimeout(()=>{if(el.textContent===t){el.textContent="";el.hidden=true}},2500)}
$("rExport").onclick=()=>{const md=mistMd();if(!md)return msg("还没有错题。");try{download(`jita-mistakes-${today()}.md`,md);msg("已导出 Markdown 文件。")}catch(e){msg("浏览器不允许下载，请用「复制」。")}};
$("rCopy").onclick=()=>{const md=mistMd();if(!md)return msg("还没有错题。");(navigator.clipboard?navigator.clipboard.writeText(md):Promise.reject()).then(()=>msg("已复制全部错题到剪贴板。"),()=>{const ta=document.createElement("textarea");ta.value=md;document.body.appendChild(ta);ta.select();try{document.execCommand("copy");msg("已复制全部错题到剪贴板。")}catch(e){msg("复制失败。")}ta.remove()})};
$("rClear").onclick=()=>{if(!Object.keys(MIST()).length)return;if(confirm(`确定清空「${SET().name}」的错题记录？`)){st.mist[st.set]={};rv={cur:0,ans:null};save();render()}};

/* ---------- mode ---------- */
function setTabs(){const el=$("sets");el.innerHTML="";SETS.forEach((S,i)=>{const b=document.createElement("button");
  b.textContent=S.name;b.setAttribute("aria-pressed",st.set===i);
  b.onclick=()=>{if(st.set===i)return;st.set=i;st.f=0;st.range=0;if(st.exam&&!st.exam.end){if(!confirm("正在进行的测验将被放弃，确定切换题库？"))return}st.exam=null;rv={cur:0,ans:null};save();render()};el.appendChild(b)})}
function setMode(m){st.mode=m;rv={cur:0,ans:null};save();render()}
$("mP").onclick=()=>setMode("practice");$("mE").onclick=()=>setMode("exam");$("mR").onclick=()=>setMode("review");

/* ---------- practice ---------- */
function visible(){return IT().map((_,i)=>i).filter(i=>!st.f||IT()[i].lv===st.f)}
function tabs(){const t=$("tabs");t.innerHTML="";
  const lv=LVS().slice(1).map((l,i)=>{const ids=lvIds(IT(),i+1);return ids.length?[`${l.n}（${ids[0]+1}–${ids[ids.length-1]+1}）`,i+1,ids[0]]:null}).filter(Boolean);
  [["全部",0,0],...lv].forEach(([n,v,first])=>{
    const b=document.createElement("button");b.textContent=n;b.setAttribute("aria-pressed",st.f===v);
    b.onclick=()=>{st.f=v;if(v&&IT()[CUR()].lv!==v)setCur(first);save();render()};t.appendChild(b)})}
function grid(){const g=$("grid");g.innerHTML="";
  IT().forEach((it,i)=>{const b=document.createElement("button");const a=ANS()[i];
    b.className=`lv${it.lv}`+(a!=null?(a===it.ans?" ok":" ng"):"")+(i===CUR()?" cur":"")+(st.f&&it.lv!==st.f?" dim":"");
    b.textContent=i+1;b.setAttribute("aria-label",`第${i+1}题`+(a!=null?(a===it.ans?"，答对":"，答错"):""));
    b.onclick=()=>{setCur(i);if(st.f&&it.lv!==st.f)st.f=0;save();render()};g.appendChild(b)})}
function optButtons(el,it,a,onPick){el.innerHTML="";it.opts.forEach((t,k)=>{const b=document.createElement("button");b.className="opt ja"+(t.length>12?" long":"");b.lang="ja";
    b.innerHTML=`<span class="k">${k+1}</span><span>${esc(t)}</span>`;
    if(a!=null){b.disabled=true;if(k===it.ans)b.classList.add("right");else if(k===a)b.classList.add("wrong")}
    b.onclick=()=>onPick(k);el.appendChild(b)})}
function stampExp(p,it,a){const s=$(p+"Stamp");s.className="stamp";
  if(a!=null){s.textContent=a===it.ans?"正解":"誤";s.classList.add(a===it.ans?"ok":"ng","show");
    $(p+"Exp").hidden=false;$(p+"Ans").innerHTML=`正确答案：<span class="ja" lang="ja">${esc(it.correct)}</span>`;$(p+"Why").textContent=it.exp}
  else $(p+"Exp").hidden=true}
function card(){const i=CUR(),it=IT()[i],a=ANS()[i];
  $("lv").innerHTML=lvTag(it);$("no").textContent=`第 ${i+1} 题 / ${N()}`;
  $("stem").innerHTML=fill(it,a!=null?esc(it.correct):"　");
  optButtons($("opts"),it,a,choose);stampExp("",it,a);
  const v=visible(),p=v.indexOf(i);$("prev").disabled=p<=0;$("next").disabled=p>=v.length-1}
function choose(k){const i=CUR();if(ANS()[i]!=null)return;ANS()[i]=k;if(k!==IT()[i].ans)rec(st.set,i,k);save();card();grid();score();modeBadge();
  const s=$("Stamp");s.classList.remove("show");void s.offsetWidth;s.classList.add("show")}
function score(){const keys=Object.keys(ANS());const ok=keys.filter(i=>ANS()[i]===IT()[i].ans).length;
  $("sc").textContent=ok;$("done").textContent=keys.length;$("pct").textContent=Math.round(keys.length/N()*100);
  const r=$("result");if(!keys.length){r.innerHTML="";return}
  let h=`<h2>各组得分</h2><div class="bars">`;
  for(let l=1;l<LVS().length;l++){const ids=lvIds(IT(),l);if(!ids.length)continue;const d=ids.filter(i=>ANS()[i]!=null);const c=d.filter(i=>ANS()[i]===IT()[i].ans).length;
    h+=`<div class="bar"><span>${LVS()[l].n}</span><div class="t"><span style="width:${c/ids.length*100}%;background:${LVS()[l].c}"></span></div><span>${c} / ${d.length}</span></div>`}
  r.innerHTML=h+"</div>"}
function go(d){const v=visible(),p=v.indexOf(CUR());const n=v[p+d];if(n!=null){setCur(n);save();render()}}
$("prev").onclick=()=>go(-1);$("next").onclick=()=>go(1);
$("reset").onclick=()=>{if(confirm(`确定清空「${SET().name}」的练习记录？选项顺序也会重新打乱（错题记录保留）。`)){st.a[st.set]={};setCur(0);st.f=0;
  st.salt[st.set]=1+Math.floor(Math.random()*9998);if(st.exam&&st.exam.set===st.set)st.exam=null;buildItems(st.set);save();render()}};

/* ---------- review (mistakes) ---------- */
let rv={cur:0,ans:null,ok:false};
function rvPool(){return Object.keys(MIST()).map(Number).sort((a,b)=>a-b)}
function renderReview(){const pool=rvPool();
  $("rCount").textContent=`本题库错题 ${pool.length} 题　·　全部 ${mistTotal()} 题`;
  $("rEmpty").hidden=pool.length>0;$("rCard").hidden=!pool.length;$("rGrid").hidden=!pool.length;
  if(!pool.length)return;
  if(rv.cur>=pool.length)rv.cur=0;
  const i=pool[rv.cur],it=IT()[i],e=MIST()[i];
  const g=$("rGrid");g.innerHTML="";g.style.gridTemplateColumns=`repeat(${Math.min(pool.length,20)},1fr)`;
  pool.forEach((qi,k)=>{const b=document.createElement("button");b.className=`lv${IT()[qi].lv}`+(k===rv.cur?" cur":"");b.setAttribute("aria-label",`错题${k+1}`);
    b.onclick=()=>{rv={cur:k,ans:null,ok:false};renderReview()};g.appendChild(b)});
  $("rLv").innerHTML=lvTag(it);$("rNo").textContent=`错题 ${rv.cur+1} / ${pool.length}　（原题第 ${i+1} 题・错 ${e.n} 次）`;
  $("rStem").innerHTML=fill(it,rv.ans!=null?esc(it.correct):"　");
  optButtons($("rOpts"),it,rv.ans,rvChoose);stampExp("r",it,rv.ans);
  $("rPrev").disabled=rv.cur<=0;$("rNext").textContent=rv.ans!=null&&rv.ok?"已移除，下一题":"下一题"}
function rvChoose(k){if(rv.ans!=null)return;const pool=rvPool(),i=pool[rv.cur],it=IT()[i];rv.ans=k;rv.ok=k===it.ans;
  if(rv.ok)delete MIST()[i];else{MIST()[i].n++;MIST()[i].a=it.opts[k];MIST()[i].t=today()}
  save();modeBadge();
  $("rStem").innerHTML=fill(it,esc(it.correct));optButtons($("rOpts"),it,k,()=>{});stampExp("r",it,k);
  $("rNext").textContent=rv.ok?"已移除，下一题":"下一题";$("rCount").textContent=`本题库错题 ${rvPool().length} 题　·　全部 ${mistTotal()} 题`;
  const s=$("rStamp");s.classList.remove("show");void s.offsetWidth;s.classList.add("show")}
$("rNext").onclick=()=>{if(!(rv.ans!=null&&rv.ok))rv.cur++;rv.ans=null;rv.ok=false;renderReview()};
$("rPrev").onclick=()=>{if(rv.cur>0){rv.cur--;rv.ans=null;rv.ok=false;renderReview()}};

/* ---------- exam ---------- */
const RANGES=()=>[["全部",0],...LVS().slice(1).map((l,i)=>[l.n,i+1]).filter(([,v])=>lvIds(IT(),v).length)];
function counts(){const max=st.range?lvIds(IT(),st.range).length:N();return[...new Set([...[10,20,40,60,80,100].filter(n=>n<max),max])].filter(n=>st.range?n<=max:n>=20||n===max)}
function chips(el,list,key){el.innerHTML="";list.forEach(([n,v])=>{const b=document.createElement("button");b.textContent=n;b.setAttribute("aria-pressed",st[key]===v);
  b.onclick=()=>{st[key]=v;if(key==="range"&&!counts().includes(st.count))st.count=counts().slice(-1)[0];save();renderSetup()};el.appendChild(b)})}
function renderSetup(){if(!counts().includes(st.count))st.count=counts().slice(-1)[0];$("setup").querySelector("h2").textContent=`开始一场测验　·　${SET().name}`;chips($("cRange"),RANGES(),"range");chips($("cCount"),counts().map(n=>[n+" 题",n]),"count")}
function startExam(ids){
  if(!ids){let pool=IT().map((_,i)=>i).filter(i=>!st.range||IT()[i].lv===st.range);
    for(let j=pool.length-1;j>0;j--){const k=Math.floor(Math.random()*(j+1));[pool[j],pool[k]]=[pool[k],pool[j]]}
    ids=pool.slice(0,st.count)}
  ids=ids.slice().sort((a,b)=>a-b);
  st.exam={set:st.set,ids,ans:{},cur:0,start:Date.now(),end:null};save();render()}
$("startBtn").onclick=()=>startExam();
const fmt=ms=>{const s=Math.floor(ms/1000);return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")};
let timer=null;
function tick(){const e=st.exam;if(e&&!e.end)$("eTime").textContent=fmt(Date.now()-e.start)}
function renderRun(){const e=st.exam,EI=SETS[e.set].items,EL=SETS[e.set].lv,n=e.ids.length,i=e.ids[e.cur],it=EI[i],a=e.ans[e.cur];
  $("eDone").textContent=Object.keys(e.ans).length;$("eTot").textContent=n;tick();
  const g=$("eGrid");g.innerHTML="";g.style.gridTemplateColumns=`repeat(${Math.min(n,20)},1fr)`;
  e.ids.forEach((qi,k)=>{const b=document.createElement("button");b.className=`lv${EI[qi].lv}`+(e.ans[k]!=null?" sel":"")+(k===e.cur?" cur":"");
    b.setAttribute("aria-label",`第${k+1}题`+(e.ans[k]!=null?"，已答":"，未答"));b.onclick=()=>{e.cur=k;save();renderRun()};g.appendChild(b)});
  $("eLv").innerHTML=lvTag(it,EL);$("eNo").textContent=`第 ${e.cur+1} 题 / ${n}`;
  $("eStem").innerHTML=fill(it,a!=null?esc(it.opts[a]):"　");
  const o=$("eOpts");o.innerHTML="";
  it.opts.forEach((t,k)=>{const b=document.createElement("button");b.className="opt ja"+(t.length>12?" long":"")+(a===k?" picked":"");b.lang="ja";
    b.innerHTML=`<span class="k">${k+1}</span><span>${esc(t)}</span>`;b.onclick=()=>pick(k);o.appendChild(b)});
  $("ePrev").disabled=e.cur<=0;$("eNext").textContent=e.cur>=n-1?"交卷评分":"下一题"}
function pick(k){const e=st.exam;e.ans[e.cur]=k;save();renderRun();
  if(e.cur<e.ids.length-1)setTimeout(()=>{if(st.exam===e&&!e.end){e.cur++;save();renderRun()}},280)}
$("ePrev").onclick=()=>{const e=st.exam;if(e.cur>0){e.cur--;save();renderRun()}};
$("eNext").onclick=()=>{const e=st.exam;if(e.cur<e.ids.length-1){e.cur++;save();renderRun()}else submit()};
$("submitBtn").onclick=submit;
function submit(){const e=st.exam,left=e.ids.length-Object.keys(e.ans).length;
  if(left&&!confirm(`还有 ${left} 题未作答，未答按错误计分。确定交卷？`))return;
  e.end=Date.now();e.ids.forEach((qi,k)=>{if(e.ans[k]!==SETS[e.set].items[qi].ans)rec(e.set,qi,e.ans[k]==null?null:e.ans[k])});save();render();window.scrollTo({top:0})}
function grade(p){return p>=90?["秀","var(--midori)"]:p>=75?["優","var(--l3)"]:p>=60?["可","var(--l4)"]:["再","var(--shu)"]}
function renderReport(){const e=st.exam,EI=SETS[e.set].items,EL=SETS[e.set].lv,n=e.ids.length;
  const res=e.ids.map((qi,k)=>({qi,k,a:e.ans[k],ok:e.ans[k]===EI[qi].ans}));
  const c=res.filter(r=>r.ok).length,p=Math.round(c/n*100),[g,gc]=grade(p);
  let h=`<h2>测验结果</h2><div class="top"><div class="pts">${p}<small> 分</small></div><div class="grade" style="color:${gc}">${g}</div>
    <div class="facts">答对 <b>${c}</b> / ${n} 题<br>未作答 <b>${res.filter(r=>r.a==null).length}</b> 题<br>用时 <b>${fmt(e.end-e.start)}</b></div></div><div class="bars">`;
  for(let l=1;l<EL.length;l++){const rs=res.filter(r=>EI[r.qi].lv===l);if(!rs.length)continue;const ok=rs.filter(r=>r.ok).length;
    h+=`<div class="bar"><span>${EL[l].n}</span><div class="t"><span style="width:${ok/rs.length*100}%;background:${EL[l].c}"></span></div><span>${ok} / ${rs.length}</span></div>`}
  h+=`</div><div class="actions"><button class="big" id="again">再考一次</button>${c<n?'<button class="big ghost" id="redo">只重做错题</button>':""}<button class="big ghost" id="toSetup">重新设置</button></div>`;
  const wr=res.filter(r=>!r.ok);
  h+=`<div class="wrongs">`+(wr.length?`<h3>错题解析（${wr.length}）　<small>已记入错题本</small></h3>`+wr.map(r=>{const it=EI[r.qi];
    return `<div class="w"><div class="s ja" lang="ja">${r.k+1}．${fill(it,esc(it.correct))}　→　${esc(it.correct)}</div>
    <div class="yo">你的答案：<span class="x ja" lang="ja">${r.a!=null?esc(it.opts[r.a]):"未作答"}</span>　正确答案：<span class="o ja" lang="ja">${esc(it.correct)}</span>　<span style="color:var(--sub)">（原题第 ${r.qi+1} 题・${EL[it.lv].n}）</span></div>
    <div class="e">${esc(it.exp)}</div></div>`}).join(""):`<div class="perfect">全部答对，满分！</div>`)+`</div>`;
  $("report").innerHTML=h;
  $("again").onclick=()=>startExam();
  if($("redo"))$("redo").onclick=()=>startExam(wr.map(r=>r.qi));
  $("toSetup").onclick=()=>{st.exam=null;save();render()}}

/* ---------- keys & render ---------- */
document.addEventListener("keydown",e=>{
  if(st.mode==="practice"){if(e.key>="1"&&e.key<="4")choose(+e.key-1);else if(e.key==="ArrowRight")go(1);else if(e.key==="ArrowLeft")go(-1)}
  else if(st.mode==="review"){if(e.key>="1"&&e.key<="4")rvChoose(+e.key-1);else if(e.key==="ArrowRight")$("rNext").click();else if(e.key==="ArrowLeft")$("rPrev").click()}
  else if(st.exam&&!st.exam.end){if(e.key>="1"&&e.key<="4")pick(+e.key-1);else if(e.key==="ArrowRight")$("eNext").click();else if(e.key==="ArrowLeft")$("ePrev").click()}});
function modeBadge(){$("mR").textContent=`错题复习（${mistTotal()}）`}
function render(){const M=st.mode;setTabs();modeBadge();
  $("mP").setAttribute("aria-pressed",M==="practice");$("mE").setAttribute("aria-pressed",M==="exam");$("mR").setAttribute("aria-pressed",M==="review");
  $("practice").hidden=M!=="practice";$("exam").hidden=M!=="exam";$("review").hidden=M!=="review";$("scorebox").hidden=M!=="practice";
  clearInterval(timer);
  if(M==="practice"){tabs();grid();card();score();return}
  if(M==="review"){renderReview();return}
  const e=st.exam;
  $("setup").hidden=!!e;$("running").hidden=!(e&&!e.end);$("report").hidden=!(e&&e.end);
  if(!e)renderSetup();else if(!e.end){renderRun();timer=setInterval(tick,1000)}else renderReport()}
try{const n=+new URLSearchParams(location.search).get("n");if(n>=1&&n<=N()){setCur(n-1);st.f=0;st.mode="practice"}}catch(e){}
render();
