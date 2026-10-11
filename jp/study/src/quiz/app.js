const SETS=[
 {name:"基础 100题",lv:[null,{n:"入门",c:"var(--l1)"},{n:"初级",c:"var(--l2)"},{n:"中级",c:"var(--l3)"},{n:"中高级",c:"var(--l4)"},{n:"高级",c:"var(--l5)"}],raw:Q},
 {name:"进阶 100题",lv:[null,{n:"时间・先后",c:"var(--l1)"},{n:"紧接・因果",c:"var(--l2)"},{n:"转折・让步",c:"var(--l3)"},{n:"条件・并列",c:"var(--l4)"},{n:"商务・公文",c:"var(--l5)"}],raw:Q2},
 {name:"文型・語彙 100题",lv:[null,{n:"文型①句尾",c:"var(--l1)"},{n:"文型②接续",c:"var(--l2)"},{n:"文型③授受推量",c:"var(--l3)"},{n:"語彙①动词名词",c:"var(--l4)"},{n:"語彙②副词惯用",c:"var(--l5)"}],raw:Q3},
 {name:"一览实战 100题",lv:[null,{n:"并列・添加",c:"var(--l1)"},{n:"转折・因果",c:"var(--l2)"},{n:"时间・条件",c:"var(--l3)"},{n:"选择・说明",c:"var(--l4)"},{n:"转换・目的・综合",c:"var(--l5)"}],raw:Q4}];
const KEY="jp-setsuzoku-200-v2";
function rng(s){return()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff}}
SETS.forEach((S,si)=>{S.items=S.raw.map((q,i)=>{const r=rng((i+1)*7919+17+si*131);const idx=[0,1,2,3];
  for(let j=3;j>0;j--){const k=Math.floor(r()*(j+1));[idx[j],idx[k]]=[idx[k],idx[j]]}
  return{lv:q[0],stem:q[1],opts:idx.map(x=>q[2][x]),ans:idx.indexOf(0),exp:q[3],correct:q[2][0]}})});
let st={set:0,a:[{},{},{}],cur:[0,0,0],f:0,mode:"practice",range:0,count:20,exam:null};
try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&Array.isArray(s.a))st=Object.assign(st,s);
  else{const o=JSON.parse(localStorage.getItem("jp-setsuzoku-100-v1"));if(o&&o.a)st.a[0]=o.a}}catch(e){}
while(st.a.length<SETS.length){st.a.push({});st.cur.push(0)}
const SET=()=>SETS[st.set], IT=()=>SET().items, LVS=()=>SET().lv, ANS=()=>st.a[st.set];
const CUR=()=>st.cur[st.set], setCur=v=>{st.cur[st.set]=v};
function save(){try{localStorage.setItem(KEY,JSON.stringify(st))}catch(e){}}
const $=id=>document.getElementById(id);
const esc=s=>s.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
const fill=(it,txt)=>esc(it.stem).replace(/（　）/g,`<span class="blank">${txt}</span>`);
const lvTag=it=>`<i style="background:${LVS()[it.lv].c}"></i>${LVS()[it.lv].n}`;

/* ---------- mode ---------- */
function setTabs(){const el=$("sets");el.innerHTML="";SETS.forEach((S,i)=>{const b=document.createElement("button");
  b.textContent=S.name;b.setAttribute("aria-pressed",st.set===i);
  b.onclick=()=>{if(st.set===i)return;st.set=i;st.f=0;st.range=0;if(st.exam&&!st.exam.end){if(!confirm("正在进行的测验将被放弃，确定切换题库？"))return}st.exam=null;save();render()};el.appendChild(b)})}
function setMode(m){st.mode=m;save();render()}
$("mP").onclick=()=>setMode("practice");$("mE").onclick=()=>setMode("exam");

/* ---------- practice ---------- */
function visible(){return IT().map((_,i)=>i).filter(i=>!st.f||IT()[i].lv===st.f)}
function tabs(){const t=$("tabs");t.innerHTML="";
  [["全部",0],...LVS().slice(1).map((l,i)=>[`${l.n}（${i*20+1}–${i*20+20}）`,i+1])].forEach(([n,v])=>{
    const b=document.createElement("button");b.textContent=n;b.setAttribute("aria-pressed",st.f===v);
    b.onclick=()=>{st.f=v;if(v&&IT()[CUR()].lv!==v)setCur((v-1)*20);save();render()};t.appendChild(b)})}
function grid(){const g=$("grid");g.innerHTML="";
  IT().forEach((it,i)=>{const b=document.createElement("button");const a=ANS()[i];
    b.className=`lv${it.lv}`+(a!=null?(a===it.ans?" ok":" ng"):"")+(i===CUR()?" cur":"")+(st.f&&it.lv!==st.f?" dim":"");
    b.textContent=i+1;b.setAttribute("aria-label",`第${i+1}题`+(a!=null?(a===it.ans?"，答对":"，答错"):""));
    b.onclick=()=>{setCur(i);if(st.f&&it.lv!==st.f)st.f=0;save();render()};g.appendChild(b)})}
function card(){const i=CUR(),it=IT()[i],a=ANS()[i];
  $("lv").innerHTML=lvTag(it);$("no").textContent=`第 ${i+1} 题 / 100`;
  $("stem").innerHTML=fill(it,a!=null?esc(it.correct):"　");
  const o=$("opts");o.innerHTML="";
  it.opts.forEach((t,k)=>{const b=document.createElement("button");b.className="opt ja"+(t.length>12?" long":"");b.lang="ja";
    b.innerHTML=`<span class="k">${k+1}</span><span>${esc(t)}</span>`;
    if(a!=null){b.disabled=true;if(k===it.ans)b.classList.add("right");else if(k===a)b.classList.add("wrong")}
    b.onclick=()=>choose(k);o.appendChild(b)});
  const s=$("stamp");s.className="stamp";
  if(a!=null){s.textContent=a===it.ans?"正解":"誤";s.classList.add(a===it.ans?"ok":"ng","show");
    $("exp").hidden=false;$("ans").innerHTML=`正确答案：<span class="ja" lang="ja">${esc(it.correct)}</span>`;$("why").textContent=it.exp}
  else $("exp").hidden=true;
  const v=visible(),p=v.indexOf(i);$("prev").disabled=p<=0;$("next").disabled=p>=v.length-1}
function choose(k){const i=CUR();if(ANS()[i]!=null)return;ANS()[i]=k;save();card();grid();score();
  const s=$("stamp");s.classList.remove("show");void s.offsetWidth;s.classList.add("show")}
function score(){const keys=Object.keys(ANS());const ok=keys.filter(i=>ANS()[i]===IT()[i].ans).length;
  $("sc").textContent=ok;$("done").textContent=keys.length;$("pct").textContent=keys.length;
  const r=$("result");if(!keys.length){r.innerHTML="";return}
  let h=`<h2>各难度得分</h2><div class="bars">`;
  for(let l=1;l<=5;l++){const ids=IT().map((_,i)=>i).filter(i=>IT()[i].lv===l);const d=ids.filter(i=>ANS()[i]!=null);const c=d.filter(i=>ANS()[i]===IT()[i].ans).length;
    h+=`<div class="bar"><span>${LVS()[l].n}</span><div class="t"><span style="width:${c/20*100}%;background:${LVS()[l].c}"></span></div><span>${c} / ${d.length}</span></div>`}
  r.innerHTML=h+"</div>"}
function go(d){const v=visible(),p=v.indexOf(CUR());const n=v[p+d];if(n!=null){setCur(n);save();render()}}
$("prev").onclick=()=>go(-1);$("next").onclick=()=>go(1);
$("reset").onclick=()=>{if(confirm(`确定清空「${SET().name}」的练习记录？`)){st.a[st.set]={};setCur(0);st.f=0;save();render()}};

/* ---------- exam ---------- */
const RANGES=()=>[["全部",0],...LVS().slice(1).map((l,i)=>[l.n,i+1])];
function counts(){const max=st.range?20:100;return(st.range?[10,20]:[20,50,100]).filter(n=>n<=max)}
function chips(el,list,key){el.innerHTML="";list.forEach(([n,v])=>{const b=document.createElement("button");b.textContent=n;b.setAttribute("aria-pressed",st[key]===v);
  b.onclick=()=>{st[key]=v;if(key==="range"&&!counts().includes(st.count))st.count=counts().slice(-1)[0];save();renderSetup()};el.appendChild(b)})}
function renderSetup(){$("setup").querySelector("h2").textContent=`开始一场测验　·　${SET().name}`;chips($("cRange"),RANGES(),"range");chips($("cCount"),counts().map(n=>[n+" 题",n]),"count")}
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
  $("eLv").innerHTML=`<i style="background:${EL[it.lv].c}"></i>${EL[it.lv].n}`;$("eNo").textContent=`第 ${e.cur+1} 题 / ${n}`;
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
  e.end=Date.now();save();render();window.scrollTo({top:0})}
function grade(p){return p>=90?["秀","var(--midori)"]:p>=75?["優","var(--l3)"]:p>=60?["可","var(--l4)"]:["再","var(--shu)"]}
function renderReport(){const e=st.exam,EI=SETS[e.set].items,EL=SETS[e.set].lv,n=e.ids.length;
  const res=e.ids.map((qi,k)=>({qi,k,a:e.ans[k],ok:e.ans[k]===EI[qi].ans}));
  const c=res.filter(r=>r.ok).length,p=Math.round(c/n*100),[g,gc]=grade(p);
  let h=`<h2>测验结果</h2><div class="top"><div class="pts">${p}<small> 分</small></div><div class="grade" style="color:${gc}">${g}</div>
    <div class="facts">答对 <b>${c}</b> / ${n} 题<br>未作答 <b>${res.filter(r=>r.a==null).length}</b> 题<br>用时 <b>${fmt(e.end-e.start)}</b></div></div><div class="bars">`;
  for(let l=1;l<=5;l++){const rs=res.filter(r=>EI[r.qi].lv===l);if(!rs.length)continue;const ok=rs.filter(r=>r.ok).length;
    h+=`<div class="bar"><span>${EL[l].n}</span><div class="t"><span style="width:${ok/rs.length*100}%;background:${LVS()[l].c}"></span></div><span>${ok} / ${rs.length}</span></div>`}
  h+=`</div><div class="actions"><button class="big" id="again">再考一次</button>${c<n?'<button class="big ghost" id="redo">只重做错题</button>':""}<button class="big ghost" id="toSetup">重新设置</button></div>`;
  const wr=res.filter(r=>!r.ok);
  h+=`<div class="wrongs">`+(wr.length?`<h3>错题解析（${wr.length}）</h3>`+wr.map(r=>{const it=EI[r.qi];
    return `<div class="w"><div class="s ja" lang="ja">${r.k+1}．${fill(it,esc(it.correct))}</div>
    <div class="yo">你的答案：<span class="x ja" lang="ja">${r.a!=null?esc(it.opts[r.a]):"未作答"}</span>　正确答案：<span class="o ja" lang="ja">${esc(it.correct)}</span>　<span style="color:var(--sub)">（原题第 ${r.qi+1} 题・${EL[it.lv].n}）</span></div>
    <div class="e">${esc(it.exp)}</div></div>`}).join(""):`<div class="perfect">全部答对，满分！</div>`)+`</div>`;
  $("report").innerHTML=h;
  $("again").onclick=()=>startExam();
  if($("redo"))$("redo").onclick=()=>startExam(wr.map(r=>r.qi));
  $("toSetup").onclick=()=>{st.exam=null;save();render()}}

/* ---------- keys & render ---------- */
document.addEventListener("keydown",e=>{
  if(st.mode==="practice"){if(e.key>="1"&&e.key<="4")choose(+e.key-1);else if(e.key==="ArrowRight")go(1);else if(e.key==="ArrowLeft")go(-1)}
  else if(st.exam&&!st.exam.end){if(e.key>="1"&&e.key<="4")pick(+e.key-1);else if(e.key==="ArrowRight")$("eNext").click();else if(e.key==="ArrowLeft")$("ePrev").click()}});
function render(){const P=st.mode==="practice";setTabs();
  $("mP").setAttribute("aria-pressed",P);$("mE").setAttribute("aria-pressed",!P);
  $("practice").hidden=!P;$("exam").hidden=P;$("scorebox").hidden=!P;
  clearInterval(timer);
  if(P){tabs();grid();card();score();return}
  const e=st.exam;
  $("setup").hidden=!!e;$("running").hidden=!(e&&!e.end);$("report").hidden=!(e&&e.end);
  if(!e)renderSetup();else if(!e.end){renderRun();timer=setInterval(tick,1000)}else renderReport()}
render();
