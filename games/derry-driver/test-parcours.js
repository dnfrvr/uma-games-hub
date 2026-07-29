/* =========================================================
   Derry Driver — les parcours sont-ils franchissables ?
   ---------------------------------------------------------
   Un jeu de conduite se casse en silence : une côte trois degrés trop raide
   pour la remorque pleine, une barrière posée en sortie de virage, un
   jerrican de trop tard — et le parcours devient infaisable sans qu'aucune
   erreur n'apparaisse nulle part. Une capture d'écran ne le dit pas, et
   l'essayer trente fois à la main non plus.

   Ce banc d'essai FAIT ROULER le camion. Il ne réimplémente pas la physique,
   il appelle `physique.js`, celui du jeu, au pas fixe du jeu. Ce qui passe
   ici passe donc dans le navigateur.

   Le pilote automatique est volontairement bête : pied au plancher tout du
   long, il saute quand un obstacle arrive dans sa fenêtre balistique et
   redresse la caisse en l'air. C'est le niveau d'un joueur appliqué, pas
   celui d'un virtuose : si LUI passe, le parcours est jouable.

   Ce qui est vérifié, pour CHAQUE chargement (ils n'ont ni la même détente
   ni la même puissance) :
     - le camion arrive au bout ;
     - il lui reste du carburant et de la cargaison ;
     - il ne reste jamais bloqué dans une côte ;
     - la difficulté monte d'un parcours au suivant.
   Plus les vérifications de structure : obstacles dans les bornes, place
   pour retomber entre deux sauts, relief couvrant, bonus atteignables.

   À lancer depuis n'importe où :
       node games/derry-driver/test-parcours.js
   ========================================================= */

"use strict";

const donnees = require("./parcours.js");
const P = require("./physique.js");

const { DD_REGLAGES: R, DD_CHARGES, DD_OBSTACLES, DD_BONUS, DD_PARCOURS } = donnees;

let echecs = 0;
const ok = (vrai, quoi) => {
  console.log((vrai ? "  OK    " : "  ÉCHEC ") + quoi);
  if (!vrai) echecs++;
};

const m = (px) => Math.round(px / R.pixelsParMetre);

/* =========================================================
   Le pilote automatique
   ========================================================= */

/* La vitesse verticale réellement gagnée en sautant, PENTE COMPRISE : le
   moteur ajoute la composante que la route donnait déjà (`v * pente`). Sauter
   en pleine descente monte donc beaucoup moins haut qu'à plat — c'est le
   piège du jeu, et le pilote doit le savoir pour être crédible. */
const elanVertical = (vitesse, pente, charge) =>
  R.saut * charge.detente - vitesse * pente;

const hauteurSaut = (charge, vitesse, pente) =>
  Math.pow(Math.max(0, elanVertical(vitesse || 0, pente || 0, charge)), 2) / (2 * R.gravite);

/* Fenêtre de saut : à quelle distance faut-il sauter pour survoler
   l'obstacle au sommet de la cloche ? On égalise le milieu du survol et le
   sommet du vol. Formules tirées de la physique du moteur :
     temps de vol  = 2 v0 / g
     survol        = (longueur du camion + largeur de l'obstacle) / v      */
function distanceIdeale(vitesse, pente, obstacle, charge) {
  const v0 = elanVertical(vitesse, pente, charge);
  if (v0 <= 0) return -1;
  const vol = (2 * v0) / R.gravite;
  return (vitesse * vol) / 2 - (obstacle.largeur + R.longueur) / 2;
}

function pilote(parcours, charge, options) {
  const opt = options || {};
  const ctx = P.creeContexte(parcours, charge, R, DD_OBSTACLES, DD_BONUS);
  const etat = P.creeEtat(ctx);

  const journal = {
    chocs: [],
    casses: 0,
    decollages: 0,
    ramasses: 0,
    freinages: 0,
    vitesseMin: Infinity,
    vitesseMinX: 0,
    bloque: null,
    sautsRates: [],
  };

  let immobileDepuis = 0;
  const MAX_PAS = Math.round(400 / P.PAS); // 400 s de simulation, large

  for (let n = 0; n < MAX_PAS && !etat.fini; n++) {
    const cmd = { gaz: true, frein: false };

    /* En l'air, les touches font tanguer : on redresse vers la pente
       d'atterrissage plutôt que de garder le pied au plancher. Le pilote
       « brut » (opt.brut), lui, ne lâche rien : il sert à vérifier que le
       réglage du tangage ne punit pas le joueur qui garde le doigt appuyé. */
    if (etat.enVol && !opt.brut) {
      const cible = Math.atan(P.pente(parcours.relief, etat.x + etat.v * 0.25));
      const ecart = etat.tangage - cible;
      cmd.gaz = ecart > 0.02 || (Math.abs(ecart) < 0.02 && etat.vTangage > 0.2);
      cmd.frein = ecart < -0.14;
      if (cmd.gaz && cmd.frein) cmd.frein = false;
    } else if (!etat.enVol) {
      /* Au sol : on cherche le prochain obstacle à franchir et on saute
         quand il entre dans la fenêtre. */
      const p = P.pente(parcours.relief, etat.x);
      for (let i = 0; i < ctx.obstacles.length; i++) {
        if (etat.touches[i]) continue;
        const o = ctx.obstacles[i];
        const bord = o.x - o.largeur / 2 - (etat.x + R.longueur / 2);
        if (bord < -o.largeur - R.longueur) continue;
        if (bord > 600) break;
        /* Trop lancé dans la descente pour décoller assez haut ? On lève le
           pied avant. C'est aussi le bon conseil pour un joueur humain :
           dans une pente, la vitesse mange la détente. */
        const tropRapide = hauteurSaut(charge, etat.v, p) < o.franchir + 12;
        if (bord > 90 && tropRapide) {
          cmd.gaz = false;
          cmd.frein = true;
          journal.freinages++;
        } else if (
          bord <= Math.max(0, distanceIdeale(etat.v, p, o, charge)) &&
          bord > -R.longueur
        ) {
          etat.sautDemande = R.memoireSaut;
        }
        break;
      }
      /* Le pilote ignore les colis : il est là pour prouver qu'on arrive au
         bout, pas pour marquer des points. */
    }

    const ev = P.pas(etat, cmd, ctx);
    for (const e of ev) {
      if (e.type === "choc") journal.chocs.push({ x: Math.round(etat.x), nom: e.obstacle.nom });
      if (e.type === "casse") journal.casses++;
      if (e.type === "decolle") journal.decollages++;
      if (e.type === "ramasse") journal.ramasses++;
    }

    if (!etat.enVol && etat.v < journal.vitesseMin) {
      journal.vitesseMin = etat.v;
      journal.vitesseMinX = etat.x;
    }

    immobileDepuis = Math.abs(etat.v) < 12 ? immobileDepuis + P.PAS : 0;
    if (immobileDepuis > 2.5 && !journal.bloque) {
      journal.bloque = Math.round(etat.x);
      if (opt.arreterSiBloque) break;
    }
  }

  journal.etat = etat;
  journal.ctx = ctx;
  journal.score = P.score(etat, ctx);
  return journal;
}

/* =========================================================
   Le banc d'essai
   ========================================================= */

console.log("\nDerry Driver — franchissabilité des parcours\n");

console.log("· Capacités du camion, d'après le réglage de conduite");
const plusHaut = Math.max(...Object.keys(DD_OBSTACLES).map((k) => DD_OBSTACLES[k].franchir));
for (const ch of DD_CHARGES) {
  const h = hauteurSaut(ch, 0, 0);
  ok(
    h > plusHaut * 1.25,
    ch.nom.padEnd(17) +
      " saute à " + Math.round(h) + " px à plat — il faut " + plusHaut +
      " px pour l'obstacle le plus haut"
  );
}
console.log("");

const mesures = [];

for (const parcours of DD_PARCOURS) {
  console.log("· " + parcours.nom + " (" + parcours.difficulte + ") — " + m(parcours.arrivee) + " m");

  const listes = P.prepare(parcours, DD_OBSTACLES, DD_BONUS);

  /* --- Structure -------------------------------------------------------- */
  const hors = listes.obstacles.filter((o) => o.x < 300 || o.x > parcours.arrivee - 200);
  ok(
    hors.length === 0,
    "les obstacles laissent le départ et l'arrivée dégagés" +
      (hors.length ? " — en cause : x=" + hors.map((o) => o.x).join(", ") : "")
  );

  /* Deux obstacles trop proches, c'est un saut qu'on ne peut pas rejouer :
     il faut la place d'atterrir, de reprendre de la vitesse et de resauter. */
  const serres = [];
  for (let i = 0; i < listes.obstacles.length - 1; i++) {
    const ecart =
      listes.obstacles[i + 1].x -
      listes.obstacles[i + 1].largeur / 2 -
      (listes.obstacles[i].x + listes.obstacles[i].largeur / 2);
    if (ecart < R.longueur * 3) serres.push(listes.obstacles[i].x + " → " + listes.obstacles[i + 1].x);
  }
  ok(
    serres.length === 0,
    "deux obstacles laissent de quoi retomber entre les deux" +
      (serres.length ? " — trop serrés : " + serres.join(", ") : "")
  );

  const relief = parcours.relief;
  ok(
    relief[0].x <= 0 && relief[relief.length - 1].x >= parcours.longueur,
    "le relief couvre tout le parcours, du départ à la longueur annoncée"
  );

  const monteAvant = relief.every((p, i) => i === 0 || p.x > relief[i - 1].x);
  ok(monteAvant, "les points du relief sont ordonnés en x");

  /* Un colis posé plus haut que le saut le plus court est un décor, pas un
     bonus : on ne met pas de récompense hors d'atteinte. */
  const detenteMin = Math.min(...DD_CHARGES.map((c) => hauteurSaut(c, 0, 0)));
  const inatteignables = listes.bonus.filter((b) => b.haut > detenteMin - 10);
  ok(
    inatteignables.length === 0,
    "tous les bonus sont à portée de saut, même chargé à bloc" +
      (inatteignables.length ? " — hors d'atteinte : x=" + inatteignables.map((b) => b.x).join(", ") : "")
  );

  /* --- On roule --------------------------------------------------------- */
  const runs = [];
  for (const charge of DD_CHARGES) {
    const j = pilote(parcours, charge);
    runs.push({ charge: charge, j: j });
    const e = j.etat;

    ok(
      e.fini === "arrive",
      charge.nom.padEnd(17) + " arrive au bout — " +
        (e.fini === "arrive"
          ? Math.round(e.temps) + " s, " + Math.round(e.carburant) + " % de jus, " +
            e.cargaison + "/" + charge.cartons + " cartons"
          : "STOPPÉ (" + (e.fini || "temps de simulation dépassé") + ") à " +
            m(e.distanceMax) + " m sur " + m(parcours.arrivee))
    );

    ok(j.bloque === null, charge.nom.padEnd(17) + " ne reste jamais planté dans une côte" +
      (j.bloque ? " — immobilisé à " + m(j.bloque) + " m" : ""));

    ok(
      e.fini !== "arrive" || e.carburant > 4,
      charge.nom.padEnd(17) + " arrive avec une marge de carburant — " +
        Math.round(e.carburant) + " %"
    );

    ok(
      e.fini !== "arrive" || e.cargaison >= Math.ceil(charge.cartons / 2),
      charge.nom.padEnd(17) + " garde au moins la moitié de sa cargaison — " +
        e.cargaison + "/" + charge.cartons +
        (j.chocs.length ? " (chocs : " + j.chocs.map((c) => c.nom + " à " + m(c.x) + " m").join(", ") + ")" : "")
    );
  }

  /* --- Le joueur qui ne lâche jamais l'accélérateur ----------------------
     C'est le réflexe naturel : on tient la flèche droite du départ à
     l'arrivée. Or en l'air cette même touche fait cabrer la caisse, et
     atterrir de travers coûte un carton. Si ce pilote-là se ruine, le
     réglage du tangage est une punition déguisée, pas une mécanique. */
  const brut = pilote(parcours, DD_CHARGES[1], { brut: true });
  ok(
    brut.casses === 0,
    "garder le pied au plancher ne casse rien en atterrissant" +
      (brut.casses ? " — " + brut.casses + " atterrissage(s) de travers" : "")
  );

  /* --- Repères d'équilibrage --------------------------------------------
     Ils sont tirés des DONNÉES, pas de la partie jouée par le pilote : le
     pilote lève le pied devant une barrière, donc « le carburant qu'il lui
     reste » mesure surtout sa prudence. Ce qu'on veut suivre d'un parcours à
     l'autre, c'est ce que le parcours PROMET : sa raideur, sa densité
     d'obstacles et la réserve de carburant qu'il met à disposition. */
  const enMetres = parcours.arrivee / R.pixelsParMetre;
  const reserve =
    R.carburantMax +
    listes.bonus.reduce((s, b) => s + (b.carburant || 0), 0);
  const mesure = {
    nom: parcours.nom,
    obstaclesPour100m: +((listes.obstacles.length / enMetres) * 100).toFixed(2),
    reservePour100m: +((reserve / enMetres) * 100).toFixed(1),
    jusRestant: Math.round(runs[1].j.etat.carburant),
    pentemax: Math.max(
      ...relief.slice(1).map((p, i) => {
        const a = relief[i];
        return Math.abs(((p.y - a.y) * Math.PI) / (2 * (p.x - a.x)));
      })
    ),
  };
  mesures.push(mesure);

  console.log(
    "        " + mesure.obstaclesPour100m + " obstacles / 100 m · pente max " +
      Math.round((Math.atan(mesure.pentemax) * 180) / Math.PI) + "° · " +
      mesure.reservePour100m + " % de carburant disponible / 100 m · " +
      "il reste " + mesure.jusRestant + " % au pilote d'essai"
  );
  console.log("");
}

/* =========================================================
   La difficulté monte-t-elle ?
   ========================================================= */

console.log("· La courbe de difficulté");
for (let i = 1; i < mesures.length; i++) {
  const a = mesures[i - 1];
  const b = mesures[i];
  ok(
    b.pentemax > a.pentemax,
    "le relief se raidit — " + Math.round((Math.atan(a.pentemax) * 180) / Math.PI) +
      "° puis " + Math.round((Math.atan(b.pentemax) * 180) / Math.PI) + "°"
  );
  ok(
    b.reservePour100m < a.reservePour100m,
    "le carburant se fait plus rare — " + a.reservePour100m + " % puis " +
      b.reservePour100m + " % disponibles pour 100 m"
  );
  ok(
    b.obstaclesPour100m > a.obstaclesPour100m,
    "la route se salit — " + a.obstaclesPour100m + " puis " +
      b.obstaclesPour100m + " obstacles pour 100 m"
  );
}
console.log("");

console.log(
  echecs
    ? echecs + " vérification(s) en échec.\n"
    : "Tout passe : les trois parcours se terminent avec les trois chargements.\n"
);
process.exitCode = echecs ? 1 : 0;
