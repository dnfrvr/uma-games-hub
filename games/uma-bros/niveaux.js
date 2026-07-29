/* =========================================================
   UMA Bros — les données du jeu
   ---------------------------------------------------------
   Tout ce qui est CONTENU vit ici : les personnages jouables, le bestiaire,
   et les niveaux. `main.js` ne connaît aucun nom propre — ajouter un niveau
   ou un ennemi ne demande pas d'y toucher.

   Repère du monde : y augmente vers le bas, le sol d'un niveau a son dessus
   à `Y_SOL`, et tout ce qui descend sous `Y_CHUTE` est perdu.

   `outils/test-uma-bros.js` relit ce fichier et vérifie qu'un niveau reste
   franchissable par les quatre personnages. À lancer après toute retouche.
   ========================================================= */

const Y_SOL = 330; // dessus du sol
const Y_CHUTE = 460; // en dessous, on est tombé

/* --- Le réglage de la physique ------------------------------------------
   C'est du réglage de difficulté, pas de la plomberie : il vit avec les
   niveaux pour qu'on puisse le relire à côté d'eux, et pour que le banc
   d'essai vérifie qu'un trou reste franchissable avec ces valeurs-là.
   Tout est en pixels par seconde. */
const PHYSIQUE = {
  gravite: 2100,
  vitesse: 250,
  saut: 690,
  chuteMax: 1250,
  joueurL: 34,
  joueurH: 52,
  /* Délai de grâce après avoir quitté une plateforme, et mémoire d'un saut
     demandé juste avant de toucher le sol : sans eux le jeu paraît injuste. */
  coyote: 0.09,
  memoireSaut: 0.11,
  vies: 3,
};

/* --- Les quatre personnages jouables -------------------------------------
   Mêmes réglages que dans les autres jeux du portail : c'est la même fabrique
   (shared/perso.js), donc le même casting d'un jeu à l'autre. */
const PERSOS = [
  {
    id: "drew",
    nom: "Drew",
    couleur: "#aa6caa",
    talent: "Foulée longue",
    detail: "Il court un peu plus vite. Il a l'habitude de fuir ses choix.",
    saut: 1,
    vitesse: 1.08,
    look: {
      peau: "#f8dcc0", cheveux: "long", couleurCheveux: "#8a5a2b",
      haut: "#aa6caa", bas: "#3a2b4e", bouche: "sourire", regard: "face",
    },
  },
  {
    id: "glinda",
    nom: "Glinda",
    couleur: "#e91e8c",
    talent: "Détente",
    detail: "Trois ans de pyramides humaines, ça se voit au saut.",
    saut: 1.12,
    vitesse: 1,
    look: {
      peau: "#f8dcc0", cheveux: "queue", couleurCheveux: "#e8b84b",
      haut: "#16255c", bas: "#16255c", jupe: "#ffffff", pompons: "#ffffff",
      accessoire: "noeud", couleurAccessoire: "#16255c", bouche: "sourire-large",
    },
  },
  {
    id: "elias",
    nom: "Elias",
    couleur: "#6672d0",
    talent: "Vigilance",
    detail: "Il court moins vite mais il voyait venir le coup depuis mardi.",
    saut: 1.06,
    vitesse: 0.96,
    look: {
      peau: "#f0c39a", cheveux: "court", couleurCheveux: "#2b1a2e",
      haut: "#6672d0", bas: "#2f3550", accessoire: "lunettes",
      bouche: "neutre", regard: "face",
    },
  },
  {
    id: "eoghan",
    nom: "Eoghan",
    couleur: "#00d435",
    talent: "Sprint",
    detail: "Il court le plus vite. Il a beaucoup d'entraînement.",
    saut: 0.98,
    vitesse: 1.16,
    look: {
      peau: "#f0c39a", cheveux: "boucle", couleurCheveux: "#c98a3a",
      haut: "#00b32d", bas: "#2f3550", bouche: "sourire-large", regard: "face",
    },
  },
];

/* --- Le bestiaire ---------------------------------------------------------
   Trois comportements seulement, combinés avec sept apparences :
     (rien)            patrouille au sol, s'écrase si on lui retombe dessus ;
     `vol`             flotte et ondule, indifférent au sol ;
     `saute`           patrouille en sautant sur place ;
     `ecrasable:false` on ne peut PAS l'écraser — le toucher coûte une vie.
   Les deux gros morceaux (Pennywise, l'ange) sont les seuls inécrasables :
   c'est ce qui les rend effrayants plutôt que gênants.

   Les silhouettes humaines sortent de shared/perso.js, comme partout ailleurs
   dans le portail. Le reste est dessiné ici, même trait épais, mêmes aplats. */
const ENNEMIS = {
  cafard: {
    nom: "Cafard du campus",
    largeur: 34, hauteur: 22, vitesse: 62, points: 100,
    svg:
      '<svg viewBox="0 0 34 22" width="34" height="22" aria-hidden="true">' +
      '<g stroke="#2b1a2e" stroke-width="2.4" stroke-linecap="round">' +
      '<path d="M9 18l-4 4M17 19v3M25 18l4 4M9 12L4 9M25 12l5-3"/></g>' +
      '<ellipse cx="17" cy="12" rx="13" ry="8" fill="#7a4a1e" stroke="#2b1a2e" stroke-width="2.6"/>' +
      '<path d="M17 4v16" stroke="#2b1a2e" stroke-width="2"/>' +
      '<circle cx="6" cy="9" r="4.5" fill="#5a3414" stroke="#2b1a2e" stroke-width="2.4"/>' +
      '<path d="M3 5L0 1M8 5l2-4" stroke="#2b1a2e" stroke-width="2" stroke-linecap="round"/>' +
      '<circle cx="5" cy="8" r="1.2" fill="#ffd84d"/></svg>',
  },

  oiseau: {
    nom: "Oiseau mal intentionné",
    largeur: 40, hauteur: 28, vitesse: 96, points: 150,
    vol: true, amplitude: 34, pulsation: 2.1,
    svg:
      '<svg viewBox="0 0 40 28" width="40" height="28" aria-hidden="true">' +
      '<path d="M6 12C2 4 12 2 18 6" fill="#6d7f8f" stroke="#2b1a2e" stroke-width="2.6" stroke-linejoin="round"/>' +
      '<path d="M34 12c4-8-6-10-12-6" fill="#6d7f8f" stroke="#2b1a2e" stroke-width="2.6" stroke-linejoin="round"/>' +
      '<ellipse cx="20" cy="16" rx="13" ry="9" fill="#93a6b6" stroke="#2b1a2e" stroke-width="2.8"/>' +
      '<circle cx="30" cy="13" r="6" fill="#93a6b6" stroke="#2b1a2e" stroke-width="2.6"/>' +
      '<path d="M36 13l6 2-6 2z" fill="#ffb400" stroke="#2b1a2e" stroke-width="2" stroke-linejoin="round"/>' +
      '<circle cx="31" cy="11" r="1.4" fill="#2b1a2e"/></svg>',
  },

  lutin: {
    nom: "Lutin de la fac",
    largeur: 30, hauteur: 36, vitesse: 86, points: 150,
    saute: true, impulsion: 430,
    svg:
      '<svg viewBox="0 0 30 36" width="30" height="36" aria-hidden="true">' +
      '<path d="M15 1l9 12H6z" fill="#2f9e44" stroke="#2b1a2e" stroke-width="2.6" stroke-linejoin="round"/>' +
      '<circle cx="15" cy="19" r="9" fill="#d9f0b8" stroke="#2b1a2e" stroke-width="2.6"/>' +
      '<path d="M6 18l-4-3 4-2zM24 18l4-3-4-2z" fill="#d9f0b8" stroke="#2b1a2e" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<circle cx="12" cy="18" r="1.4" fill="#2b1a2e"/><circle cx="18" cy="18" r="1.4" fill="#2b1a2e"/>' +
      '<path d="M11 23q4 3 8 0" fill="none" stroke="#2b1a2e" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M8 28h14v6H8z" fill="#2f9e44" stroke="#2b1a2e" stroke-width="2.6" stroke-linejoin="round"/></svg>',
  },

  nils: {
    nom: "Nils",
    largeur: 32, hauteur: 50, vitesse: 74, points: 200,
    perso: {
      peau: "#f3ddcb", cheveux: "frange", couleurCheveux: "#e8b84b",
      haut: "#22222a", bas: "#15151b", bouche: "neutre", regard: "gauche",
    },
  },

  elphie: {
    nom: "Elphie",
    largeur: 32, hauteur: 50, vitesse: 108, points: 200,
    perso: {
      peau: "#7a4a2b", cheveux: "long", couleurCheveux: "#1e1218",
      haut: "#2e7d5b", bas: "#1f2b3a", accessoire: "serretete",
      couleurAccessoire: "#e8b84b", bouche: "neutre", regard: "face",
    },
  },

  pennywise: {
    nom: "Pennywise",
    largeur: 42, hauteur: 54, vitesse: 46, points: 0,
    ecrasable: false,
    svg:
      '<svg viewBox="0 0 42 54" width="42" height="54" aria-hidden="true">' +
      '<path d="M21 46c-9 0-15-3-15-6 0-6 6-10 15-10s15 4 15 10c0 3-6 6-15 6z" fill="#f2eee6" stroke="#2b1a2e" stroke-width="2.8" stroke-linejoin="round"/>' +
      '<g fill="#c1121f" stroke="#2b1a2e" stroke-width="2.6" stroke-linejoin="round">' +
      '<path d="M8 20C2 18 2 8 8 6c0 5 3 8 6 9z"/><path d="M34 20c6-2 6-12 0-14 0 5-3 8-6 9z"/></g>' +
      '<ellipse cx="21" cy="20" rx="14" ry="16" fill="#f7f3ec" stroke="#2b1a2e" stroke-width="2.8"/>' +
      '<path d="M7 14q7-8 14-8t14 8" fill="#c1121f" stroke="#2b1a2e" stroke-width="2.6" stroke-linejoin="round"/>' +
      '<path d="M14 17l4 5M18 17l-4 5M24 17l4 5M28 17l-4 5" stroke="#c1121f" stroke-width="2.6" stroke-linecap="round"/>' +
      '<circle cx="21" cy="26" r="3.6" fill="#c1121f" stroke="#2b1a2e" stroke-width="2.2"/>' +
      '<path d="M12 31q9 8 18 0" fill="none" stroke="#c1121f" stroke-width="3" stroke-linecap="round"/></svg>',
  },

  ange: {
    nom: "Ange (exact)",
    largeur: 46, hauteur: 46, vitesse: 40, points: 0,
    ecrasable: false, vol: true, amplitude: 46, pulsation: 1.2,
    svg:
      '<svg viewBox="0 0 46 46" width="46" height="46" aria-hidden="true">' +
      '<g fill="none" stroke="#ffd84d" stroke-width="3">' +
      '<circle cx="23" cy="23" r="21"/><circle cx="23" cy="23" r="13.5"/><circle cx="23" cy="23" r="6.5"/></g>' +
      '<g fill="#fff8dc" stroke="#2b1a2e" stroke-width="2">' +
      '<ellipse cx="23" cy="4" rx="4.6" ry="3.2"/><ellipse cx="23" cy="42" rx="4.6" ry="3.2"/>' +
      '<ellipse cx="4" cy="23" rx="3.2" ry="4.6"/><ellipse cx="42" cy="23" rx="3.2" ry="4.6"/>' +
      '<ellipse cx="23" cy="16.5" rx="4.4" ry="3"/><ellipse cx="23" cy="29.5" rx="4.4" ry="3"/>' +
      '<ellipse cx="16" cy="23" rx="3" ry="4.4"/><ellipse cx="30" cy="23" rx="3" ry="4.4"/></g>' +
      '<g fill="#2b1a2e">' +
      '<circle cx="23" cy="4" r="1.5"/><circle cx="23" cy="42" r="1.5"/>' +
      '<circle cx="4" cy="23" r="1.5"/><circle cx="42" cy="23" r="1.5"/>' +
      '<circle cx="23" cy="16.5" r="1.4"/><circle cx="23" cy="29.5" r="1.4"/>' +
      '<circle cx="16" cy="23" r="1.4"/><circle cx="30" cy="23" r="1.4"/>' +
      '<circle cx="23" cy="23" r="2.6"/></g></svg>',
  },
};

/* --- Les niveaux ----------------------------------------------------------
   `sols` : les tronçons de plancher, les trous sont ce qui les sépare.
   `blocs` : les plateformes en l'air.
   `ennemis` : `de`/`a` bornent la patrouille, `y` cale l'ennemi sur un bloc
               (ou son altitude de vol pour ceux qui volent).
   Ajouter un niveau ici l'ajoute au jeu, sans une ligne de moteur. */
const NIVEAUX = [
  /* ======================= 1. FACILE ======================= */
  {
    id: "universite",
    nom: "L'université d'Augusta",
    difficulte: "Facile",
    ambiance: "Plein jour, pelouse tondue, personne ne se doute de rien.",
    ciel: "linear-gradient(180deg, #8ed6ff 0%, #cdefff 62%, #eaf8e2 100%)",
    herbe: "#5aa02c",
    terre: "#8a5a2b",
    longueur: 3700,
    fond: [
      { type: "batiment", x: 180, l: 220, h: 190 },
      { type: "arbre", x: 460, h: 130 },
      { type: "batiment", x: 700, l: 260, h: 230 },
      { type: "arbre", x: 1060, h: 110 },
      { type: "arbre", x: 1200, h: 150 },
      { type: "batiment", x: 1450, l: 200, h: 170 },
      { type: "arbre", x: 1780, h: 140 },
      { type: "batiment", x: 2050, l: 280, h: 210 },
      { type: "arbre", x: 2420, h: 120 },
      { type: "batiment", x: 2700, l: 230, h: 195 },
      { type: "arbre", x: 3040, h: 150 },
      { type: "batiment", x: 3260, l: 250, h: 225 },
    ],
    sols: [
      { x: 0, l: 720 },
      { x: 800, l: 620 },
      { x: 1520, l: 720 },
      { x: 2340, l: 680 },
      { x: 3100, l: 600 },
    ],
    blocs: [
      { x: 520, y: 250, l: 120 },
      { x: 900, y: 232, l: 110 },
      { x: 1070, y: 168, l: 96 },
      { x: 1300, y: 244, l: 110 },
      { x: 1600, y: 250, l: 140 },
      { x: 1830, y: 186, l: 104 },
      { x: 2040, y: 246, l: 120 },
      { x: 2420, y: 252, l: 120 },
      { x: 2590, y: 180, l: 120 },
      { x: 2860, y: 240, l: 110 },
      { x: 3160, y: 238, l: 130 },
      { x: 3380, y: 178, l: 110 },
    ],
    ennemis: [
      { type: "cafard", x: 400, de: 330, a: 660 },
      { type: "cafard", x: 1000, de: 830, a: 1380 },
      { type: "cafard", x: 1640, y: 250, de: 1600, a: 1720 },
      { type: "cafard", x: 1900, de: 1540, a: 2180 },
      { type: "oiseau", x: 2000, y: 196, de: 1560, a: 2220 },
      { type: "cafard", x: 2500, de: 2360, a: 2980 },
      { type: "cafard", x: 2700, de: 2360, a: 2980 },
      { type: "oiseau", x: 2800, y: 172, de: 2380, a: 3000 },
      { type: "cafard", x: 3300, de: 3120, a: 3600 },
    ],
    arrivee: 3610,
    chrono: 120,
  },

  /* ======================= 2. MOYEN ======================= */
  {
    id: "derry",
    nom: "Derry, un soir de pluie",
    difficulte: "Moyen",
    ambiance: "Rues mouillées, néons, quelqu'un rit dans une bouche d'égout.",
    ciel: "linear-gradient(180deg, #23324a 0%, #3a5170 55%, #6b7f96 100%)",
    herbe: "#4a5568",
    terre: "#2f3746",
    longueur: 4600,
    fond: [
      { type: "batiment", x: 120, l: 200, h: 250 },
      { type: "batiment", x: 380, l: 160, h: 190 },
      { type: "lampadaire", x: 620, h: 160 },
      { type: "batiment", x: 780, l: 240, h: 275 },
      { type: "batiment", x: 1080, l: 180, h: 205 },
      { type: "lampadaire", x: 1340, h: 160 },
      { type: "batiment", x: 1500, l: 260, h: 260 },
      { type: "batiment", x: 1820, l: 190, h: 200 },
      { type: "lampadaire", x: 2080, h: 160 },
      { type: "batiment", x: 2240, l: 230, h: 285 },
      { type: "batiment", x: 2540, l: 200, h: 215 },
      { type: "lampadaire", x: 2820, h: 160 },
      { type: "batiment", x: 2980, l: 250, h: 265 },
      { type: "batiment", x: 3300, l: 180, h: 195 },
      { type: "lampadaire", x: 3560, h: 160 },
      { type: "batiment", x: 3720, l: 240, h: 275 },
      { type: "batiment", x: 4040, l: 210, h: 230 },
      { type: "lampadaire", x: 4320, h: 160 },
    ],
    sols: [
      { x: 0, l: 560 },
      { x: 672, l: 488 },
      { x: 1272, l: 538 },
      { x: 1922, l: 478 },
      { x: 2512, l: 558 },
      { x: 3182, l: 498 },
      { x: 3792, l: 718 },
    ],
    blocs: [
      { x: 400, y: 244, l: 110 },
      { x: 600, y: 190, l: 90 },
      { x: 860, y: 246, l: 110 },
      { x: 1060, y: 182, l: 100 },
      { x: 1210, y: 236, l: 100 },
      { x: 1480, y: 246, l: 120 },
      { x: 1700, y: 180, l: 100 },
      { x: 1860, y: 240, l: 110 },
      { x: 2120, y: 244, l: 110 },
      { x: 2300, y: 178, l: 110 },
      { x: 2460, y: 238, l: 100 },
      { x: 2740, y: 246, l: 120 },
      { x: 2960, y: 184, l: 100 },
      { x: 3120, y: 240, l: 110 },
      { x: 3400, y: 246, l: 120 },
      { x: 3620, y: 182, l: 110 },
      { x: 3780, y: 238, l: 100 },
      { x: 4120, y: 244, l: 120 },
      { x: 4320, y: 180, l: 110 },
    ],
    ennemis: [
      { type: "cafard", x: 300, de: 200, a: 540 },
      { type: "lutin", x: 760, de: 700, a: 1140 },
      { type: "oiseau", x: 900, y: 190, de: 640, a: 1180 },
      { type: "cafard", x: 1400, de: 1310, a: 1780 },
      { type: "lutin", x: 1650, de: 1310, a: 1790 },
      { type: "pennywise", x: 2100, de: 1960, a: 2380 },
      { type: "oiseau", x: 2200, y: 168, de: 1960, a: 2400 },
      { type: "cafard", x: 2700, de: 2550, a: 3050 },
      { type: "lutin", x: 2900, de: 2550, a: 3060 },
      { type: "oiseau", x: 3300, y: 186, de: 3220, a: 3660 },
      { type: "pennywise", x: 3450, de: 3220, a: 3660 },
      { type: "cafard", x: 4000, de: 3830, a: 4490 },
      { type: "lutin", x: 4250, de: 3830, a: 4490 },
    ],
    arrivee: 4500,
    chrono: 150,
  },

  /* ======================= 3. DIFFICILE ======================= */
  {
    id: "foret",
    nom: "La forêt d'Augusta",
    difficulte: "Difficile",
    ambiance: "Nuit noire, rien ne bouge, et pourtant tout te regarde.",
    ciel: "linear-gradient(180deg, #10121f 0%, #1d2438 52%, #2f3f38 100%)",
    herbe: "#2f5d34",
    terre: "#1d2b22",
    longueur: 5200,
    fond: [
      { type: "sapin", x: 100, h: 230 },
      { type: "sapin", x: 280, h: 190 },
      { type: "sapin", x: 460, h: 250 },
      { type: "sapin", x: 700, h: 205 },
      { type: "sapin", x: 900, h: 245 },
      { type: "sapin", x: 1150, h: 195 },
      { type: "sapin", x: 1360, h: 260 },
      { type: "sapin", x: 1600, h: 210 },
      { type: "sapin", x: 1840, h: 250 },
      { type: "sapin", x: 2080, h: 190 },
      { type: "sapin", x: 2300, h: 255 },
      { type: "sapin", x: 2560, h: 215 },
      { type: "sapin", x: 2800, h: 245 },
      { type: "sapin", x: 3060, h: 200 },
      { type: "sapin", x: 3300, h: 260 },
      { type: "sapin", x: 3560, h: 210 },
      { type: "sapin", x: 3820, h: 250 },
      { type: "sapin", x: 4080, h: 195 },
      { type: "sapin", x: 4340, h: 255 },
      { type: "sapin", x: 4600, h: 215 },
      { type: "sapin", x: 4860, h: 245 },
    ],
    sols: [
      { x: 0, l: 480 },
      { x: 600, l: 420 },
      { x: 1140, l: 400 },
      { x: 1660, l: 440 },
      { x: 2220, l: 400 },
      { x: 2740, l: 460 },
      { x: 3320, l: 420 },
      { x: 3860, l: 440 },
      { x: 4420, l: 720 },
    ],
    blocs: [
      { x: 340, y: 246, l: 100 },
      { x: 520, y: 186, l: 90 },
      { x: 780, y: 240, l: 100 },
      { x: 960, y: 178, l: 90 },
      { x: 1080, y: 238, l: 90 },
      { x: 1300, y: 244, l: 100 },
      { x: 1480, y: 182, l: 90 },
      { x: 1600, y: 240, l: 90 },
      { x: 1840, y: 246, l: 100 },
      { x: 2020, y: 180, l: 90 },
      { x: 2160, y: 238, l: 90 },
      { x: 2380, y: 244, l: 100 },
      { x: 2560, y: 184, l: 90 },
      { x: 2680, y: 240, l: 90 },
      { x: 2920, y: 246, l: 100 },
      { x: 3100, y: 178, l: 90 },
      { x: 3260, y: 238, l: 90 },
      { x: 3480, y: 244, l: 100 },
      { x: 3660, y: 182, l: 90 },
      { x: 3800, y: 240, l: 90 },
      { x: 4020, y: 246, l: 100 },
      { x: 4200, y: 180, l: 90 },
      { x: 4340, y: 238, l: 90 },
      { x: 4620, y: 244, l: 110 },
      { x: 4820, y: 182, l: 100 },
    ],
    ennemis: [
      { type: "lutin", x: 260, de: 120, a: 460 },
      { type: "oiseau", x: 400, y: 190, de: 140, a: 470 },
      { type: "nils", x: 800, de: 640, a: 1000 },
      { type: "lutin", x: 900, de: 640, a: 1010 },
      { type: "elphie", x: 1300, de: 1180, a: 1520 },
      { type: "ange", x: 1400, y: 160, de: 1180, a: 1530 },
      { type: "lutin", x: 1800, de: 1700, a: 2080 },
      { type: "nils", x: 1950, de: 1700, a: 2090 },
      { type: "oiseau", x: 2400, y: 176, de: 2260, a: 2600 },
      { type: "elphie", x: 2450, de: 2260, a: 2600 },
      { type: "ange", x: 2900, y: 150, de: 2780, a: 3180 },
      { type: "lutin", x: 3000, de: 2780, a: 3190 },
      { type: "nils", x: 3500, de: 3360, a: 3720 },
      { type: "oiseau", x: 3600, y: 186, de: 3360, a: 3730 },
      { type: "elphie", x: 4000, de: 3900, a: 4280 },
      { type: "ange", x: 4100, y: 158, de: 3900, a: 4290 },
      { type: "lutin", x: 4700, de: 4460, a: 5120 },
      { type: "nils", x: 4900, de: 4460, a: 5120 },
      { type: "elphie", x: 5000, de: 4460, a: 5120 },
    ],
    arrivee: 5110,
    chrono: 190,
  },
];
