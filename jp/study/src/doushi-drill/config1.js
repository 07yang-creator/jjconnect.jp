const KL=[null,{n:"五段",c:"var(--l1)"},{n:"一段",c:"var(--l2)"},{n:"五段（る・例外）",c:"var(--l3)"},{n:"特殊（する・来る・ある）",c:"var(--l4)"}];
const CFG={key:"jp-katsuyo1-v1",title:"動詞活用ドリル① 基本活用",wordInfo:false,gloss:it=>`${it.w1}${it.w2!==it.w1?"（"+it.w2+"）":""}　${it.w3}`,sets:[
 {name:"ます形",lv:KL,raw:F_masu},
 {name:"ない形",lv:KL,raw:F_nai},
 {name:"て形",lv:KL,raw:F_te},
 {name:"た形",lv:KL,raw:F_ta},
 {name:"意志形",lv:KL,raw:F_ishi},
 {name:"命令形",lv:KL,raw:F_meirei},
 {name:"仮定形",lv:KL,raw:F_katei}]};
CFG.sets.forEach(S=>S.name+=` ${S.raw.length}题`);
