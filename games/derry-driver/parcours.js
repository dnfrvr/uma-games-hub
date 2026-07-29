/* =========================================================
   Derry Driver — les données du jeu
   ---------------------------------------------------------
   Tout ce qui est CONTENU vit ici : le réglage de la conduite, les trois
   chargements possibles, le catalogue d'obstacles et de ramassables, et les
   parcours. `physique.js` et `main.js` ne connaissent aucun nom propre :
   ajouter un parcours ou un obstacle ne demande pas d'y toucher.

   Repère du monde : x augmente vers la droite, y augmente vers le BAS (comme
   en CSS et comme dans UMA Bros). Un `y` PLUS PETIT est donc une côte.
   Une unité de route = 1 px ; on affiche des mètres à raison de 20 px/m.

   La route est une polyligne lissée : entre deux points, l'altitude suit une
   demi-cosinusoïde. Conséquence à connaître en dessinant un relief : la pente
   est nulle À CHAQUE point, et maximale au milieu d'un segment. Une côte, ça
   se décrit donc par deux points « pied » et un point « sommet », et sa
   raideur se règle en rapprochant les points, pas en exagérant les altitudes.

   `test-parcours.js` relit ce fichier, fait rouler le camion avec le vrai
   moteur et prouve que chaque parcours reste franchissable. À lancer après
   toute retouche :  node games/derry-driver/test-parcours.js
   ========================================================= */

/* --- Le réglage de la conduite -------------------------------------------
   C'est du réglage de difficulté, pas de la plomberie : il vit à côté des
   parcours pour qu'on puisse le relire avec eux, et pour que le banc d'essai
   vérifie qu'une côte reste grimpable AVEC ces valeurs-là.
   Tout est en pixels et en secondes. */
const DD_REGLAGES = {
  /* Le poids du camion tient dans ces trois lignes : la gravité tire fort,
     le moteur pousse à peine plus qu'elle sur une côte à 20°, et le
     roulement mange la vitesse dès qu'on lâche l'accélérateur. On ne
     retrouve donc pas son élan d'un claquement de doigts. */
  gravite: 1750,
  moteur: 700,
  frein: 1100,
  marcheArriere: 300,

  roulement: 0.42, // frottement au sol, par seconde
  traineeAir: 0.16, // en l'air, on ne freine presque plus
  vMax: 460,
  vArriere: 120,

  /* Le saut n'est pas un saut de plateforme : c'est un coup de suspension.
     Court, plat, et il coûte le peu d'élan qu'on avait. */
  saut: 560,
  memoireSaut: 0.12,

  /* La suspension : un ressort amorti sous la caisse. C'est elle qui fait
     que le camion « respire » au lieu de coulisser comme un carré. */
  ressort: 130,
  amorti: 13,
  chocRef: 900, // vitesse de choc qui écrase la suspension à fond

  /* Le tangage : au sol, la caisse se plaque sur la pente (ressort raide).
     En l'air, elle ne s'aligne presque plus toute seule — c'est au joueur de
     la redresser avec les flèches. Le réglage est fait pour que garder
     bêtement le pied au plancher pendant un saut normal ne casse RIEN
     (0,6 s de couple ne suffisent pas à atteindre le seuil), mais qu'un long
     vol pris sans rien faire, si. `test-parcours.js` le vérifie avec un
     pilote qui ne lâche jamais l'accélérateur. */
  couple: 1.4,
  tangageKSol: 40,
  tangageCSol: 11,
  tangageKAir: 1.6,
  tangageCAir: 1.8,
  tangageCasse: 0.66, // ~38° d'écart avec la pente : un carton part

  carburantMax: 100,
  consoBase: 1.15, // %/s, moteur au ralenti
  consoGaz: 3.45, // %/s de plus, pied au plancher

  /* Boîte de collision du camion. Le dessin est un peu plus long que ça :
     on préfère pardonner que punir un pixel d'aile. */
  longueur: 96,
  hauteur: 68,

  pixelsParMetre: 20,
};

/* --- Les trois chargements ------------------------------------------------
   Le seul choix du joueur avant de partir, et c'est un vrai arbitrage : plus
   on charge, plus on marque, moins on grimpe. Les multiplicateurs sont
   appliqués tels quels par le moteur. */
const DD_CHARGES = [
  {
    id: "camionnette",
    nom: "Camionnette",
    cartons: 6,
    resume: "Six cartons. Ça monte partout.",
    detail: "Drew la conduit d'une main. Peu de points, mais peu de sueur.",
    puissance: 1.14,
    detente: 1.1,
    conso: 0.86,
    vmax: 1.06,
    roulement: 0.9,
    pointsCarton: 100,
  },
  {
    id: "camion",
    nom: "Camion vert",
    cartons: 10,
    resume: "Dix cartons. Le camion de Drew, tel quel.",
    detail: "Celui qu'il gare toujours de travers. Le réglage de référence.",
    puissance: 1,
    detente: 1,
    conso: 1,
    vmax: 1,
    roulement: 1,
    pointsCarton: 100,
  },
  {
    id: "semi",
    nom: "Remorque pleine",
    cartons: 16,
    resume: "Seize cartons. Les côtes vont se sentir.",
    detail: "Il a dit oui sans regarder le bon de livraison. Gros score, gros risque.",
    puissance: 0.86,
    detente: 0.9,
    conso: 1.18,
    vmax: 0.95,
    roulement: 1.15,
    pointsCarton: 100,
  },
];

/* --- Le catalogue d'obstacles --------------------------------------------
   `franchir` : la hauteur, au-dessus de la route, à laquelle il faut être
   pour passer. Un nid-de-poule se saute d'un rien, une barrière demande un
   vrai saut. `freinage` : la part de vitesse perdue si on le prend de plein
   fouet. `degats` : les cartons qui tombent. */
const DD_OBSTACLES = {
  nid: {
    nom: "nid-de-poule",
    largeur: 74,
    franchir: 16,
    degats: 1,
    freinage: 0.3,
  },
  plot: {
    nom: "plot de chantier",
    largeur: 28,
    franchir: 30,
    degats: 1,
    freinage: 0.45,
  },
  barriere: {
    nom: "barrière de chantier",
    largeur: 26,
    franchir: 44,
    degats: 2,
    freinage: 0.7,
  },
};

/* --- Ce qui se ramasse ----------------------------------------------------
   `haut` : hauteur au-dessus de la route. Un colis posé en l'air ne se prend
   qu'en sautant — c'est la seule récompense d'un saut gratuit. */
const DD_BONUS = {
  bidon: { nom: "jerrican", rayon: 26, carburant: 30, points: 0 },
  colis: { nom: "colis égaré", rayon: 24, carburant: 0, points: 250 },
};

/* --- Les parcours ---------------------------------------------------------
   `relief` : la polyligne de la route (lissée entre les points).
   `obstacles` / `bonus` : posés à une abscisse, jamais dans le moteur.
   `decor` : le fond en parallaxe, semé par le rendu à partir d'une graine —
   on décrit une ambiance, pas quarante arbres à la main.
   Ajouter un parcours ici l'ajoute au jeu, sans une ligne de moteur. */
const DD_PARCOURS = [
  /* ======================= 1. LIVRAISON TRANQUILLE ======================= */
  {
    id: "campus",
    nom: "La côte du campus",
    difficulte: "Facile",
    ambiance: "Plein soleil, bitume neuf, et personne pour compter les cartons.",
    ciel: ["#8ed6ff", "#cdefff", "#eaf8e2"],
    collines: "#a8d68f",
    bitume: "#5b5f6b",
    terre: "#8a5a2b",
    herbe: "#5aa02c",
    decor: { motifs: ["immeuble", "arbre", "arbre"], espacement: 330, graine: 11 },
    longueur: 9200,
    arrivee: 9000,
    relief: [
      { x: -800, y: 300 },
      { x: 0, y: 300 },
      { x: 900, y: 300 },
      { x: 1450, y: 258 },
      { x: 2000, y: 300 },
      { x: 2700, y: 300 },
      { x: 3200, y: 262 },
      { x: 3700, y: 300 },
      { x: 4400, y: 328 },
      { x: 5100, y: 300 },
      { x: 5700, y: 300 },
      { x: 6250, y: 256 },
      { x: 6800, y: 300 },
      { x: 7500, y: 300 },
      { x: 8000, y: 268 },
      { x: 8500, y: 300 },
      { x: 9000, y: 300 },
      { x: 10000, y: 300 },
    ],
    obstacles: [
      { type: "plot", x: 1000 },
      { type: "nid", x: 2000 },
      { type: "plot", x: 2700 },
      { type: "nid", x: 3700 },
      { type: "plot", x: 5100 },
      { type: "nid", x: 5700 },
      { type: "plot", x: 6800 },
      { type: "barriere", x: 8500 },
    ],
    bonus: [
      { type: "colis", x: 1450, haut: 58 },
      { type: "bidon", x: 3200, haut: 0 },
      { type: "colis", x: 4400, haut: 0 },
      { type: "bidon", x: 6250, haut: 0 },
      { type: "colis", x: 8000, haut: 56 },
    ],
  },

  /* ======================= 2. LE CENTRE DE DERRY ======================= */
  {
    id: "derry",
    nom: "Le centre de Derry",
    difficulte: "Moyen",
    ambiance: "Chaussée défoncée, ciel bas, un ballon rouge qui suit le camion.",
    ciel: ["#2b3a55", "#4a5f7e", "#8b93a4"],
    collines: "#3d4a5e",
    bitume: "#3f414c",
    terre: "#2f3746",
    herbe: "#4a5568",
    decor: { motifs: ["immeuble", "immeuble", "pylone"], espacement: 300, graine: 29 },
    longueur: 12400,
    arrivee: 12200,
    relief: [
      { x: -800, y: 300 },
      { x: 0, y: 300 },
      { x: 700, y: 300 },
      { x: 1150, y: 244 },
      { x: 1600, y: 300 },
      { x: 2200, y: 344 },
      { x: 2800, y: 300 },
      { x: 3300, y: 246 },
      { x: 3800, y: 300 },
      { x: 4300, y: 252 },
      { x: 4800, y: 300 },
      { x: 5400, y: 300 },
      { x: 5850, y: 246 },
      { x: 6300, y: 300 },
      { x: 6900, y: 346 },
      { x: 7500, y: 300 },
      { x: 7950, y: 244 },
      { x: 8400, y: 300 },
      { x: 9000, y: 300 },
      { x: 9450, y: 246 },
      { x: 9900, y: 300 },
      { x: 10500, y: 344 },
      { x: 11100, y: 300 },
      { x: 11700, y: 300 },
      { x: 13200, y: 300 },
    ],
    obstacles: [
      { type: "nid", x: 800 },
      { type: "plot", x: 1600 },
      { type: "barriere", x: 2200 },
      { type: "nid", x: 2800 },
      { type: "plot", x: 3800 },
      { type: "nid", x: 4800 },
      { type: "plot", x: 5400 },
      { type: "barriere", x: 6300 },
      { type: "nid", x: 7500 },
      { type: "plot", x: 8400 },
      { type: "nid", x: 9000 },
      { type: "barriere", x: 9900 },
      { type: "plot", x: 11100 },
      { type: "nid", x: 11700 },
    ],
    bonus: [
      { type: "bidon", x: 1150, haut: 0 },
      { type: "colis", x: 3300, haut: 60 },
      { type: "colis", x: 4300, haut: 0 },
      { type: "bidon", x: 5850, haut: 0 },
      { type: "colis", x: 6900, haut: 58 },
      { type: "colis", x: 7950, haut: 60 },
      { type: "bidon", x: 9450, haut: 0 },
      { type: "colis", x: 10500, haut: 56 },
    ],
  },

  /* ======================= 3. LA FORÊT D'AUGUSTA ======================= */
  {
    id: "foret",
    nom: "La forêt d'Augusta, de nuit",
    difficulte: "Difficile",
    ambiance: "Piste forestière, pas un lampadaire, et des côtes qui ne pardonnent rien.",
    ciel: ["#0f1424", "#1d2a38", "#2c3f36"],
    collines: "#1b3226",
    bitume: "#4a3c2c",
    terre: "#1d2b22",
    herbe: "#2f5d34",
    decor: { motifs: ["sapin", "sapin", "arbre"], espacement: 250, graine: 47 },
    longueur: 15200,
    arrivee: 15000,
    relief: [
      { x: -800, y: 300 },
      { x: 0, y: 300 },
      { x: 600, y: 300 },
      { x: 1000, y: 222 },
      { x: 1400, y: 300 },
      { x: 1900, y: 356 },
      { x: 2400, y: 300 },
      { x: 2800, y: 218 },
      { x: 3200, y: 300 },
      { x: 3700, y: 360 },
      { x: 4200, y: 300 },
      { x: 4600, y: 214 },
      { x: 5000, y: 300 },
      { x: 5600, y: 300 },
      { x: 6000, y: 212 },
      { x: 6400, y: 300 },
      { x: 6900, y: 362 },
      { x: 7400, y: 300 },
      { x: 7800, y: 216 },
      { x: 8200, y: 300 },
      { x: 8800, y: 356 },
      { x: 9400, y: 300 },
      { x: 9800, y: 210 },
      { x: 10200, y: 300 },
      { x: 10800, y: 300 },
      { x: 11200, y: 214 },
      { x: 11600, y: 300 },
      { x: 12200, y: 358 },
      { x: 12800, y: 300 },
      { x: 13200, y: 220 },
      { x: 13600, y: 300 },
      { x: 14200, y: 300 },
      { x: 16000, y: 300 },
    ],
    obstacles: [
      { type: "nid", x: 600 },
      { type: "plot", x: 1400 },
      { type: "nid", x: 2400 },
      { type: "barriere", x: 3200 },
      { type: "plot", x: 3700 },
      { type: "nid", x: 4200 },
      { type: "plot", x: 5000 },
      { type: "nid", x: 5600 },
      { type: "barriere", x: 6400 },
      { type: "plot", x: 7400 },
      { type: "nid", x: 8200 },
      { type: "barriere", x: 9400 },
      { type: "nid", x: 10200 },
      { type: "plot", x: 10800 },
      { type: "nid", x: 11600 },
      { type: "barriere", x: 12800 },
      { type: "plot", x: 13600 },
      { type: "nid", x: 14200 },
    ],
    bonus: [
      { type: "colis", x: 1900, haut: 0 },
      { type: "colis", x: 2800, haut: 58 },
      { type: "bidon", x: 4600, haut: 0 },
      { type: "colis", x: 6900, haut: 0 },
      { type: "colis", x: 7800, haut: 56 },
      { type: "bidon", x: 9800, haut: 0 },
      { type: "colis", x: 12200, haut: 0 },
      { type: "bidon", x: 13200, haut: 0 },
    ],
  },
];

/* Le banc d'essai lit ce fichier avec require(). Le navigateur, lui, ne
   connaît pas `module` : la garde évite de le casser. */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { DD_REGLAGES, DD_CHARGES, DD_OBSTACLES, DD_BONUS, DD_PARCOURS };
}
