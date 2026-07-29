/* Vérifie Sanity Whack sans navigateur : la série de bons coups, et surtout
   la COURBE DE DIFFICULTÉ — elle doit monter à chaque vague, indéfiniment,
   sans jamais franchir les bornes qui la garderaient jouable.

   Les fonctions du jeu tirent au hasard (délai réel = base × panique × 0,7‑1,3) :
   on mesure donc la courbe de base via `courbe()` et les constantes, ce qui
   est reproductible, et on échantillonne seulement ce qui est aléatoire. */
const fs=require("fs"),vm=require("vm");
function fakeEl(){const s=new Set();return{children:[],className:"",textContent:"",innerHTML:"",title:"",offsetWidth:0,
style:{setProperty(){},removeProperty(){}},dataset:{},parentElement:null,
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
const mult=lit("multiplicateur"),courbe=lit("courbe"),tailleSalve=lit("tailleSalve"),armeVague=lit("armeVague");
const FENETRE=lit("FENETRE"),CADENCE=lit("CADENCE"),PART_PIEGES=lit("PART_PIEGES");
const DUREE_VAGUE_MS=lit("DUREE_VAGUE_MS"),PANIQUE=lit("PANIQUE_MOYENNE"),VAGUE_SALVES=lit("VAGUE_SALVES");

demarre();
const ok=[],ko=[];const v=(n,c,d)=>(c?ok:ko).push(n+(d?" — "+d:""));

/* ---------- Série de bons coups ---------- */
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

/* ---------- Courbe de difficulté ---------- */
const MAX=60;                     // on pousse bien au-delà de ce qu'un humain atteint
const fen=w=>courbe(FENETRE,w);
const cad=w=>courbe(CADENCE,w);
const pie=w=>courbe(PART_PIEGES,w);

/* Espérance de la taille d'une salve : c'est la seule part aléatoire, on
   l'échantillonne. */
function salve(w){
  const memo=etat.vague;etat.vague=w;
  let t=0;for(let i=0;i<20000;i++)t+=tailleSalve();
  etat.vague=memo;return t/20000;
}
const creaturesParSeconde=w=>salve(w)*1000/(cad(w)*PANIQUE);

let strictementCroissante=true,fenetreOk=true,piegesOk=true;
for(let w=1;w<MAX;w++){
  if(fen(w+1)>=fen(w)||cad(w+1)>=cad(w)||pie(w+1)<=pie(w)) strictementCroissante=false;
  if(fen(w)<FENETRE.arrivee) fenetreOk=false;
  if(pie(w)>=0.45) piegesOk=false;
}
v("aucun plateau : chaque vague resserre encore, jusqu'à la "+MAX, strictementCroissante,
  "fenêtre "+Math.round(fen(MAX))+" ms, cadence "+Math.round(cad(MAX))+" ms");
v("la fenêtre ne passe jamais sous le plancher de réaction", fenetreOk, "plancher "+FENETRE.arrivee+" ms");
v("la part de pièges reste sous 45 %", piegesOk, "vague "+MAX+" : "+(pie(MAX)*100).toFixed(0)+" %");

v("la vague 1 laisse le temps de viser", fen(1)>=1700, Math.round(fen(1))+" ms");
v("les vagues accélèrent", cad(8)<cad(1)*0.8 && fen(8)<fen(1)*0.7,
  "cadence "+Math.round(cad(1))+"→"+Math.round(cad(8))+" ms, fenêtre "+Math.round(fen(1))+"→"+Math.round(fen(8))+" ms");

/* Le démarrage doit rester abordable : un jeu impossible en 30 s est raté.
   30 s de jeu = vague 3 (une vague dure DUREE_VAGUE_MS). */
v("les 30 premières secondes restent abordables", fen(3)>=1200 && creaturesParSeconde(3)<1.6,
  Math.round(fen(3))+" ms de fenêtre, "+creaturesParSeconde(3).toFixed(2)+" créature/s");

/* Le relais vitesse → nombre : la cadence est presque à son plancher quand
   les salves multiples démarrent, sinon les deux leviers se cumulent trop tôt. */
v("les salves multiples arrivent quand la vitesse sature",
  salve(VAGUE_SALVES-1)===1 && salve(VAGUE_SALVES)>1 && cad(VAGUE_SALVES)<CADENCE.arrivee*1.5,
  "vague "+VAGUE_SALVES+" : "+salve(VAGUE_SALVES).toFixed(2)+" créature/salve, cadence "+Math.round(cad(VAGUE_SALVES))+" ms");

let densiteCroissante=true;
for(let w=1;w<25;w++) if(creaturesParSeconde(w+1)<=creaturesParSeconde(w)) densiteCroissante=false;
v("la densité de créatures monte à chaque vague", densiteCroissante,
  creaturesParSeconde(1).toFixed(1)+" → "+creaturesParSeconde(25).toFixed(1)+" créatures/s");

/* Une vague doit peser le même temps de jeu quelle que soit sa cadence,
   sinon le compteur de vagues s'emballe et la difficulté avec lui. */
let dureesOk=true,duree1=0,duree20=0;
for(let w=1;w<=MAX;w++){
  const memo=etat.vague;etat.vague=w;armeVague();
  const d=etat.salvesRestantes*cad(w)*PANIQUE/1000;
  if(w===1)duree1=d; if(w===20)duree20=d;
  if(Math.abs(d-DUREE_VAGUE_MS/1000)>1.2) dureesOk=false;
  etat.vague=memo;
}
v("chaque vague dure ~"+(DUREE_VAGUE_MS/1000)+" s", dureesOk,
  "vague 1 : "+duree1.toFixed(1)+" s, vague 20 : "+duree20.toFixed(1)+" s");

/* ---------- Le tableau, pour l'œil ---------- */
console.log("\n=== Courbe de difficulté de Sanity Whack ===");
console.log("vague   fenêtre   cadence   créatures/s   pièges   arrive à");
let t=0;
for(const w of [1,2,3,4,6,8,9,10,12,14,16,20,25,30]){
  t=(w-1)*DUREE_VAGUE_MS/1000;
  console.log(
    String(w).padStart(4)+
    (Math.round(fen(w))+" ms").padStart(11)+
    (Math.round(cad(w))+" ms").padStart(10)+
    creaturesParSeconde(w).toFixed(2).padStart(13)+
    ((pie(w)*100).toFixed(0)+" %").padStart(9)+
    (Math.floor(t/60)+" min "+String(Math.round(t%60)).padStart(2,"0")+" s").padStart(12)
  );
}

console.log("\n=== Série d'Elias ===");ok.forEach(t=>console.log("  OK    "+t));ko.forEach(t=>console.log("  ÉCHEC "+t));
console.log("\n"+ok.length+" vérifications passées, "+ko.length+" échouées.");
process.exit(ko.length?1:0);
