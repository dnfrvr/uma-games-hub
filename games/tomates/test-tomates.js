/* =========================================================
   Balance ta tomate — la cible reste-t-elle atteignable ?
   ---------------------------------------------------------
   Un jeu de trajectoire se casse en silence. Un vent de deux unités de trop,
   un tonneau dix unités trop haut, une cible qui court plus vite que la
   tomate ne vole, et la manche devient impossible sans qu'aucune erreur
   n'apparaisse nulle part. Une capture d'écran ne le dit pas ; jouer trente
   fois non plus, on croit juste être mauvais.

   Ce banc d'essai relit `reglages.js` et `cinematique.js` — les MÊMES
   fonctions que le jeu, donc aucune formule n'est réécrite ici — et, pour
   chaque manche :

     1. échantillonne des INSTANTS DE TIR sur un cycle complet de Mads ;
     2. pour chacun, et pour le vent le plus défavorable des deux côtés,
        balaie la grille (angle × puissance) réellement accessible au joueur ;
     3. compte les réglages qui touchent.

   On en tire trois chiffres par manche :
     · instants jouables   part des moments où AU MOINS un réglage touche ;
     · fenêtre de réglage  part des couples (angle, puissance) qui touchent,
                           moyennée sur les instants jouables ;
     · marge              au meilleur instant du cycle et au meilleur angle,
                           la largeur en points de puissance qui touche
                           encore. Ce n'est pas une mesure de difficulté mais
                           un PLANCHER : il doit toujours exister, quelque
                           part dans le cycle, un tir large de doigt.

   Et deux garde-fous :
     · jamais plus de `TROU_MAX` secondes d'affilée sans instant jouable —
       sinon le joueur reste le doigt en l'air à attendre ;
     · les munitions couvrent l'objectif avec de la marge, compte tenu de la
       part du temps où Mads est intouchable.

   Puis, deuxième partie, un ESSAI DU MOTEUR : `main.js` est chargé dans un
   faux DOM et on joue vraiment une manche au clavier, coup par coup. Ça
   n'attrape pas un défaut de mise en page, mais ça attrape tout le reste —
   une référence morte, un écran qui ne s'ouvre pas, un cageot qui ne se
   vide pas, un score qui ne suit pas le barème.

   À lancer depuis la racine :  node games/tomates/test-tomates.js
   (`--moteur` ou `--equilibrage` pour n'en jouer qu'une moitié.)
   ========================================================= */

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const DOSSIER = __dirname;
const ARGS = process.argv.slice(2);
const FAIT = (quoi) => ARGS.length === 0 || ARGS.includes("--" + quoi);

/* Les deux fichiers ne sont que des déclarations : on les évalue tels quels,
   sans DOM, dans un même bac à sable pour que la cinématique voie bien les
   réglages. */
const bac = { Math: Math, console: console, module: { exports: {} } };
vm.createContext(bac);
for (const f of ["reglages.js", "cinematique.js"]) {
  vm.runInContext(fs.readFileSync(path.join(DOSSIER, f), "utf8"), bac, { filename: f });
}
const { MONDE, TIR, MADS, ABRIS, MANCHES, BAREME } = vm.runInContext(
  "({ MONDE, TIR, MADS, ABRIS, MANCHES, BAREME })",
  bac
);
const { positionMads, boiteMads, cycleDe, simuleTir, vitesseDe, multiplicateur } = vm.runInContext(
  "({ positionMads, boiteMads, cycleDe, simuleTir, vitesseDe, multiplicateur })",
  bac
);

let echecs = 0;
const ok = (vrai, quoi) => {
  console.log((vrai ? "  OK     " : "  ÉCHEC  ") + quoi);
  if (!vrai) echecs++;
};
const pc = (x) => (x * 100).toFixed(1).replace(".", ",") + " %";

/* --- Réglages du balayage ------------------------------------------------
   La grille est PLUS GROSSIÈRE que ce dont dispose le joueur (1° et 2 points
   de puissance) : les chiffres sortis d'ici sont donc des minorants. Si ça
   passe avec ce peigne-là, ça passe à la main. */
const PAS_ANGLE = 2;
const PAS_PUISSANCE = 4;
const PAS_INSTANT = 0.2; // en secondes, sur un cycle complet
const TROU_MAX = 1.6; // secondes sans aucun tir possible
const FENETRE_PLANCHER = 0.012; // 1,2 % de la grille : en dessous, c'est de la loterie
const TOLERANCE_PLANCHER = 4; // points de puissance de marge, au minimum

/* Un tir n'a pas besoin de son tracé ici : on ne dessine rien. */
const RAPIDE = { points: false, pas: 1 / 90 };

function balaye(manche, t0, vent) {
  let touches = 0;
  let total = 0;
  let meilleurAngle = null;
  let meilleureLargeur = 0;

  for (let a = TIR.angleMin; a <= TIR.angleMax; a += PAS_ANGLE) {
    /* Pour cet angle, la plus longue plage de puissance qui touche d'affilée :
       c'est la marge d'erreur de la main, pas une somme de coups isolés. */
    let suite = 0;
    let meilleureSuite = 0;
    for (let p = 0; p <= 100; p += PAS_PUISSANCE) {
      total++;
      const r = simuleTir(manche, t0, a, p, vent, RAPIDE);
      const bon = r.issue === "corps" || r.issue === "tete";
      if (bon) {
        touches++;
        suite += PAS_PUISSANCE;
        if (suite > meilleureSuite) meilleureSuite = suite;
      } else {
        suite = 0;
      }
    }
    if (meilleureSuite > meilleureLargeur) {
      meilleureLargeur = meilleureSuite;
      meilleurAngle = a;
    }
  }

  return { part: touches / total, largeur: meilleureLargeur, angle: meilleurAngle, touches };
}

if (FAIT("equilibrage")) {
console.log("\nBalance ta tomate — la cible reste-t-elle atteignable ?\n");

const bilan = [];

for (const manche of MANCHES) {
  const cycle = cycleDe(manche);
  const vitesse = manche.periode ? (4 * manche.amplitude) / manche.periode : 0;
  const partPlanque = manche.refuge === null ? 0 : manche.tPlanque / cycle;

  console.log("· " + manche.nom + "  (cycle " + cycle.toFixed(1) + " s)");

  /* Les vents à éprouver : les deux extrêmes, c'est là que ça casse. */
  const vents = manche.vent === 0 ? [0] : [-manche.vent, manche.vent];

  let instants = 0;
  let jouables = 0;
  let sommePart = 0;
  let meilleureTolerance = 0;
  let trou = 0;
  let pireTrou = 0;
  const creux = [];

  for (let t = 0; t < cycle; t += PAS_INSTANT) {
    instants++;
    /* Un instant n'est « jouable » que si TOUS les vents possibles laissent
       une solution : le joueur ne choisit pas la météo. */
    let bonPartout = true;
    let partMin = 1;
    let toleranceMin = 999;
    for (const vent of vents) {
      const r = balaye(manche, t, vent);
      if (r.touches === 0) bonPartout = false;
      partMin = Math.min(partMin, r.part);
      toleranceMin = Math.min(toleranceMin, r.largeur);
    }
    if (bonPartout) {
      jouables++;
      sommePart += partMin;
      if (toleranceMin > meilleureTolerance) meilleureTolerance = toleranceMin;
      trou = 0;
    } else {
      trou += PAS_INSTANT;
      if (trou > pireTrou) pireTrou = trou;
      creux.push(positionMads(manche, t).etat);
    }
  }

  const partJouable = jouables / instants;
  const fenetre = jouables ? sommePart / jouables : 0;

  console.log(
    "    vitesse de la cible " +
      vitesse.toFixed(1) +
      " u/s · vent ±" +
      manche.vent +
      " · aperçu " +
      pc(manche.apercu) +
      " · " +
      manche.abris.length +
      " abri(s) · planqué " +
      pc(partPlanque)
  );

  ok(
    partJouable > 0.45,
    "instants où un coup est possible : " + pc(partJouable) + " du cycle"
  );
  ok(
    fenetre >= FENETRE_PLANCHER,
    "fenêtre de réglage : " + pc(fenetre) + " de la grille (angle × puissance)"
  );
  ok(
    meilleureTolerance >= TOLERANCE_PLANCHER,
    "tolérance en puissance au meilleur angle : ±" +
      meilleureTolerance / 2 +
      " points sur 100"
  );
  ok(
    pireTrou <= TROU_MAX,
    "jamais plus de " +
      pireTrou.toFixed(1) +
      " s d'affilée sans cible atteignable (max toléré " +
      TROU_MAX +
      " s)" +
      (creux.length ? " — pendant : " + [...new Set(creux)].join(", ") : "")
  );

  /* Munitions contre objectif : combien de tirs le joueur peut-il rater ? */
  const marge = manche.munitions - manche.objectif;
  ok(
    marge >= 3,
    "le cageot laisse " + marge + " tomate(s) de marge (" + manche.munitions +
      " pour " + manche.objectif + " touches)"
  );

  bilan.push({
    nom: manche.nom,
    vitesse: vitesse,
    vent: manche.vent,
    planque: partPlanque,
    jouable: partJouable,
    fenetre: fenetre,
    tolerance: meilleureTolerance,
    apercu: manche.apercu,
  });

  console.log("");
}

/* --- La courbe monte-t-elle ? -------------------------------------------
   C'est la vraie question. Chaque manche doit être plus dure que la
   précédente, et « plus dure » se lit à la fenêtre de réglage qui se
   referme, pas à l'impression qu'on en a. */
console.log("Courbe de difficulté\n");
console.log(
  "  " +
    "Manche".padEnd(24) +
    "vitesse".padStart(9) +
    "vent".padStart(7) +
    "planqué".padStart(10) +
    "jouable".padStart(10) +
    "fenêtre".padStart(10) +
    "marge".padStart(9)
);
for (const b of bilan) {
  console.log(
    "  " +
      b.nom.padEnd(24) +
      (b.vitesse.toFixed(1) + " u/s").padStart(9) +
      ("±" + b.vent).padStart(7) +
      pc(b.planque).padStart(10) +
      pc(b.jouable).padStart(10) +
      pc(b.fenetre).padStart(10) +
      ("±" + b.tolerance / 2).padStart(9)
  );
}
console.log("");

for (let i = 1; i < bilan.length; i++) {
  ok(
    bilan[i].fenetre < bilan[i - 1].fenetre,
    "« " + bilan[i].nom + " » resserre la visée par rapport à « " + bilan[i - 1].nom + " » (" +
      pc(bilan[i].fenetre) + " contre " + pc(bilan[i - 1].fenetre) + ")"
  );
}

/* --- Cohérence des réglages, indépendamment du jeu ----------------------- */
console.log("");

const portee = (TIR.vMax * TIR.vMax) / TIR.gravite;
const plusLoin = Math.max(...MANCHES.map((m) => m.centre + m.amplitude)) - MONDE.lanceur.x;
ok(
  portee > plusLoin * 1.15,
  "la puissance maximale porte au-delà de la cible la plus lointaine — " +
    Math.round(portee) + " u contre " + Math.round(plusLoin) + " u"
);

ok(
  MANCHES.every((m) => m.abris.every((a) => a.x >= MONDE.podium.x &&
    a.x + ABRIS[a.type].largeur <= MONDE.podium.x + MONDE.podium.largeur)),
  "tous les abris tiennent sur l'estrade"
);

ok(
  MANCHES.every((m) => {
    const min = m.centre - m.amplitude - MADS.largeur / 2;
    const max = m.centre + m.amplitude + MADS.largeur / 2;
    return min >= MONDE.podium.x && max <= MONDE.podium.x + MONDE.podium.largeur;
  }),
  "Mads ne sort jamais de l'estrade pendant sa parade"
);

ok(
  MANCHES.every((m) => m.refuge === null || m.abris[m.refuge]),
  "chaque refuge désigne un abri qui existe"
);

/* Le refuge doit vraiment protéger : accroupi derrière, Mads ne doit plus
   dépasser de plus de deux unités. Sinon la planque est décorative. */
for (const m of MANCHES) {
  if (m.refuge === null) continue;
  const abri = m.abris[m.refuge];
  const type = ABRIS[abri.type];
  const hautAbri = MONDE.podium.dessus - type.hauteur;
  const hautMads = MONDE.podium.dessus - MADS.accroupi;
  const depasse = hautAbri - hautMads;
  const xRefuge = abri.x + type.largeur / 2;
  const couvert =
    xRefuge - MADS.largeur / 2 >= abri.x - 1 && xRefuge + MADS.largeur / 2 <= abri.x + type.largeur + 1;
  ok(
    depasse <= 2 && couvert,
    "« " + m.nom + " » : le refuge (" + abri.type + ") couvre bien Mads accroupi — " +
      (depasse <= 0
        ? "il disparaît de " + (-depasse).toFixed(1) + " u sous le bord"
        : "il dépasse de " + depasse.toFixed(1) + " u")
  );
}

/* La difficulté doit monter sur TOUS les leviers annoncés, pas seulement au
   ressenti : c'est le tableau de la fiche du jeu qui doit rester vrai. */
const monte = (cle, sens) => {
  for (let i = 1; i < MANCHES.length; i++) {
    const a = MANCHES[i - 1][cle];
    const b = MANCHES[i][cle];
    if (sens > 0 ? b < a : b > a) return false;
  }
  return true;
};
ok(monte("vent", 1), "le vent ne faiblit jamais d'une manche à l'autre");
ok(monte("apercu", -1), "l'aperçu de trajectoire ne s'allonge jamais");
ok(monte("objectif", 1), "l'objectif ne baisse jamais");
ok(monte("amplitude", 1), "la zone patrouillée ne rétrécit jamais");
}

/* =========================================================
   Deuxième partie : le moteur, joué pour de vrai
   ---------------------------------------------------------
   `main.js` est chargé dans un faux DOM, puis on joue au clavier : on ouvre
   le rideau, on règle l'angle et la puissance flèche par flèche, on lance
   avec Entrée, on fait tourner la boucle image par image. Rien n'est
   court-circuité — les écouteurs de touches, les écrans et le décompte des
   munitions sont ceux du jeu.

   Le hasard est neutralisé (Math.random figé à 0,5) pour que le vent soit
   nul et les répliques stables : un banc d'essai qui échoue une fois sur
   dix n'est pas un banc d'essai.
   ========================================================= */

if (FAIT("moteur")) {
console.log("\nBalance ta tomate — le moteur, manette en main\n");

/* --- Un DOM tout juste suffisant ---------------------------------------- */
function faussetEl(nom) {
  const classes = new Set();
  const ecouteurs = {};
  let html = "";
  let texte = "";
  return {
    nom: nom || "",
    childNodes: [],
    className: "",
    /* Un vrai DOM convertit tout en chaîne : sans ça, un compteur écrit en
       nombre passerait ici pour un nombre et le banc d'essai comparerait
       autre chose que ce que le joueur lit. */
    get textContent() {
      return texte;
    },
    set textContent(v) {
      texte = String(v);
    },
    /* Écrire innerHTML vide vraiment l'élément : sans ça, un compteur
       reconstruit à chaque tir (le cageot) grossirait indéfiniment et le
       banc d'essai mesurerait n'importe quoi. */
    get innerHTML() {
      return html;
    },
    set innerHTML(v) {
      html = v;
      this.childNodes.length = 0;
    },
    style: {},
    dataset: {},
    classList: {
      add: (...c) => c.forEach((x) => classes.add(x)),
      remove: (...c) => c.forEach((x) => classes.delete(x)),
      contains: (c) => classes.has(c),
      toggle: (c, v) => ((v === undefined ? !classes.has(c) : v) ? classes.add(c) : classes.delete(c)),
    },
    get firstChild() {
      return this.childNodes[0];
    },
    appendChild(c) {
      this.childNodes.push(c);
      return c;
    },
    append(...c) {
      this.childNodes.push(...c);
    },
    removeChild(c) {
      const i = this.childNodes.indexOf(c);
      if (i >= 0) this.childNodes.splice(i, 1);
      return c;
    },
    remove() {},
    setAttribute() {},
    removeAttribute() {},
    focus() {},
    querySelector() {
      return (this.bouton = faussetEl("bouton"));
    },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 450 }),
    addEventListener(type, fn) {
      (ecouteurs[type] = ecouteurs[type] || []).push(fn);
    },
    declenche(type, ev) {
      (ecouteurs[type] || []).forEach((fn) => fn(Object.assign({ preventDefault() {} }, ev)));
    },
  };
}

function chargeMoteur() {
  const registre = {};
  const ecouteursDoc = {};
  const images = [];
  const stock = {};
  /* Une copie de Math dont seul `random` est figé : le vrai Math du banc
     d'essai ne doit pas être touché. */
  const MathFige = Object.create(Math);
  MathFige.random = () => 0.5;

  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    Math: MathFige,
    JSON, Set, Map, Number, String, Array, Object, Date, isNaN,
    performance: { now: () => 0 },
    setTimeout: () => 0,
    clearTimeout() {},
    setInterval: () => 1,
    clearInterval() {},
    requestAnimationFrame: (cb) => images.push(cb),
    cancelAnimationFrame() {},
    localStorage: {
      getItem: (c) => (c in stock ? stock[c] : null),
      setItem: (c, v) => (stock[c] = String(v)),
    },
    document: {
      body: faussetEl("body"),
      getElementById: (id) => (registre[id] = registre[id] || faussetEl(id)),
      createElement: (n) => faussetEl(n),
      createElementNS: (ns, n) => faussetEl(n),
      addEventListener(type, fn) {
        (ecouteursDoc[type] = ecouteursDoc[type] || []).push(fn);
      },
    },
  };
  ctx.window = ctx;
  ctx.window.addEventListener = () => {};
  vm.createContext(ctx);

  for (const f of ["../../shared/perso.js", "reglages.js", "cinematique.js", "main.js"]) {
    vm.runInContext(fs.readFileSync(path.join(DOSSIER, f), "utf8"), ctx, { filename: f });
  }

  let horloge = 0;
  return {
    el: (id) => registre[id],
    /* Une image de 1/60 s. Le moteur redemande une image à chaque tour :
       on dépile celle qu'il a posée et on la rappelle. */
    image() {
      horloge += 1000 / 60;
      ctx.performance.now = () => horloge;
      const cb = images.pop();
      images.length = 0;
      if (cb) cb(horloge);
    },
    images(n) {
      for (let i = 0; i < n; i++) this.image();
    },
    touche(code, type) {
      (ecouteursDoc[type || "keydown"] || []).forEach((fn) =>
        fn({ code: code, target: { tagName: "DIV" }, preventDefault() {}, repeat: false })
      );
    },
    /* Le bouton de l'écran ouvert : c'est le seul chemin pour avancer. */
    bouton() {
      return registre["tom-rideau"].bouton;
    },
  };
}

const jeu = chargeMoteur();

ok(!!jeu.el("tom-rideau"), "le jeu se charge et pose son écran-titre sans erreur");
ok(
  jeu.el("tom-manche").textContent.indexOf(MANCHES[0].nom) >= 0,
  "le comptoir annonce la première manche : " + jeu.el("tom-manche").textContent
);

/* Écran-titre → briefing de la manche 1 → la scène. */
jeu.bouton().declenche("click");
const briefing = jeu.el("tom-rideau").innerHTML;
ok(briefing.indexOf(MANCHES[0].nom) >= 0, "le rideau annonce la manche avant de l'ouvrir");
ok(
  briefing.indexOf(MANCHES[0].munitions + " tomates") >= 0,
  "la fiche de manche annonce le cageot (" + MANCHES[0].munitions + " tomates)"
);
jeu.bouton().declenche("click");
jeu.images(2);
ok(jeu.el("tom-rideau").innerHTML === "", "le rideau s'ouvre et la manche démarre");

/* --- On joue. Le temps est connu au 1/60 s près : on peut donc chercher
       un réglage gagnant pour l'instant EXACT du lancer. ---------------- */
const manche = MANCHES[0];
let horlogeJeu = 0; // la première image après l'ouverture ne compte pas
const IMG = 1 / 60;

function regle(angle, puissance) {
  /* On y va flèche par flèche, comme un joueur : c'est aussi ce qui teste
     les écouteurs de touches et les bornes. */
  const aDepart = Number(jeu.el("tom-angle").textContent.replace("°", ""));
  const pDepart = Number(jeu.el("tom-puissance").textContent.replace(" %", ""));
  for (let i = 0; i < Math.abs(angle - aDepart) / TIR.pasAngle; i++) {
    jeu.touche(angle > aDepart ? "ArrowUp" : "ArrowDown");
  }
  for (let i = 0; i < Math.abs(puissance - pDepart) / TIR.pasPuissance; i++) {
    jeu.touche(puissance > pDepart ? "ArrowRight" : "ArrowLeft");
  }
}

/* Cherche un réglage qui touche si on lance MAINTENANT (vent nul). */
function reglageGagnant(t0) {
  for (let a = TIR.angleMin; a <= TIR.angleMax; a += TIR.pasAngle) {
    for (let p = 0; p <= 100; p += TIR.pasPuissance) {
      const r = simuleTir(manche, t0, a, p, 0, { points: false });
      if (r.issue === "corps" || r.issue === "tete") return { angle: a, puissance: p, r: r };
    }
  }
  return null;
}

const solution = reglageGagnant(horlogeJeu);
ok(!!solution, "un réglage gagnant existe dès la première seconde de la manche 1");

let scoreAvant = Number(jeu.el("tom-score").textContent);
regle(solution.angle, solution.puissance);
ok(
  jeu.el("tom-angle").textContent === Math.round(solution.angle) + "°",
  "les flèches règlent l'angle au degré près (" + jeu.el("tom-angle").textContent + ")"
);
jeu.touche("Enter");
ok(
  jeu.el("tom-cageot").childNodes.filter((t) => t.className.indexOf("tom-vide") < 0).length ===
    manche.munitions - 1,
  "lancer retire une tomate du cageot"
);

/* On laisse la tomate voler, puis retomber. */
jeu.images(Math.ceil(solution.r.tVol / IMG) + 40);
horlogeJeu += (Math.ceil(solution.r.tVol / IMG) + 40) * IMG;
const scoreApres = Number(jeu.el("tom-score").textContent);
ok(
  scoreApres === scoreAvant + (solution.r.issue === "tete" ? BAREME.tete : BAREME.corps),
  "un premier coup au but vaut exactement le barème — " + scoreApres + " points"
);
ok(
  jeu.el("tom-touches").textContent === "1 / " + manche.objectif,
  "le compteur de touches suit : " + jeu.el("tom-touches").textContent
);

/* Deuxième coup au but : la série doit passer en ×2. */
const solution2 = reglageGagnant(horlogeJeu);
if (solution2) {
  regle(solution2.angle, solution2.puissance);
  jeu.touche("Enter");
  jeu.images(Math.ceil(solution2.r.tVol / IMG) + 40);
  horlogeJeu += (Math.ceil(solution2.r.tVol / IMG) + 40) * IMG;
  const attendu =
    scoreApres + (solution2.r.issue === "tete" ? BAREME.tete : BAREME.corps) * multiplicateur(2);
  ok(
    Number(jeu.el("tom-score").textContent) === attendu,
    "deux au but d'affilée : la série passe en ×" + multiplicateur(2) + " — " +
      jeu.el("tom-score").textContent + " points"
  );
  ok(
    jeu.el("tom-serie").textContent.indexOf("×" + multiplicateur(2)) > 0,
    "le comptoir affiche la série : " + jeu.el("tom-serie").textContent
  );
}

/* Une tomate volontairement perdue : la série doit repartir de zéro. */
regle(TIR.angleMax, 0);
jeu.touche("Enter");
jeu.images(400);
ok(
  jeu.el("tom-serie").textContent.indexOf("Série : 0") === 0,
  "une tomate perdue remet la série à zéro : " + jeu.el("tom-serie").textContent
);

/* On vide le cageot : la manche doit se terminer toute seule. */
for (let i = 0; i < manche.munitions + 2; i++) {
  jeu.touche("Enter");
  jeu.images(400);
}
ok(
  jeu.el("tom-cageot").childNodes.every((t) => t.className.indexOf("tom-vide") >= 0),
  "le cageot finit vide"
);
ok(
  jeu.el("tom-rideau").innerHTML !== "",
  "cageot vide, le rideau retombe tout seul sur un écran de bilan"
);
ok(
  jeu.el("tom-rideau").innerHTML.indexOf("Cageot vide") >= 0,
  "objectif manqué : c'est l'écran de fin qui s'affiche, pas la manche suivante"
);

/* Le bouton « Rejouer » de l'écran de fin doit relancer une partie propre. */
jeu.bouton().declenche("click");
ok(
  jeu.el("tom-score").textContent === "0" &&
    jeu.el("tom-rideau").innerHTML.indexOf(MANCHES[0].nom) >= 0,
  "« Rejouer » remet le score à zéro et rouvre la manche 1"
);

/* --- L'autre chemin : la manche remportée ------------------------------
   Le cageot vide n'est pas la seule fin possible, et c'est même la moins
   intéressante : dès l'objectif atteint, Mads quitte la scène et les
   tomates qui restent se changent en points. Sans ce test, le bonus de
   munitions ne serait jamais joué — il l'a d'ailleurs été trop tard,
   c'est ce banc d'essai qui a montré qu'il valait toujours zéro. */
{
  const gagnant = chargeMoteur();
  gagnant.bouton().declenche("click"); // écran-titre → briefing
  gagnant.bouton().declenche("click"); // briefing → la scène
  gagnant.images(2);

  let t = 0;
  let tirs = 0;
  for (let i = 0; i < manche.objectif; i++) {
    const s = reglageGagnant(t);
    if (!s) break;
    const aDepart = Number(gagnant.el("tom-angle").textContent.replace("°", ""));
    const pDepart = Number(gagnant.el("tom-puissance").textContent.replace(" %", ""));
    for (let k = 0; k < Math.abs(s.angle - aDepart) / TIR.pasAngle; k++) {
      gagnant.touche(s.angle > aDepart ? "ArrowUp" : "ArrowDown");
    }
    for (let k = 0; k < Math.abs(s.puissance - pDepart) / TIR.pasPuissance; k++) {
      gagnant.touche(s.puissance > pDepart ? "ArrowRight" : "ArrowLeft");
    }
    gagnant.touche("Enter");
    tirs++;
    const n = Math.ceil(s.r.tVol / IMG) + 40;
    gagnant.images(n);
    t += n * IMG;
  }

  const ecran = gagnant.el("tom-rideau").innerHTML;
  ok(
    ecran.indexOf("Manche remportée") >= 0,
    "objectif atteint : la manche s'arrête sans attendre le cageot vide"
  );
  const restantes = manche.munitions - tirs;
  ok(
    ecran.indexOf("+" + restantes * BAREME.munitionRestante) >= 0,
    "les " + restantes + " tomates non lancées valent +" +
      restantes * BAREME.munitionRestante + " points"
  );

  gagnant.bouton().declenche("click");
  ok(
    gagnant.el("tom-rideau").innerHTML.indexOf(MANCHES[1].nom) >= 0 &&
      gagnant.el("tom-manche").textContent.indexOf("(2/5)") > 0,
    "« Manche suivante » enchaîne bien sur « " + MANCHES[1].nom + " »"
  );
}

/* Le barème lui-même : la série suit bien la table déclarée. */
ok(
  BAREME.series.every(([seuil, valeur]) => multiplicateur(seuil) === valeur),
  "chaque palier de série donne le multiplicateur annoncé (" +
    BAREME.series.map((s) => "×" + s[1] + " à " + s[0]).join(", ") + ")"
);
ok(multiplicateur(0) === 1 && multiplicateur(1) === 1, "la première touche ne multiplie rien");
}

console.log(
  "\n" +
    (echecs
      ? echecs + " vérification(s) en échec.\n"
      : "Tout passe : les cinq manches restent atteignables, et le moteur tient la manette.\n")
);
process.exitCode = echecs ? 1 : 0;
