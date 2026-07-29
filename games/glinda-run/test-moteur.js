/* =========================================================
   Run, Glinda, Run — le moteur tourne-t-il vraiment ?
   ---------------------------------------------------------
   `test-course.js` prouve que le PARCOURS est franchissable, en rejouant la
   physique à côté du moteur. Ça ne dit rien du moteur lui-même : une faute
   de frappe dans `main.js`, une boîte de collision décalée de dix pixels, et
   le jeu est injouable alors que le générateur reste irréprochable.

   Ici on charge le vrai `main.js`, dans un DOM de contrebande assez complet
   pour qu'il croie être dans un navigateur, et on le JOUE : un pilote
   automatique lit les obstacles là où le moteur les a posés (leurs
   `transform`, comme le ferait l'œil du joueur), appuie sur les touches et
   doit survivre.

   Ce que ça attrape, et que rien d'autre n'attrape ici :
     - une erreur d'exécution au démarrage ou en cours de partie ;
     - une commande qui ne répond pas (saut, glissade) ;
     - un désaccord entre ce que le générateur promet et ce que le moteur
       fait vraiment des mêmes chiffres ;
     - un tableau de bord qui n'affiche plus rien.

   Pourquoi pas un navigateur : quand l'onglet passe en arrière-plan, Chrome
   gèle `requestAnimationFrame`. Une course sans fin ne s'observe alors plus
   du tout. Ici on tient l'horloge nous-mêmes.

   À lancer depuis la racine :  node games/glinda-run/test-moteur.js
   ========================================================= */

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ICI = __dirname;
const RACINE = path.join(ICI, "..", "..");

let echecs = 0;
const ok = (vrai, quoi) => {
  console.log((vrai ? "  OK    " : "  ÉCHEC ") + quoi);
  if (!vrai) echecs++;
};

/* =========================================================
   Un DOM de contrebande
   ---------------------------------------------------------
   Juste ce dont main.js se sert, pas une ligne de plus. Les éléments
   inconnus sont fabriqués à la demande : le moteur ne doit jamais tomber
   sur un `null`, sinon on testerait le décor du banc d'essai.
   ========================================================= */

function creeElement(tag) {
  const classes = new Set();
  const el = {
    tagName: tag || "div",
    children: [],
    parentElement: null,
    innerHTML: "",
    textContent: "",
    dataset: {},
    clientWidth: 940,
    style: { setProperty: function (k, v) { this[k] = v; } },
    ecouteurs: {},
    classList: {
      add: function () { for (const c of arguments) classes.add(c); },
      remove: function () { for (const c of arguments) classes.delete(c); },
      contains: (c) => classes.has(c),
      toggle: function (c, force) {
        const veut = force === undefined ? !classes.has(c) : !!force;
        if (veut) classes.add(c);
        else classes.delete(c);
        return veut;
      },
    },
    _classes: classes,
    appendChild: function (enfant) {
      enfant.parentElement = el;
      el.children.push(enfant);
      return enfant;
    },
    remove: function () {
      if (!el.parentElement) return;
      const i = el.parentElement.children.indexOf(el);
      if (i >= 0) el.parentElement.children.splice(i, 1);
      el.parentElement = null;
    },
    addEventListener: function (nom, fn) {
      (el.ecouteurs[nom] = el.ecouteurs[nom] || []).push(fn);
    },
    click: function () {
      (el.ecouteurs.click || []).forEach((fn) => fn({ preventDefault() {} }));
    },
    focus: function () {},
    querySelector: function (sel) {
      /* Les écrans du jeu ne contiennent qu'un bouton : c'est celui-là. */
      if (sel === "button") return registre["#run-partir"];
      return document.querySelector(sel);
    },
  };
  Object.defineProperty(el, "className", {
    get: () => [...classes].join(" "),
    set: (v) => {
      classes.clear();
      String(v).split(/\s+/).filter(Boolean).forEach((c) => classes.add(c));
    },
  });
  return el;
}

const registre = {};
const document = {
  ecouteurs: {},
  createElement: creeElement,
  addEventListener: function (nom, fn) {
    (document.ecouteurs[nom] = document.ecouteurs[nom] || []).push(fn);
  },
  querySelector: function (sel) {
    if (!registre[sel]) {
      registre[sel] = creeElement("div");
      /* Le moteur remonte parfois d'un cran (la jauge habille son parent) :
         on ne lui rend jamais un orphelin. */
      registre[sel].parentElement = creeElement("div");
    }
    return registre[sel];
  },
  hidden: false,
};

/* L'horloge : on la tient à la main, image par image. */
let file = [];
const window = {
  matchMedia: () => ({ matches: false }),
  requestAnimationFrame: (fn) => {
    file.push(fn);
    return file.length;
  },
  cancelAnimationFrame: () => {},
};

const bac = {
  document: document,
  window: window,
  requestAnimationFrame: window.requestAnimationFrame,
  cancelAnimationFrame: window.cancelAnimationFrame,
  performance: { now: () => horloge },
  Math: Math,
  Object: Object,
  Number: Number,
  String: String,
  /* Le générateur tire sa graine de l'horloge quand on ne lui en donne pas :
     on la fige, sinon le banc d'essai raconterait une partie différente à
     chaque exécution et ne prouverait plus rien. */
  Date: { now: () => 20260729 },
  Array: Array,
  console: console,
};
let horloge = 0;
vm.createContext(bac);

const source = (f) => fs.readFileSync(f, "utf8");

console.log("\nRun, Glinda, Run — le moteur, joué pour de vrai\n");
console.log("· Le chargement");

let planta = null;
try {
  vm.runInContext(
    source(path.join(RACINE, "shared/perso.js")) + "\n" +
      source(path.join(ICI, "donnees.js")) + "\n" +
      source(path.join(ICI, "generateur.js")) + "\n" +
      source(path.join(ICI, "main.js")),
    bac
  );
} catch (e) {
  planta = e;
}
ok(!planta, "les quatre fichiers se chargent sans erreur" + (planta ? " — " + planta.message : ""));
if (planta) {
  console.log("");
  process.exit(1);
}

const M = vm.runInContext(
  "({ PHYSIQUE, OBSTACLES, AIR_DE_SAUT, vitesseA })",
  bac
);
const P = M.PHYSIQUE;
const AIR = M.AIR_DE_SAUT;
const PAR_TYPE = {};
for (const def of M.OBSTACLES) PAR_TYPE[def.id] = def;

const ecran = registre["#run-ecran"];
ok(
  ecran._classes.has("run-visible") && /run-partir/.test(ecran.innerHTML),
  "l'écran-titre s'affiche avec son bouton"
);
console.log("");

/* =========================================================
   Les commandes, vues du dehors
   ========================================================= */

function touche(nom, code) {
  (document.ecouteurs[nom] || []).forEach((fn) =>
    fn({ code: code, target: null, preventDefault() {} })
  );
}

/* Une image de jeu : on avance l'horloge, puis on déroule ce que le moteur
   avait demandé à requestAnimationFrame. */
function image(ms) {
  horloge += ms;
  const aFaire = file;
  file = [];
  aFaire.forEach((fn) => fn(horloge));
}

/* Lit la position d'un élément dans son `transform` : c'est ce que le joueur
   voit à l'écran, donc c'est la seule chose que le pilote a le droit de
   savoir. Le repère vertical du moteur part de la LIGNE DE SOL et monte en
   négatif — 0 = les pieds par terre. */
function lisTransform(el) {
  const m = /translate3d\((-?[\d.]+)px,(-?[\d.]+)px/.exec(el.style.transform || "");
  return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : null;
}

function obstaclesAffiches() {
  const acteurs = registre["#run-acteurs"];
  const sortie = [];
  for (const el of acteurs.children) {
    if (!el._classes.has("run-obstacle")) continue;
    if (el._classes.has("run-cogne")) continue;
    const pos = lisTransform(el);
    if (!pos) continue;
    let type = null;
    for (const c of el._classes) {
      if (c.indexOf("run-obstacle-") === 0) type = c.slice(13);
    }
    if (!PAR_TYPE[type]) continue;
    sortie.push({ def: PAR_TYPE[type], x: pos.x });
  }
  return sortie.sort((a, b) => a.x - b.x);
}

/* L'allure affichée suffit à retrouver la vitesse : le pilote n'a pas accès
   à l'intérieur du moteur, comme un vrai joueur. */
function vitesseLue() {
  const t = registre["#run-allure"].textContent || "×1,0";
  return parseFloat(t.replace("×", "").replace(",", ".")) * P.vMin;
}

/* =========================================================
   La partie
   ========================================================= */

console.log("· Une partie de 90 secondes, jouée par un pilote automatique");

registre["#run-partir"].click();
ok(!ecran._classes.has("run-visible"), "le bouton lance la course");

const PAS = 1000 / 60;
const IMAGES = 90 * 60;
let accroc = null;
let glisseEnCours = false;
let sauts = 0;
let glissades = 0;
let chocs = 0;
let derniereDistance = 0;

for (let n = 0; n < IMAGES; n++) {
  try {
    image(PAS);
  } catch (e) {
    accroc = e;
    break;
  }

  if (ecran._classes.has("run-visible")) break; // Boq l'a rattrapée

  const v = vitesseLue();
  const liste = obstaclesAffiches();
  const devant = liste.filter((o) => o.x + o.def.largeur > P.xJoueur);
  const cible = devant[0];

  /* Le pilote ne triche pas : il devine si Glinda touche terre à sa hauteur
     à l'écran, comme le ferait un joueur. Sans ça il garde la touche de saut
     enfoncée et elle rebondit sans arrêt. */
  const pos = lisTransform(registre["#run-glinda"]);
  const hauteur = glisseEnCours ? P.joueurHGlisse : P.joueurH;
  const auSol = !pos || pos.y >= -hauteur - 0.5;

  /* Faut-il rester accroupie ? */
  let besoin = false;
  for (const o of devant.slice(0, 3)) {
    if (o.def.genre !== "haut") continue;
    if (P.xJoueur + P.joueurL > o.x - v * 0.1 && P.xJoueur < o.x + o.def.largeur + 6) besoin = true;
  }
  if (besoin && !glisseEnCours && auSol) {
    touche("keydown", "ArrowDown");
    glisseEnCours = true;
    glissades++;
  } else if (!besoin && glisseEnCours) {
    touche("keyup", "ArrowDown");
    glisseEnCours = false;
  }

  /* Le saut : on appelle pour que le sommet tombe au milieu de l'obstacle. */
  if (cible && cible.def.genre === "sol" && !glisseEnCours && auSol) {
    const appel = cible.x + (cible.def.largeur - P.joueurL) / 2 - (v * AIR) / 2;
    if (P.xJoueur >= appel) {
      touche("keydown", "Space");
      touche("keyup", "Space");
      sauts++;
    }
  }

  /* Un obstacle marqué « cogné », c'est une faute du pilote OU du moteur. */
  for (const el of registre["#run-acteurs"].children) {
    if (el._classes.has("run-cogne") && !el._compte) {
      el._compte = true;
      chocs++;
    }
  }

  const d = parseInt(String(registre["#run-distance"].textContent).replace(/\D/g, ""), 10) || 0;
  derniereDistance = d;
}

ok(!accroc, "aucune erreur d'exécution pendant la partie" + (accroc ? " — " + accroc.message : ""));
ok(derniereDistance > 800, "la course avance vraiment — " + derniereDistance + " m parcourus");
ok(sauts > 20, "le saut répond aux touches — " + sauts + " sauts");
ok(glissades > 3, "la glissade répond aux touches — " + glissades + " passages accroupie");
ok(
  chocs === 0,
  "le pilote traverse tout sans rien toucher" +
    (chocs ? " — " + chocs + " obstacle(s) cogné(s) en " + derniereDistance + " m" : "")
);

/* Le tableau de bord dit-il encore quelque chose ? */
const tableau = {
  distance: registre["#run-distance"].textContent,
  score: registre["#run-score"].textContent,
  allure: registre["#run-allure"].textContent,
  alerte: registre["#run-alerte"].textContent,
  jauge: registre["#run-jauge-barre"].style.width,
};
ok(
  /m$/.test(tableau.distance) && /^×/.test(tableau.allure) && /%$/.test(tableau.jauge),
  "le tableau de bord est à jour — " + tableau.distance + " · " + tableau.allure +
    " · jauge à " + tableau.jauge
);
console.log("");

/* =========================================================
   Et si on ne joue pas du tout ?
   ---------------------------------------------------------
   Un joueur qui pose sa manette doit perdre, et proprement : écran de fin,
   score, bouton pour repartir. C'est aussi le seul moyen de vérifier que la
   partie se TERMINE.
   ========================================================= */

console.log("· Une partie sans toucher à rien");

registre["#run-partir"].click();
let fin = 0;
let planteFin = null;
try {
  for (fin = 0; fin < 120 * 60; fin++) {
    image(PAS);
    if (ecran._classes.has("run-visible")) break;
  }
} catch (e) {
  planteFin = e;
}

ok(!planteFin, "la fin de partie ne casse rien" + (planteFin ? " — " + planteFin.message : ""));
ok(
  ecran._classes.has("run-visible"),
  "Boq finit par rattraper une joueuse immobile — au bout de " + (fin / 60).toFixed(1) + " s"
);
ok(
  /run-rejouer/.test(ecran.innerHTML) && /Score/.test(ecran.innerHTML),
  "l'écran de fin annonce le score et propose de repartir"
);
ok(
  (registre[".run-annonce"].textContent || "").indexOf("rattrapée") >= 0,
  "la zone d'annonce lit le résultat à voix haute — « " +
    registre[".run-annonce"].textContent + " »"
);
console.log("");

console.log(
  echecs
    ? echecs + " vérification(s) en échec.\n"
    : "Tout passe : le moteur démarre, répond aux touches, se joue et se termine.\n"
);
process.exitCode = echecs ? 1 : 0;
