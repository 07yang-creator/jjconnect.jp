const GL=[null,{n:"第1组 -ar／-e",c:"var(--l1)"},{n:"第2组 -r／-s",c:"var(--l2)"},{n:"第3组 ＋-as",c:"var(--l3)"},{n:"第4组 -i／-os",c:"var(--l4)"},{n:"第5A组 自＋e",c:"var(--l5)"},{n:"第5B组 他＋e",c:"var(--l6)"},{n:"例外组 -ase",c:"var(--l7)"}];
// 词义只给题干里的那个词，不列出对子，否则 自→他／他→自 的答案就露了；自他判定 答完才显示
const CFG={key:"jp-jita-v1",title:"自他動詞",wordInfo:false,gloss:(it,si,done)=>{
  if(si===5&&!done)return "";
  const [zh,en]=it.w3.split(" · "),z=zh.split("／"),e=en.split("／"),one=(w,i)=>`${w}　${z[i]}${e[i]?" · "+e[i]:""}`;
  if(it.stem.startsWith(it.w1+"（"))return one(it.w1,0);
  if(it.stem.startsWith(it.w2+"（"))return one(it.w2,1);
  return `${one(it.w1,0)}／${one(it.w2,1)}`;},sets:[
 {name:"自→他 124题",lv:GL,raw:Q1},
 {name:"他→自 124题",lv:GL,raw:Q2},
 {name:"受身形 124题",lv:GL,raw:Q3},
 {name:"使役形 124题",lv:GL,raw:Q4},
 {name:"ている／てある 124题",lv:GL,raw:Q5},
 {name:"自他判定 124题",lv:GL,raw:Q6}]};
