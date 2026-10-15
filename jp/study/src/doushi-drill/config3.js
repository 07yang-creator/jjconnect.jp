const FL=[null,{n:"基本：ます・ない・て・た",c:"var(--l1)"},{n:"条件・意志・命令",c:"var(--l2)"},{n:"派生：可能・受身・使役",c:"var(--l3)"}];
const CFG={key:"jp-katsuyo3-v1",title:"頻度順ドリル 五段 100",wordInfo:false,gloss:it=>`${it.w1}${it.w2!==it.w1?"（"+it.w2+"）":""}　${it.w3}`,sets:[
 {name:"最常用 1–20 位（全 11 形）",lv:FL,raw:FQ1},
 {name:"21–50 位（每词 7 形）",lv:FL,raw:FQ2},
 {name:"51–100 位（每词 4 形）",lv:FL,raw:FQ3}]};
CFG.sets.forEach(S=>S.name+=` ${S.raw.length}题`);
