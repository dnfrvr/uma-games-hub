/* =========================================================
   Run, Glinda, Run — aucun parcours engendré n'est infranchissable
   ---------------------------------------------------------
   Une course sans fin ne se teste pas à l'œil : le parcours n'existe pas
   avant d'être joué, et la combinaison impossible n'arrive qu'une fois sur
   mille. Une capture d'écran ne dit rien, jouer trente fois non plus.

   Ce banc d'essai relit `donnees.js` et `generateur.js` — ni l'un ni l'autre
   ne touche au DOM — engendre des dizaines de kilomètres de parcours sur
   plusieurs graines, et vérifie deux fois :

     1. PAR LE CALCUL — chaque obstacle est franchissable à la vitesse qu'on
        aura en l'atteignant, aucun n'en chevauche un autre, et deux
        obstacles consécutifs sont toujours séparés d'au moins un saut
        complet. Chaque pompon est cueillable sans compromettre la suite.
     2. EN JOUANT — on simule la vraie physique du moteur, pas à pas, avec
        un joueur qui appelle son saut au bon endroit. S'il touche quoi que
        ce soit, c'est que le générateur a produit l'impossible.

   Le second contrôle est celui qui compte : il utilise les MÊMES fonctions
   de collision que `main.js` (elles vivent dans `generateur.js` exprès).

   À lancer depuis la racine :  node games/glinda-run/test-course.js
   ========================================================= */

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ICI = __dirname;

/* Les deux fichiers ne sont que des déclarations : on les évalue tels quels. */
const bac = {};
vm.createContext(bac);
vm.runInContext(
  fs.readFileSync(path.join(ICI, "donnees.js"), "utf8") +
    "\n" +
    fs.readFileSync(path.join(ICI, "generateur.js"), "utf8"),
  bac
);
const M = vm.runInContext(
  "({ PHYSIQUE, OBSTACLES, creeGenerateur, progressionA, vitesseA, reactionA," +
    " fenetreDeSaut, largeurFranchissable, largeurGlissable, estAdmissible," +
    " ecartPlancher, ecartConfort, boiteJoueur, boiteObjet, chevauche," +
    " AIR_DE_SAUT, HAUTEUR_DE_SAUT })",
  bac
);

const P = M.PHYSIQUE;
const AIR = M.AIR_DE_SAUT;

let echecs = 0;
const ok = (vrai, quoi) => {
  console.log((vrai ? "  OK    " : "  ÉCHEC ") + quoi);
  if (!vrai) echecs++;
};

const GRAINES = 40;
const DISTANCE = 90000; // px, soit ~6 400 m par graine — bien au-delà d'une vraie partie

console.log("\nRun, Glinda, Run — franchissabilité des parcours engendrés\n");

/* =========================================================
   0. Le réglage lui-même tient debout
   ========================================================= */
console.log("· Le réglage de base");
ok(
  M.HAUTEUR_DE_SAUT > 100,
  "le saut monte assez haut — " + Math.round(M.HAUTEUR_DE_SAUT) + " px pour " +
    Math.max.apply(null, M.OBSTACLES.filter((o) => o.genre === "sol").map((o) => o.hauteur)) +
    " px au plus haut obstacle"
);
ok(
  P.joueurHGlisse < Math.min.apply(null, M.OBSTACLES.filter((o) => o.genre === "haut").map((o) => o.bas)),
  "accroupie, Glinda passe sous la plus basse des banderoles"
);
ok(
  P.joueurH > Math.max.apply(null, M.OBSTACLES.filter((o) => o.genre === "haut").map((o) => o.bas)),
  "debout, elle ne passe sous aucune : ce sont bien des obstacles"
);
/* Un obstacle débloqué à la progression `des` doit être admissible à la
   vitesse de ce moment-là, sinon il ne sortira jamais et le contenu est mort
   sans que rien ne le dise. */
const jamaisSortis = M.OBSTACLES.filter((def) => {
  const v = P.vMin + (P.vMax - P.vMin) * def.des;
  return !M.estAdmissible(def, v);
});
ok(
  jamaisSortis.length === 0,
  "chaque obstacle est franchissable dès la progression où il se débloque" +
    (jamaisSortis.length ? " — jamais jouable : " + jamaisSortis.map((d) => d.id).join(", ") : "")
);
console.log("");

/* =========================================================
   1. Contrôle par le calcul, sur toutes les graines
   ========================================================= */
console.log("· Le parcours écrit (" + GRAINES + " graines × " + Math.round(DISTANCE / P.pxParMetre) + " m)");

let total = 0;
let pompons = 0;
let pireMarge = Infinity; // écart réel / écart plancher, le plus serré vu
let pireSecondes = Infinity;
const fautesEcart = [];
const fautesChevauchement = [];
const fautesAdmission = [];
const fautesPompon = [];

for (let graine = 1; graine <= GRAINES; graine++) {
  const liste = M.creeGenerateur(graine).produireJusqua(DISTANCE);
  const obstacles = liste.filter((o) => o.genre !== "pompon");
  total += obstacles.length;
  pompons += liste.length - obstacles.length;

  /* La liste doit sortir triée : le moteur et la simulation en dépendent. */
  for (let i = 1; i < liste.length; i++) {
    if (liste[i].x < liste[i - 1].x) fautesChevauchement.push(graine + "@" + Math.round(liste[i].x));
  }

  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    const v = M.vitesseA(o.x);

    if (!M.estAdmissible(o.def, v)) {
      fautesAdmission.push(graine + " : " + o.type + " à " + Math.round(o.x));
    }

    if (i === 0) continue;
    const avant = obstacles[i - 1];
    const libre = o.x - (avant.x + avant.largeur);
    if (libre <= 0) fautesChevauchement.push(graine + "@" + Math.round(o.x));

    /* LA garantie : de quoi retomber du précédent avant d'appeler pour
       celui-ci. On compare à la vitesse du plus rapide des deux points,
       puisqu'elle monte encore pendant le saut. */
    const plancher = M.ecartPlancher(M.vitesseA(o.x));
    if (libre < plancher - 0.5) {
      fautesEcart.push(
        graine + " : " + Math.round(libre) + " px libres pour " + Math.round(plancher) + " exigés"
      );
    }
    pireMarge = Math.min(pireMarge, libre / plancher);
    pireSecondes = Math.min(pireSecondes, libre / v);
  }

  /* Les pompons : un saut complet centré sur le pompon doit décoller APRÈS
     l'obstacle précédent et retomber AVANT le point d'appel du suivant. */
  for (let i = 0; i < liste.length; i++) {
    const po = liste[i];
    if (po.genre !== "pompon") continue;
    const v = M.vitesseA(po.x);
    const centre = po.x + po.largeur / 2;
    const appel = centre - (v * AIR) / 2;
    const chute = centre + (v * AIR) / 2;

    const avant = obstacles.filter((o) => o.x + o.largeur <= po.x).pop();
    const apres = obstacles.filter((o) => o.x > po.x)[0];
    const solPrecedent = avant ? avant.x + avant.largeur : 0;
    /* Point d'appel au plus tard pour le suivant (saut centré sur lui). */
    const appelSuivant = apres
      ? apres.x + (apres.largeur - P.joueurL) / 2 - (M.vitesseA(apres.x) * AIR) / 2
      : Infinity;

    if (appel < solPrecedent || chute > appelSuivant) {
      fautesPompon.push(graine + " : pompon à " + Math.round(po.x));
    }
  }
}

ok(fautesChevauchement.length === 0, "aucun obstacle n'en chevauche un autre");
ok(
  fautesAdmission.length === 0,
  "aucun obstacle n'est trop large ou trop haut pour la vitesse du moment" +
    (fautesAdmission.length ? " — " + fautesAdmission.slice(0, 4).join(" ; ") : "")
);
ok(
  fautesEcart.length === 0,
  "deux obstacles consécutifs sont toujours séparés d'un saut complet" +
    (fautesEcart.length
      ? " — " + fautesEcart.length + " cas, dont " + fautesEcart.slice(0, 3).join(" ; ")
      : " (le plus serré : ×" + pireMarge.toFixed(2) + " du plancher, " +
        pireSecondes.toFixed(2) + " s)")
);
ok(
  fautesPompon.length === 0,
  "chaque pompon se cueille sans compromettre l'obstacle suivant" +
    (fautesPompon.length ? " — " + fautesPompon.slice(0, 4).join(" ; ") : " (" + pompons + " pompons)")
);
console.log("");

/* =========================================================
   2. Contrôle en jouant : on simule la vraie physique
   ---------------------------------------------------------
   Deux joueurs simulés. Le premier ne vise que la survie. Le second
   détourne en plus tous les pompons : c'est lui qui prouve que le bonus
   n'est pas un piège déguisé.
   ========================================================= */

function simule(liste, gourmand) {
  const PAS = 1 / 240;
  let x = P.xJoueur;
  let y = P.ySol - P.joueurH;
  let vy = 0;
  let sol = true;
  let glisse = false;
  let tenue = 0;
  let ramasses = 0;
  let i = 0; // premier objet pas encore dépassé

  const fin = liste.length ? liste[liste.length - 1].x : 0;

  while (x < fin) {
    const v = M.vitesseA(x);

    while (i < liste.length && liste[i].x + liste[i].largeur < x) i++;

    /* La cible : le prochain vrai obstacle. Les pompons ne commandent rien
       chez le joueur prudent. */
    let cible = null;
    let pompon = null;
    for (let k = i; k < liste.length && k < i + 6; k++) {
      if (liste[k].genre === "pompon") {
        if (!pompon && liste[k].x + liste[k].largeur > x) pompon = liste[k];
      } else if (!cible) {
        cible = liste[k];
      }
      if (cible && pompon) break;
    }

    /* Faut-il être accroupie ? On s'accroupit un cheveu avant, et on se
       relève dès qu'on est passée. */
    let besoinGlisse = false;
    for (let k = i; k < liste.length && k < i + 4; k++) {
      const o = liste[k];
      if (o.genre !== "haut") continue;
      if (x + P.joueurL > o.x - v * 0.1 && x < o.x + o.largeur + 6) besoinGlisse = true;
    }

    if (besoinGlisse && sol) {
      if (!glisse) tenue = 0;
      glisse = true;
    } else if (glisse && (!besoinGlisse || tenue > P.glisseMax)) {
      glisse = false;
    }
    if (glisse) tenue += PAS;

    /* Le saut : on appelle pour que le sommet tombe au milieu de l'obstacle. */
    if (sol && !glisse && cible && cible.genre === "sol") {
      const appel = cible.x + (cible.largeur - P.joueurL) / 2 - (v * AIR) / 2;
      if (x >= appel) {
        vy = -P.saut;
        sol = false;
      }
    }
    /* Le gourmand va chercher le pompon, s'il n'y a pas d'obstacle avant. */
    if (gourmand && sol && !glisse && pompon && (!cible || cible.x > pompon.x)) {
      const appel = pompon.x + (pompon.largeur - P.joueurL) / 2 - (v * AIR) / 2;
      if (x >= appel) {
        vy = -P.saut;
        sol = false;
      }
    }

    /* Intégration, à l'identique de main.js.
       Au sol, la boîte est PLAQUÉE à la posture du moment : s'accroupir est
       instantané. Sans ça, Glinda met 0,14 s à descendre sa tête et se cogne
       à la banderole qu'elle vient justement d'esquiver — vécu, et c'est le
       banc d'essai qui l'a trouvé. */
    const hauteur = glisse ? P.joueurHGlisse : P.joueurH;
    if (sol) y = P.ySol - hauteur;

    x += v * PAS;
    vy = Math.min(vy + P.gravite * PAS, P.chuteMax);
    y += vy * PAS;
    if (y >= P.ySol - hauteur) {
      y = P.ySol - hauteur;
      vy = 0;
      sol = true;
    } else {
      sol = false;
    }

    /* Collisions, avec les fonctions du moteur. */
    const boite = M.boiteJoueur(x, y, glisse);
    for (let k = i; k < liste.length && k < i + 6; k++) {
      const o = liste[k];
      if (o.x > x + P.joueurL + 4) break;
      if (o.pris) continue;
      if (!M.chevauche(boite, M.boiteObjet(o))) continue;
      if (o.genre === "pompon") {
        o.pris = true;
        ramasses++;
      } else {
        return { touche: o, x: x, ramasses: ramasses };
      }
    }
  }
  return { touche: null, x: x, ramasses: ramasses };
}

console.log("· Le parcours joué");

let accrocs = 0;
let accrocsGourmands = 0;
let cueillis = 0;
let cueillables = 0;
let premierEchec = "";

for (let graine = 1; graine <= GRAINES; graine++) {
  const liste = M.creeGenerateur(graine).produireJusqua(DISTANCE);
  const r = simule(liste.map((o) => Object.assign({}, o)), false);
  if (r.touche) {
    accrocs++;
    if (!premierEchec) {
      premierEchec = "graine " + graine + " : " + r.touche.type + " à " + Math.round(r.touche.x) + " px";
    }
  }

  const copie = liste.map((o) => Object.assign({}, o));
  const g = simule(copie, true);
  if (g.touche) {
    accrocsGourmands++;
    if (!premierEchec) {
      premierEchec = "graine " + graine + " (gourmande) : " + g.touche.type + " à " + Math.round(g.touche.x);
    }
  }
  cueillis += g.ramasses;
  cueillables += liste.filter((o) => o.genre === "pompon").length;
}

ok(
  accrocs === 0,
  "un jeu propre traverse " + GRAINES + " parcours entiers sans toucher un obstacle" +
    (accrocs ? " — " + accrocs + " échec(s), premier : " + premierEchec : "")
);
ok(
  accrocsGourmands === 0,
  "et il les traverse aussi en détournant pour les pompons" +
    (accrocsGourmands ? " — " + accrocsGourmands + " échec(s) : " + premierEchec : "")
);
ok(
  cueillis >= cueillables * 0.95,
  "les pompons sont réellement atteignables — " + cueillis + " ramassés sur " + cueillables
);
console.log("");

/* =========================================================
   3. La difficulté monte-t-elle vraiment ?
   ---------------------------------------------------------
   Trois leviers doivent grimper ensemble : la vitesse, le nombre
   d'obstacles par seconde, et l'étroitesse de la marge d'erreur. Si l'un
   redescend d'une tranche à l'autre, la course a un palier mou.
   ========================================================= */
console.log("· La courbe de difficulté");

const TRANCHE = 500; // mètres
const TRANCHES = 6;
const bandes = [];

for (let t = 0; t < TRANCHES; t++) {
  const x0 = t * TRANCHE * P.pxParMetre;
  const x1 = (t + 1) * TRANCHE * P.pxParMetre;
  let n = 0;
  let sommeSecondes = 0;
  let paires = 0;

  for (let graine = 1; graine <= GRAINES; graine++) {
    const liste = M.creeGenerateur(graine).produireJusqua(x1 + 2000);
    const obstacles = liste.filter((o) => o.genre !== "pompon" && o.x >= x0 && o.x < x1);
    n += obstacles.length;
    for (let i = 1; i < obstacles.length; i++) {
      const libre = obstacles[i].x - (obstacles[i - 1].x + obstacles[i - 1].largeur);
      sommeSecondes += libre / M.vitesseA(obstacles[i].x);
      paires++;
    }
  }

  const vMoy = (M.vitesseA(x0) + M.vitesseA(x1)) / 2;
  const duree = (x1 - x0) / vMoy; // secondes pour traverser la tranche
  bandes.push({
    de: t * TRANCHE,
    a: (t + 1) * TRANCHE,
    v: vMoy,
    parSeconde: n / GRAINES / duree,
    respiration: sommeSecondes / paires,
  });
}

for (const b of bandes) {
  console.log(
    "         " + String(b.de).padStart(4) + "–" + String(b.a).padEnd(5) + " m  ·  " +
      Math.round(b.v) + " px/s  ·  " + b.parSeconde.toFixed(2) + " obstacle/s  ·  " +
      b.respiration.toFixed(2) + " s entre deux"
  );
}

/* La courbe sature volontairement vers la fin (la vitesse tend vers vMax) :
   on n'exige donc pas une hausse stricte de tranche en tranche, mais qu'elle
   ne REDESCENDE jamais franchement, et qu'elle ait vraiment monté au total.
   Une exigence stricte ferait échouer le banc d'essai sur du bruit de tirage. */
const premier = bandes[0];
const dernier = bandes[bandes.length - 1];
const vitesseMonte = bandes.every((b, i) => i === 0 || b.v > bandes[i - 1].v);
const densiteTient = bandes.every((b, i) => i === 0 || b.parSeconde >= bandes[i - 1].parSeconde * 0.96);
const margeTient = bandes.every((b, i) => i === 0 || b.respiration <= bandes[i - 1].respiration * 1.04);

ok(vitesseMonte, "la vitesse monte à chaque tranche");
ok(
  densiteTient && dernier.parSeconde > premier.parSeconde * 1.8,
  "les obstacles se rapprochent sans jamais se relâcher — de " +
    premier.parSeconde.toFixed(2) + " à " + dernier.parSeconde.toFixed(2) + " par seconde"
);
ok(
  margeTient && dernier.respiration < premier.respiration * 0.75,
  "la marge d'erreur se referme — de " + premier.respiration.toFixed(2) +
    " s à " + dernier.respiration.toFixed(2) + " s entre deux obstacles"
);
ok(
  bandes[bandes.length - 1].respiration > AIR,
  "même à la fin, on retombe toujours avant le suivant — " +
    bandes[bandes.length - 1].respiration.toFixed(2) + " s pour un saut de " + AIR.toFixed(2) + " s"
);
console.log("");

/* =========================================================
   4. Et la partie finit-elle ?
   ---------------------------------------------------------
   Une course sans fin doit se terminer. À pleine vitesse, la pression de
   Boq doit dépasser la récupération : sinon un joueur parfait court pour
   toujours, et le score ne veut plus rien dire.
   ========================================================= */
console.log("· Boq finit par rattraper");

const pressionMax = P.pressionDepart + (P.pressionFinale - P.pressionDepart) * 1;
ok(
  P.recuperation > P.pressionDepart,
  "au départ, courir proprement fait reculer Boq — +" +
    (P.recuperation - P.pressionDepart) + " px/s"
);
ok(
  pressionMax > P.recuperation,
  "à pleine vitesse, courir proprement ne suffit plus — " +
    (pressionMax - P.recuperation) + " px/s perdus malgré tout"
);
const coutChoc = P.ecartChoc + P.chocDuree * (1 - P.chocVitesse) * P.vMin;
ok(
  P.ecartMax / coutChoc >= 2 && P.ecartMax / coutChoc <= 5,
  "une bourde coûte cher sans être fatale — " + Math.round(coutChoc) +
    " px sur " + P.ecartMax + ", soit " + (P.ecartMax / coutChoc).toFixed(1) + " bourdes d'avance"
);
console.log("");

console.log(
  echecs
    ? echecs + " vérification(s) en échec.\n"
    : "Tout passe : aucun parcours engendré n'est infranchissable, et la difficulté monte.\n"
);
process.exitCode = echecs ? 1 : 0;
