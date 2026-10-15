const HL=[null,{n:"基本",c:"var(--l1)"},{n:"応用",c:"var(--l2)"}];
// 词义行：語（読み）　中文 · English；题干里已经有这个词，不泄露答案
const CFG={key:"jp-doushi2-v1",title:"動詞 実務",wordInfo:false,gloss:it=>it.w1?`${it.w1}${it.w2&&it.w2!==it.w1?"（"+it.w2+"）":""}　${it.w3}`:"",sets:[
 {name:"連用形の用法 20题",lv:HL,raw:D1},
 {name:"祈使の階段 20题",lv:HL,raw:D2},
 {name:"否定と特殊動詞 20题",lv:HL,raw:D3},
 {name:"時制 20题",lv:HL,raw:D4},
 {name:"条件 と・ば・たら・なら 20题",lv:HL,raw:D5}]};
