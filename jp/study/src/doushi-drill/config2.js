const KL=[null,{n:"五段",c:"var(--l1)"},{n:"一段",c:"var(--l2)"},{n:"五段（る・例外）",c:"var(--l3)"},{n:"特殊（する・来る）",c:"var(--l4)"}];
const CFG={key:"jp-katsuyo2-v1",title:"動詞活用ドリル② 派生形",wordInfo:false,sets:[
 {name:"可能形",lv:KL,raw:F_kanou},
 {name:"受身形",lv:KL,raw:F_ukemi},
 {name:"使役形",lv:KL,raw:F_shieki},
 {name:"使役受身形",lv:KL,raw:F_shiekiukemi}]};
CFG.sets.forEach(S=>S.name+=` ${S.raw.length}题`);
