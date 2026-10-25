const HL=[null,{n:"基本",c:"var(--l1)"},{n:"応用",c:"var(--l2)"}];
// 词义行：語（読み）　中文 · English；题干里已经有这个词，不泄露答案
const CFG={key:"jp-doushi2-v1",title:"動詞 実務",wordInfo:false,gloss:it=>it.w1?`${it.w1}${it.w2&&it.w2!==it.w1?"（"+it.w2+"）":""}　${it.w3}`:"",sets:[
 {name:"連用形の用法 20题",lv:HL,raw:D1},
 {name:"祈使の階段 20题",lv:HL,raw:D2},
 {name:"否定と特殊動詞 20题",lv:HL,raw:D3},
 {name:"時制 20题",lv:HL,raw:D4},
 {name:"条件 と・ば・たら・なら 20题",lv:HL,raw:D5},
 // 頻出動詞：BCCWJ 五段動詞一覧（src/doushi-godan/data.js）の上位 100 語から、既出でない 50 語を 10 語ずつ。1 語につき 基本 1・応用 1
 {name:"頻出動詞① 1–20位",lv:HL,raw:D6},
 {name:"頻出動詞② 21–40位",lv:HL,raw:D7},
 {name:"頻出動詞③ 41–60位",lv:HL,raw:D8},
 {name:"頻出動詞④ 61–80位",lv:HL,raw:D9},
 {name:"頻出動詞⑤ 81–100位",lv:HL,raw:D10}]};
