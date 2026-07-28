/* Vérifie la série d'Elias : multiplicateur, remise à zéro, courbe de vagues. */
const fs=require("fs"),vm=require("vm");
function fakeEl(){const s=new Set();return{children:[],className:"",textContent:"",innerHTML:"",title:"",offsetWidth:0,
style:{setProperty(){},removeProperty(){}},dataset:{},
classList:{add(...c){c.forEach(x=>s.add(x))},remove(...c){c.forEach(x=>s.delete(x))},toggle(c,v){(v===undefined?!s.has(c):v)?s.add(c):s.delete(c)},contains(c){return s.has(c)}},
appendChild(c){return c},append(){},addEventListener(){},removeAttribute(){},setAttribute(){},remove(){},
getBoundingClientRect(){return{left:0,top:0,width:400,height:300}}}}
const reg={};const ctx={console,Math,JSON,Set,Map,Number,String,Array,Object,performance:{now:()=>0},
setTimeout:()=>0,clearTimeout(){},setInterval:()=>1,clearInterval(){},requestAnimationFrame:()=>0,
document:{body:fakeEl(),getElementById:id=>(reg[id]=reg[id]||fakeEl()),createElement:()=>fakeEl(),addEventListener(){}}};
ctx.window=ctx;ctx.window.matchMedia=()=>({matches:false});vm.createContext(ctx);
vm.runInContext(fs.readFileSync("shared/perso.js","utf8"),ctx);
vm.runInContext(fs.readFileSync("games/elias-whack/roster.js","utf8"),ctx);
vm.runInContext(fs.readFileSync("games/elias-whack/main.js","utf8"),ctx);
const lit=e=>vm.runInContext(e,ctx);
const etat=lit("etat"),demarre=lit("demarre"),frappe=lit("frappe"),trous=lit("trous"),CIBLES=lit("CIBLES"),PIEGES=lit("PIEGES");
const mult=lit("multiplicateur"),delai=lit("delaiApparition"),duree=lit("dureeVisible");

demarre();
const ok=[],ko=[];const v=(n,c,d)=>(c?ok:ko).push(n+(d?" — "+d:""));

for(let i=0;i<4;i++){trous[0].occupant={...CIBLES[0],piege:false};frappe(0);}
v("×1 en dessous de 5 d'affilée", mult()===1, "série "+etat.serie);
trous[0].occupant={...CIBLES[0],piege:false};frappe(0);
v("×2 à 5 d'affilée", mult()===2);
for(let i=0;i<5;i++){trous[0].occupant={...CIBLES[0],piege:false};frappe(0);}
v("×3 à 10 d'affilée", mult()===3);
for(let i=0;i<10;i++){trous[0].occupant={...CIBLES[0],piege:false};frappe(0);}
v("plafonné à ×3", mult()===3);
trous[1].occupant={...PIEGES[0],piege:true};frappe(1);
v("une bourde casse la série", etat.serie===0&&mult()===1);
v("la meilleure série est gardée", etat.meilleureSerie>=20, "record "+etat.meilleureSerie);

etat.vague=1;const d1=delai(),v1=duree();
etat.vague=8;const d8=delai(),v8=duree();
v("les vagues accélèrent", d8<d1*0.8 && v8<v1*0.7, "délai "+Math.round(d1)+"→"+Math.round(d8)+" ms, visible "+v1+"→"+v8+" ms");
v("la vague 1 laisse le temps de viser", v1>=1700, v1+" ms");

console.log("\n=== Série d'Elias ===");ok.forEach(t=>console.log("  OK    "+t));ko.forEach(t=>console.log("  ÉCHEC "+t));
console.log("\n"+ok.length+" vérifications passées, "+ko.length+" échouées.");
process.exit(ko.length?1:0);
