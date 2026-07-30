/* =========================================================
   Banc d'essai du Love Tester — ce que le navigateur ne sait pas montrer
   ---------------------------------------------------------
   Une capture d'écran prouve qu'un pourcentage s'affiche. Elle ne prouve
   pas qu'il sera le MÊME demain, ni qu'« Éloïse + Drew » et « drew +
   eloise » tombent au même endroit, ni que les scores se répartissent sur
   tout le cadran au lieu de s'entasser vers 50 %. Or c'est exactement là
   que ce jeu se joue : un gadget de compatibilité qui se contredit n'est
   plus un gadget, c'est un bug.

   À lancer depuis n'importe où :
     node games/love-tester/test-hachage.js
   ========================================================= */

"use strict";

const H = require("./hachage.js");

/* --------------------------------------------------------- */

let echecs = 0;
let verifications = 0;

function verifie(titre, condition, detail) {
  verifications++;
  if (condition) {
    console.log("  ok    " + titre);
  } else {
    echecs++;
    console.log("  ÉCHEC " + titre + (detail ? "\n          " + detail : ""));
  }
}

function titre(texte) {
  console.log("\n" + texte + "\n" + "-".repeat(texte.length));
}

/* Un corpus de prénoms varié : accents, traits d'union, longueurs très
   différentes, et le casting du portail. Toutes les paires en seront
   testées, soit environ 5 000 couples. */
const PRENOMS = [
  "Drew", "Glinda", "Elias", "Eoghan", "Nils", "Elphie", "Boq", "Mads Prout",
  "Alice", "Adrien", "Amandine", "Antoine", "Aurélie", "Axel", "Baptiste",
  "Bastien", "Bérénice", "Camille", "Capucine", "Cédric", "Charlotte", "Chloé",
  "Clara", "Clément", "Colin", "Cyril", "Damien", "Daphné", "David", "Delphine",
  "Diane", "Dylan", "Édouard", "Élise", "Éloïse", "Emma", "Émilie", "Enzo",
  "Esteban", "Fabien", "Fanny", "Florian", "Gabriel", "Gaëlle", "Guillaume",
  "Hélène", "Hugo", "Inès", "Jade", "Jean-Luc", "Jeanne", "Jérémie", "Joris",
  "Julie", "Julien", "Kevin", "Killian", "Laura", "Léa", "Léo", "Lilou",
  "Loïc", "Louis", "Lucas", "Lucie", "Maël", "Maëva", "Manon", "Marc",
  "Margaux", "Marie", "Marine", "Mathis", "Maxime", "Mélanie", "Nathan",
  "Nicolas", "Noémie", "Océane", "Olivier", "Pauline", "Pierre", "Quentin",
  "Raphaël", "Rémi", "Romane", "Romain", "Sacha", "Salomé", "Samuel", "Sarah",
  "Sébastien", "Solène", "Sophie", "Stéphane", "Théo", "Thibault", "Thomas",
  "Timothée", "Valentin", "Vanessa", "Victor", "Xavier", "Yann", "Zoé",
];

/* =========================================================
   1. Déterminisme — la promesse centrale
   ========================================================= */

titre("1. Le même couple rend toujours le même pourcentage");

(function () {
  let stable = true;
  for (const a of PRENOMS) {
    for (const b of PRENOMS) {
      const premier = H.score(a, b);
      /* Cent appels ne changent rien : aucune part de hasard, aucun état. */
      if (H.score(a, b) !== premier || H.score(a, b) !== premier) stable = false;
    }
  }
  verifie("un score recalculé est identique, sur tout le corpus", stable);
})();

/* Des valeurs témoins, écrites en dur : si quelqu'un « améliore » le
   hachage un jour, tous les verdicts déjà montrés à quelqu'un changeraient
   en silence. Ces trois lignes le rendent impossible à rater. */
verifie(
  "valeurs témoins inchangées (Drew+Glinda=26, Elias+Eoghan=54, Boq+Glinda=5)",
  H.score("Drew", "Glinda") === 26 &&
    H.score("Elias", "Eoghan") === 54 &&
    H.score("Boq", "Glinda") === 5,
  "obtenu : " +
    [H.score("Drew", "Glinda"), H.score("Elias", "Eoghan"), H.score("Boq", "Glinda")].join(", ")
);

/* =========================================================
   2. Symétrie, casse, accents, ponctuation
   ========================================================= */

titre("2. Ce que la machine doit considérer comme le même couple");

(function () {
  let symetrique = true;
  let casse = true;
  for (const a of PRENOMS) {
    for (const b of PRENOMS) {
      if (H.score(a, b) !== H.score(b, a)) symetrique = false;
      if (H.score(a, b) !== H.score(a.toUpperCase(), b.toLowerCase())) casse = false;
    }
  }
  verifie("l'ordre des deux prénoms ne change rien (toutes les paires)", symetrique);
  verifie("la casse ne change rien (toutes les paires)", casse);
})();

const MEMES = [
  ["Éloïse", "eloise", "accents"],
  ["ELOÏSE", "Éloise", "accents + casse"],
  ["Jean-Luc", "jeanluc", "trait d'union"],
  ["  Drew  ", "Drew", "espaces autour"],
  ["Anne-Sophie", "anne sophie", "tiret contre espace"],
  ["Cœur", "coeur", "ligature œ"],
  ["Lætitia", "laetitia", "ligature æ"],
  ["Renée", "RENEE", "double accent"],
];

MEMES.forEach(([x, y, quoi]) => {
  verifie(
    "« " + x + " » = « " + y + " » (" + quoi + ")",
    H.score(x, "Glinda") === H.score(y, "Glinda") && H.normalise(x) === H.normalise(y),
    "normalisés en « " + H.normalise(x) + " » / « " + H.normalise(y) + " »"
  );
});

/* Le même prénom saisi en composé (NFC) ou décomposé (NFD) : deux suites
   de caractères différentes, un seul prénom pour un être humain. */
verifie(
  "un prénom décomposé (NFD) vaut son équivalent composé (NFC)",
  H.score("Éloïse".normalize("NFD"), "Drew") === H.score("Éloïse".normalize("NFC"), "Drew")
);

titre("3. Ce que la machine doit considérer comme différent");

verifie(
  "deux prénoms voisins d'une lettre donnent des couples distincts",
  H.cle("Marc", "Drew") !== H.cle("Marco", "Drew")
);
verifie(
  "le séparateur de clé empêche les collisions par recollage " +
    "(« Marie+Anne » ≠ « Mari+Eanne »)",
  H.cle("Marie", "Anne") !== H.cle("Mari", "Eanne")
);
verifie(
  "les sels séparent bien les tirages annexes d'un même couple",
  new Set(
    ["alchimie", "complicite", "drame", "formulation"].map((s) =>
      H.tirage("drew+glinda", s, 101)
    )
  ).size >= 3
);

titre("4. Les cas limites");

verifie("un prénom manquant ne rend rien du tout", H.score("", "Drew") === null);
verifie("deux prénoms manquants non plus", H.score("", "") === null);
verifie(
  "une saisie faite uniquement de ponctuation compte pour vide",
  H.score("!!! ???", "Drew") === null
);
verifie(
  "un prénom très long reste calculable",
  typeof H.score("Bartholomeworthingtonlonguevillesmythe", "Drew") === "number"
);
verifie(
  "se tester avec soi-même donne un score valide et stable",
  Number.isInteger(H.score("Drew", "drew")) &&
    H.score("Drew", "drew") === H.score("DREW", "Drew")
);

/* =========================================================
   5. La répartition sur le cadran
   ========================================================= */

titre("5. Les scores couvrent tout le cadran, sans paquet");

const scores = [];
for (let i = 0; i < PRENOMS.length; i++) {
  for (let j = i; j < PRENOMS.length; j++) {
    scores.push(H.score(PRENOMS[i], PRENOMS[j]));
  }
}

verifie(
  "toutes les valeurs sont des entiers de 0 à 100 (" + scores.length + " couples)",
  scores.every((s) => Number.isInteger(s) && s >= 0 && s <= 100)
);

verifie(
  "les extrêmes sont atteignables : au moins un score < 5 et un score > 95",
  scores.some((s) => s < 5) && scores.some((s) => s > 95)
);

verifie(
  "le cadran est bien occupé : au moins 95 des 101 valeurs sortent",
  new Set(scores).size >= 95,
  new Set(scores).size + " valeurs distinctes"
);

/* Dix cases. Comme 101 ne se divise pas par 10, l'attendu de chaque case
   est calculé à partir du nombre exact de valeurs qu'elle couvre — sinon
   on jugerait le hachage sur une inégalité qui vient de l'arithmétique. */
const CASES = 10;
const caseDe = (s) => Math.floor((s * CASES) / 101);

const observe = new Array(CASES).fill(0);
const largeur = new Array(CASES).fill(0);
scores.forEach((s) => observe[caseDe(s)]++);
for (let v = 0; v <= 100; v++) largeur[caseDe(v)]++;

let khi2 = 0;
const lignes = [];
for (let c = 0; c < CASES; c++) {
  const attendu = (scores.length * largeur[c]) / 101;
  khi2 += Math.pow(observe[c] - attendu, 2) / attendu;
  lignes.push(
    "  " +
      String(c * 10).padStart(3) +
      "-" +
      String(Math.min(100, c * 10 + 10)).padEnd(3) +
      " " +
      "#".repeat(Math.round((observe[c] / scores.length) * 200)) +
      " " +
      ((observe[c] / scores.length) * 100).toFixed(1) +
      " % (attendu " +
      ((attendu / scores.length) * 100).toFixed(1) +
      " %)"
  );
}
console.log("\n" + lignes.join("\n") + "\n");

/* 9 degrés de liberté : au-delà de 27,9 il y a moins d'une chance sur mille
   que ce soit du bruit — ce serait donc un vrai défaut de répartition. */
verifie(
  "test du khi² sur 10 cases : " + khi2.toFixed(1) + " < 27,9 (9 ddl, p = 0,001)",
  khi2 < 27.9
);

const milieu = scores.filter((s) => s >= 45 && s <= 55).length / scores.length;
verifie(
  "pas de paquet au milieu : " + (milieu * 100).toFixed(1) + " % entre 45 et 55 (attendu 10,9 %)",
  milieu < 0.15,
  "un score composé d'une moyenne de sous-scores donnerait ici plus de 25 %"
);

/* Avalanche : changer une lettre doit envoyer le score n'importe où
   ailleurs. Sur 0-100 uniforme, deux tirages indépendants diffèrent en
   moyenne d'environ 34 points ; si le hachage « suivait » les lettres, on
   tomberait bien plus bas. */
(function () {
  let somme = 0;
  let n = 0;
  const ALPHABET = "abcdefghijklmnopqrstuvwxyz";
  for (const nom of PRENOMS) {
    const base = H.normalise(nom);
    if (!base) continue;
    for (const lettre of ALPHABET) {
      const voisin = base.slice(0, -1) + lettre;
      if (voisin === base) continue;
      somme += Math.abs(H.score(nom, "Glinda") - H.score(voisin, "Glinda"));
      n++;
    }
  }
  const moyenne = somme / n;
  verifie(
    "une lettre changée déplace le score de " + moyenne.toFixed(1) + " points en moyenne (≈ 34 attendu)",
    moyenne > 30 && moyenne < 38,
    n + " voisinages testés"
  );
})();

/* Les trois relevés annexes doivent être indépendants du pourcentage : sans
   ça, « alchimie » ne serait qu'une redite du verdict. */
(function () {
  const paires = [];
  for (let i = 0; i < PRENOMS.length; i++) {
    for (let j = i + 1; j < PRENOMS.length; j++) {
      const cle = H.cle(PRENOMS[i], PRENOMS[j]);
      paires.push([H.score(PRENOMS[i], PRENOMS[j]), H.tirage(cle, "alchimie", 101)]);
    }
  }
  const moy = (f) => paires.reduce((s, p) => s + f(p), 0) / paires.length;
  const mx = moy((p) => p[0]);
  const my = moy((p) => p[1]);
  const cov = moy((p) => (p[0] - mx) * (p[1] - my));
  const sx = Math.sqrt(moy((p) => Math.pow(p[0] - mx, 2)));
  const sy = Math.sqrt(moy((p) => Math.pow(p[1] - my, 2)));
  const r = cov / (sx * sy);
  verifie(
    "le relevé « alchimie » n'est pas une redite du score (corrélation " + r.toFixed(3) + ")",
    Math.abs(r) < 0.06
  );
})();

/* =========================================================
   6. Cohérence des données servies au joueur
   ========================================================= */

titre("6. verdicts.js : des données que le moteur peut consommer");

/* verdicts.js est écrit pour la page (un `const` global, pas de module) :
   on l'évalue ici dans un bac à sable pour en récupérer le contenu sans
   ajouter la moindre ligne de plomberie dans le fichier lui-même. */
const D = (function () {
  const fs = require("fs");
  const path = require("path");
  const source = fs.readFileSync(path.join(__dirname, "verdicts.js"), "utf8");
  return new Function(source + "\nreturn DONNEES_LOVE;")();
})();

verifie("la première tranche part bien de 0", D.TRANCHES[0].min === 0);
verifie(
  "les tranches sont rangées dans l'ordre croissant",
  D.TRANCHES.every((t, i) => i === 0 || t.min > D.TRANCHES[i - 1].min)
);
verifie(
  "chaque tranche a un titre, un cran de voyant et trois formulations",
  D.TRANCHES.every((t) => t.titre && t.cran && t.textes.length === 3)
);

(function () {
  /* Tout score de 0 à 100 doit trouver sa tranche : c'est la même boucle
     que dans main.js, donc si l'une passe, l'autre passe. */
  let couvert = true;
  for (let s = 0; s <= 100; s++) {
    let rang = -1;
    D.TRANCHES.forEach((t, i) => {
      if (s >= t.min) rang = i;
    });
    if (rang === -1) couvert = false;
  }
  verifie("aucun score de 0 à 100 ne reste sans verdict", couvert);
})();

verifie(
  "les prénoms du casting sont distincts une fois normalisés",
  new Set(D.CASTING.map((c) => H.normalise(c.nom))).size === D.CASTING.length
);

verifie(
  "chaque personnage du casting a un nom et une mention",
  D.CASTING.every((c) => c.nom && c.mention)
);

/* La machine est un appareil à TEXTE : plus aucun visage, donc plus aucun
   réglage de dessin dans les données. Cette vérification empêche de les
   réintroduire par distraction — avec eux revenait le seul problème que la
   conversion en illustrations ne savait pas résoudre : inventer une tête pour
   un prénom quelconque, alors que l'ensemble des prénoms est infini. */
verifie(
  "aucun réglage de dessin ne subsiste dans les données",
  D.CASTING.every((c) => !c.look) && !D.PALETTE
);

/* Un relevé annexe ne doit plus pouvoir CONTREDIRE le verdict. Avant, les
   trois étaient des tirages indépendants : la machine annonçait 5 % de
   compatibilité avec 81 % d'alchimie, ce qui se lit comme un appareil cassé
   et non comme un appareil farfelu. Chacun gravite désormais autour du
   verdict, dans les limites de son propre `ecart`. */
(function () {
  const noms = D.CASTING.map((c) => c.nom).concat(["Camille", "Sacha", "Alix", "Noa"]);
  let pire = 0;
  let exemple = "";
  for (let i = 0; i < noms.length; i++) {
    for (let j = i + 1; j < noms.length; j++) {
      const cle = H.cle(noms[i], noms[j]);
      const score = H.score(noms[i], noms[j]);
      for (const axe of D.AXES) {
        const base = axe.inverse ? 100 - score : score;
        const derive = H.tirage(cle, axe.sel, 2 * axe.ecart + 1) - axe.ecart;
        const valeur = Math.max(0, Math.min(100, base + derive));
        const ecart = Math.abs(valeur - base);
        if (ecart > pire) {
          pire = ecart;
          exemple = noms[i] + "+" + noms[j] + " " + axe.nom + " " + valeur + " % pour " + base + " %";
        }
      }
    }
  }
  const plafond = Math.max(...D.AXES.map((a) => a.ecart));
  verifie(
    "aucun relevé ne s'écarte du verdict de plus de " + plafond + " points",
    pire <= plafond,
    "pire : " + exemple
  );
})();

verifie(
  "chaque relevé annonce son écart et son sens",
  D.AXES.every((a) => typeof a.ecart === "number" && a.ecart > 0 && a.ecart <= 30)
);

verifie(
  "le risque de drame va à l'envers du verdict",
  D.AXES.some((a) => a.inverse === true)
);

verifie(
  "chaque relevé annexe a trois commentaires (bas, moyen, haut)",
  D.AXES.every((a) => a.commentaires.length === 3 && a.sel)
);

verifie(
  "les sels des relevés sont distincts, sinon les trois barres seraient égales",
  new Set(D.AXES.map((a) => a.sel)).size === D.AXES.length
);

verifie("il y a de quoi marmonner au moins quatre étapes", D.ETAPES.length >= 4);
verifie("il y a plusieurs mentions de bas de cadran", D.MENTIONS.length >= 4);

/* --------------------------------------------------------- */

console.log(
  "\n" +
    (echecs === 0
      ? "  OK    " + verifications + " vérifications, aucun échec\n"
      : "  " + echecs + " échec(s) sur " + verifications + " vérifications\n")
);
process.exitCode = echecs ? 1 : 0;
