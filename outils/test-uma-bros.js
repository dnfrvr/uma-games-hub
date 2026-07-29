/* =========================================================
   UMA Bros — le niveau est-il franchissable ?
   ---------------------------------------------------------
   Un jeu de plateforme se casse en silence : un trou trois pixels trop large
   et le niveau devient infranchissable, sans aucune erreur nulle part. Une
   capture d'écran ne le dit pas, jouer trente fois non plus.

   Ce banc d'essai relit `games/uma-bros/niveaux.js` et vérifie, pour CHAQUE
   personnage jouable (ils n'ont ni la même détente ni la même foulée) :
     - que chaque trou du sol se saute ;
     - que chaque plateforme est atteignable depuis le sol ou depuis une
       plateforme voisine ;
     - qu'aucun ennemi ne patrouille au-dessus du vide ;
     - que le drapeau d'arrivée est posé sur du solide.

   Les formules sortent tout droit de la physique du moteur, qui lit les
   mêmes constantes :
     hauteur de saut  = v² / 2g
     temps en l'air   = 2v / g
     portée           = vitesse × temps en l'air

   À lancer depuis la racine :  node outils/test-uma-bros.js
   ========================================================= */

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const RACINE = path.join(__dirname, "..");

/* niveaux.js n'est que des déclarations : on l'évalue tel quel, sans DOM. */
const bac = {};
vm.createContext(bac);
vm.runInContext(
  fs.readFileSync(path.join(RACINE, "games/uma-bros/niveaux.js"), "utf8") +
    ";({ PHYSIQUE, PERSOS, ENNEMIS, NIVEAUX, Y_SOL, Y_CHUTE })",
  bac
);
const { PHYSIQUE, PERSOS, ENNEMIS, NIVEAUX, Y_SOL } = vm.runInContext(
  "({ PHYSIQUE, PERSOS, ENNEMIS, NIVEAUX, Y_SOL, Y_CHUTE })",
  bac
);

let echecs = 0;
const ok = (vrai, quoi) => {
  console.log((vrai ? "  OK    " : "  ÉCHEC ") + quoi);
  if (!vrai) echecs++;
};

/* Ce dont un personnage est capable, d'après la physique du moteur. */
function capacites(perso) {
  const v = PHYSIQUE.saut * perso.saut;
  const vitesse = PHYSIQUE.vitesse * perso.vitesse;
  const hauteur = (v * v) / (2 * PHYSIQUE.gravite);
  const airTotal = (2 * v) / PHYSIQUE.gravite;
  return { hauteur, portee: vitesse * airTotal, vitesse };
}

/* Le sol est-il plein à cette abscisse ? */
const solide = (niveau, x) =>
  niveau.sols.some((s) => x >= s.x && x <= s.x + s.l);

console.log("\nUMA Bros — franchissabilité des niveaux\n");

for (const niveau of NIVEAUX) {
  console.log("· " + niveau.nom + " (" + niveau.difficulte + ")");

  /* --- Les trous du sol --- */
  const trous = [];
  for (let i = 0; i < niveau.sols.length - 1; i++) {
    const fin = niveau.sols[i].x + niveau.sols[i].l;
    const debut = niveau.sols[i + 1].x;
    if (debut > fin) trous.push({ debut: fin, largeur: debut - fin });
  }

  for (const perso of PERSOS) {
    const c = capacites(perso);
    /* On garde une marge : atterrir au pixel près n'est pas un jeu, c'est une
       punition. 75 % de la portée théorique reste confortable. */
    const sur = c.portee * 0.75;
    const pire = trous.reduce((m, t) => Math.max(m, t.largeur), 0);
    ok(
      pire <= sur,
      perso.nom.padEnd(7) + " franchit le plus grand trou — " +
        Math.round(pire) + " px pour " + Math.round(sur) + " px de portée sûre"
    );
  }

  /* --- Les plateformes sont-elles atteignables ? --- */
  const cMin = PERSOS.map(capacites).reduce((a, b) =>
    a.hauteur < b.hauteur ? a : b
  );
  const appuis = [{ y: Y_SOL, x: 0, l: niveau.longueur }].concat(
    niveau.blocs.map((b) => ({ y: b.y, x: b.x, l: b.l }))
  );

  const inaccessibles = niveau.blocs.filter((b) => {
    return !appuis.some((a) => {
      if (a === b || a.y <= b.y) return false; // il faut partir de plus bas
      const montee = a.y - b.y;
      if (montee > cMin.hauteur) return false;
      /* Assez proche horizontalement pour retomber dessus ? */
      const ecart = Math.max(a.x - (b.x + b.l), b.x - (a.x + a.l), 0);
      return ecart <= cMin.portee * 0.6;
    });
  });
  ok(
    inaccessibles.length === 0,
    "toutes les plateformes sont atteignables" +
      (inaccessibles.length
        ? " — hors de portée : x=" + inaccessibles.map((b) => b.x).join(", ")
        : " (" + niveau.blocs.length + " plateformes)")
  );

  /* --- Les ennemis patrouillent-ils sur du solide ? --- */
  const flottants = niveau.ennemis.filter((e) => {
    /* Ceux qui volent sont justement censés être en l air. */
    if (ENNEMIS[e.type].vol) return false;
    if (e.y !== undefined) {
      /* Posé sur une plateforme : elle doit exister et couvrir la patrouille. */
      return !niveau.blocs.some(
        (b) => b.y === e.y && e.de >= b.x && e.a <= b.x + b.l
      );
    }
    const pas = 10;
    for (let x = e.de; x <= e.a; x += pas) if (!solide(niveau, x)) return true;
    return false;
  });
  ok(
    flottants.length === 0,
    "aucun ennemi ne patrouille au-dessus du vide" +
      (flottants.length ? " — en l'air : x=" + flottants.map((e) => e.x).join(", ") : "")
  );

  /* --- Les bornes de patrouille sont-elles cohérentes ? --- */
  const bornes = niveau.ennemis.filter((e) => {
    const large = ENNEMIS[e.type].largeur;
    return e.a - e.de < large + 20 || e.x < e.de || e.x > e.a;
  });
  ok(bornes.length === 0, "les patrouilles ont de la place et démarrent dedans");

  /* --- L'arrivée --- */
  ok(solide(niveau, niveau.arrivee), "le drapeau d'arrivée est posé sur du sol");
  ok(
    niveau.arrivee <= niveau.longueur,
    "le drapeau tient dans la longueur annoncée du niveau"
  );

  /* --- Le chrono laisse-t-il le temps de traverser ? --- */
  const lent = PERSOS.map(capacites).reduce((a, b) =>
    a.vitesse < b.vitesse ? a : b
  );
  const droitDevant = niveau.arrivee / lent.vitesse;
  ok(
    niveau.chrono >= droitDevant * 2,
    "le chrono laisse au moins le double du trajet en ligne droite — " +
      niveau.chrono + " s pour " + Math.round(droitDevant) + " s"
  );

  console.log("");
}

console.log(
  echecs
    ? echecs + " vérification(s) en échec.\n"
    : "Tout passe : les niveaux sont franchissables par les quatre personnages.\n"
);
process.exitCode = echecs ? 1 : 0;
