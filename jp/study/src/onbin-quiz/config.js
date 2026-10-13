const OL1=[null,{n:"第1組",c:"var(--l1)"},{n:"第2組",c:"var(--l2)"},{n:"第3組",c:"var(--l3)"},{n:"第4組",c:"var(--l4)"}];
const OL2=[null,{n:"む・ぶ・ぬ",c:"var(--l1)"},{n:"う・つ・る",c:"var(--l2)"},{n:"く・ぐ",c:"var(--l3)"},{n:"す・一段・特殊",c:"var(--l4)"}];
const HL=[null,{n:"基本",c:"var(--l1)"},{n:"応用",c:"var(--l2)"}];
// 词义行：語（読み）　中文 · English；题干里已经有这个词，不泄露答案
const CFG={key:"jp-onbin-v1",title:"音便",wordInfo:false,gloss:it=>it.w1?`${it.w1}${it.w2&&it.w2!==it.w1?"（"+it.w2+"）":""}　${it.w3}`:"",sets:[
 {name:"音便の種類",lv:OL1,raw:O1},
 {name:"て形",lv:OL2,raw:O2},
 {name:"た形・たら・たり・ちゃう",lv:OL2,raw:O3},
 {name:"「ん」の正体",lv:HL,raw:O4},
 {name:"〜んです の接続",lv:HL,raw:O5},
 {name:"実戦",lv:HL,raw:O6}]};
CFG.sets.forEach(S=>S.name+=` ${S.raw.length}题`);
