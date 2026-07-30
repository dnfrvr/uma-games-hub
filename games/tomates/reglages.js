/* =========================================================
   Balance ta tomate — les données du jeu
   ---------------------------------------------------------
   Tout ce qui est CONTENU et RÉGLAGE vit ici : les dimensions de la baraque,
   la physique du lancer, les cinq manches, l'allure de Mads Prout et ses
   répliques. `main.js` ne connaît aucun nom propre et aucun chiffre
   d'équilibrage : ajouter une manche ou déplacer un tonneau ne demande pas
   d'y toucher.

   Pourquoi séparer : la difficulté d'un jeu de trajectoire ne se juge pas à
   l'œil. `test-tomates.js` relit ce fichier et recalcule, manche par manche,
   la part des instants où un coup est possible et la largeur du réglage qui
   marche. C'est ce qui rend l'équilibrage discutable avec des chiffres
   plutôt qu'avec des impressions.

   Repère du monde : un rectangle de 160 × 90 unités, y vers le BAS.
   L'unité n'est pas le pixel — la scène est un SVG à viewBox fixe, donc
   tout se met à l'échelle tout seul quel que soit l'écran.
   ========================================================= */

/* --- La baraque de foire ------------------------------------------------- */
const MONDE = {
  largeur: 160,
  hauteur: 90,
  sol: 78, // l'herbe piétinée devant l'estrade
  /* L'estrade : Mads se pavane dessus, et sa face avant arrête les tirs
     trop tendus. */
  podium: { x: 84, largeur: 76, dessus: 68 },
  /* D'où part la tomate : la main levée du lanceur, cageot à ses pieds. Il
     est sur l'herbe et Mads sur son estrade — on lance donc vers le haut,
     ce qui coûte quelques unités de portée et rend les tirs tendus
     inutiles : ils finissent dans la face avant de l'estrade. */
  lanceur: { x: 16, y: 71 },
};

/* --- La physique du lancer ----------------------------------------------
   Le geste du jeu tient dans deux nombres : un ANGLE et une PUISSANCE. Le
   vent est une accélération horizontale, pas un simple décalage : il courbe
   la trajectoire, donc il se corrige à l'angle autant qu'à la puissance.

   Portée maximale (à plat, 45°, sans vent) : vMax² / gravité = 165 unités,
   pour une cible au plus loin à 136 unités du lanceur. La marge n'est pas du
   gaspillage : elle sert aux cloches très hautes, celles qui passent
   par-dessus les tonneaux. */
const TIR = {
  gravite: 110, // unités/s²
  vMin: 60, // puissance 0 %
  vMax: 135, // puissance 100 %
  angleMin: 10,
  angleMax: 80,
  angleDepart: 42,
  puissanceDepart: 58,
  /* Ce que déplace une pression de touche : c'est la finesse réelle dont
     dispose le joueur, et c'est ce pas-là que le banc d'essai emploie. */
  pasAngle: 1,
  pasPuissance: 2,
  /* Maintenir remplit la jauge de 0 à 100 % en ce temps-là, puis elle
     s'arrête en haut : on ne perd pas son tir pour avoir tenu trop
     longtemps, mais tirer à fond envoie la tomate derrière le chapiteau. */
  chargeMs: 1150,
  rayon: 2.4, // rayon de la tomate, en unités de monde
  volMax: 6, // au-delà, la tomate est perdue dans le décor
  pas: 1 / 120, // pas d'intégration
};

/* --- Mads Prout ---------------------------------------------------------
   Sorti de la fabrique commune (shared/perso.js), comme tout le casting du
   portail. L'ennemi de la bande se reconnaît à trois choses et pas une de
   plus : la crête peroxydée, les lunettes teintées et le rictus. Il ne
   regarde jamais en face — toujours vers le lanceur, de haut. */
const MADS = {
  nom: "Mads Prout",
  largeur: 11,
  debout: 16,
  accroupi: 10,
  tete: 6, // la zone du haut : c'est la « pleine poire »
  look: {
    id: "mads",
    peau: "#f3ddcb",
    cheveux: "crete",
    couleurCheveux: "#e8b84b",
    haut: "#3a2f5e",
    bas: "#1e1a2a",
    accessoire: "lunettes",
    bouche: "sourire-large",
    regard: "gauche",
  },
};

/* Le lanceur, c'est toi. Pas de nom, pas de couleur de perso : on ne
   raconte rien, on lance des tomates. */
const LANCEUR = {
  look: {
    id: "lanceur",
    peau: "#f0c39a",
    cheveux: "boucle",
    couleurCheveux: "#4a2c17",
    haut: "#c92a2a",
    bas: "#2f3550",
    bouche: "sourire",
    regard: "droite",
    /* Bras levés : c'est de cette main-là que part la tomate, et le repère
       `MONDE.lanceur` est calé dessus. */
    pose: "bras-leves",
  },
};

/* --- Le mobilier de l'estrade -------------------------------------------
   Un abri arrête la tomate qui arrive trop tendue. C'est LE contre-jeu de
   l'angle : au ras du sol on remplit le tonneau, en cloche on repasse
   par-dessus. `hauteur` est comptée depuis le dessus de l'estrade. */
const ABRIS = {
  tonneau: { largeur: 12, hauteur: 12, couleur: "#a9622c", cercles: true },
  caisse: { largeur: 13, hauteur: 9, couleur: "#c08a4a", cercles: false },
  pancarte: { largeur: 4, hauteur: 20, couleur: "#8a5a2b", cercles: false },
};

/* --- Les cinq manches ----------------------------------------------------
   Le cycle de Mads est une fonction du temps, pas un tirage au sort : c'est
   ce qui permet au banc d'essai de l'échantillonner comme le fait
   `mesure-difficulte-eoghan.js` pour les cônes de vision. Un cycle :

     nargue → parade (va-et-vient triangulaire) → course au refuge →
     planque accroupie → retour au centre → nargue…

   `vitesse` n'est pas écrite : elle vaut 4 × amplitude / periode et le banc
   d'essai la recalcule. Les leviers de difficulté sont donc :
     - la vitesse de la cible (il faut anticiper le temps de vol) ;
     - le nombre et la hauteur des abris ;
     - la part du cycle passée à l'abri, où il est intouchable ;
     - la force du vent ;
     - la longueur de l'aperçu de trajectoire ;
     - les munitions comptées face à l'objectif. */
const MANCHES = [
  {
    id: "tréteau",
    nom: "Le petit tréteau",
    boniment:
      "Il monte sur scène, il salue et il ne bouge plus. " +
      "Prends tes repères.",
    centre: 118,
    amplitude: 0,
    periode: 6,
    tNargue: 1.6,
    tParade: 6,
    refuge: null,
    tGo: 0,
    tPlanque: 0,
    abris: [],
    vent: 0,
    apercu: 0.6,
    munitions: 8,
    objectif: 3,
  },
  {
    id: "gigote",
    nom: "Il commence à gigoter",
    boniment:
      "Un tonneau, et il se met à faire les cent pas. " +
      "Vise où il SERA, pas où il est.",
    centre: 118,
    amplitude: 10,
    periode: 5.7,
    tNargue: 1.5,
    tParade: 6.5,
    refuge: null,
    tGo: 0,
    tPlanque: 0,
    abris: [{ type: "tonneau", x: 104 }],
    vent: 6,
    apercu: 0.5,
    munitions: 9,
    objectif: 4,
  },
  {
    id: "futs",
    nom: "Derrière les fûts",
    boniment:
      "Il a repéré le tonneau et il compte s'en servir. " +
      "Le vent se lève.",
    centre: 120,
    amplitude: 14,
    periode: 5.1,
    tNargue: 1.3,
    tParade: 6,
    refuge: 0,
    tGo: 0.9,
    tPlanque: 2,
    abris: [
      { type: "tonneau", x: 102 },
      { type: "caisse", x: 130 },
    ],
    vent: 11,
    apercu: 0.42,
    munitions: 10,
    objectif: 5,
  },
  {
    id: "esquive",
    nom: "La grande esquive",
    boniment:
      "Trois planques, un vent de travers, et un aperçu de trajectoire " +
      "très court.",
    centre: 120,
    amplitude: 18,
    periode: 4.8,
    tNargue: 1.1,
    tParade: 5.5,
    refuge: 0,
    tGo: 0.8,
    tPlanque: 2.6,
    abris: [
      { type: "tonneau", x: 100 },
      { type: "caisse", x: 126 },
      { type: "pancarte", x: 142 },
    ],
    vent: 16,
    apercu: 0.33,
    munitions: 11,
    objectif: 6,
  },
  {
    id: "final",
    nom: "Le clou du spectacle",
    boniment:
      "Dernière manche. Il court, il se planque, et il ne fanfaronne " +
      "qu'une seconde.",
    centre: 120,
    amplitude: 22,
    periode: 4.6,
    tNargue: 0.9,
    tParade: 5,
    refuge: 0,
    tGo: 0.7,
    /* 3,2 s au départ : le banc d'essai a montré 1,8 s d'affilée sans aucun
       tir possible, soit le doigt en l'air à regarder un tonneau. */
    tPlanque: 2.8,
    abris: [
      { type: "tonneau", x: 98 },
      { type: "caisse", x: 118 },
      { type: "pancarte", x: 140 },
    ],
    vent: 21,
    apercu: 0.25,
    munitions: 13,
    objectif: 7,
  },
];

/* --- Le barème ----------------------------------------------------------
   La série de bons coups suit la même idée que chez Elias : elle récompense
   la régularité, et la moindre tomate perdue la remet à zéro. */
const BAREME = {
  corps: 100,
  tete: 250,
  abri: 20, // lot de consolation : le tonneau a quand même pris cher
  munitionRestante: 50, // bonus de fin de manche
  /* [série minimale, multiplicateur] — la première ligne est le cas normal. */
  series: [
    [0, 1],
    [2, 2],
    [4, 3],
    [6, 4],
    [8, 5],
  ],
};

/* --- Les répliques ------------------------------------------------------
   Mads parle à la première personne, comme Elias dans Sanity Whack. Le ton
   est celui d'un cabotin vexé, jamais celui d'un règlement de comptes : on
   est à la fête foraine, pas au tribunal.

   Plusieurs variantes par situation : une manche dure une douzaine de tirs,
   et sans variantes il se met à radoter au bout de trois. */
const REPLIQUES = {
  nargue: [
    "Vous visez comme vous chantez.",
    "Je suis là, immobile, depuis tout à l'heure.",
    "Mon costume est neuf, faites attention.",
    "On m'a promis un public, pas des amateurs.",
    "Allez-y, je vous attends.",
    "Personne ne m'a jamais touché.",
  ],
  planque: [
    "Ce tonneau et moi, c'est une longue histoire.",
    "J'appelle ça de la mise en scène.",
    "Je me repoudre, deux secondes.",
    "C'est de la tactique.",
  ],
  touche: [
    "MON COSTUME !",
    "C'était du bio, au moins ?",
    "Non mais ça va pas la tête ?!",
    "J'ai des avocats, moi, monsieur.",
    "Je sens la ratatouille.",
    "Une seule. Ça ne compte pas.",
  ],
  tete: [
    "EN PLEINE POIRE !",
    "Mes lunettes ! MES LUNETTES !",
    "J'ai vu ma vie défiler, et elle était rouge.",
    "Là, c'était bien joué.",
  ],
  abri: [
    "Le tonneau vous remercie.",
    "Vous avez tué un fût.",
    "Il faudra viser plus haut.",
    "La caisse n'avait rien demandé.",
  ],
  rate: [
    "L'herbe n'avait rien demandé.",
    "Trop court.",
    "Vous l'avez envoyée au Canada, celle-là.",
    "J'ai à peine eu à bouger.",
    "Le vent, sûrement.",
  ],
  mancheGagnee: [
    "C'est un coup de chance. Un long coup de chance.",
    "La suivante sera plus difficile.",
    "Je vous laisse gagner.",
  ],
  mancheRatee: [
    "Le cageot est vide et moi je suis impeccable.",
    "Rentrez chez vous et entraînez-vous.",
    "Merci d'être venus.",
  ],
  victoire: [
    "Je démissionne. Je pars. J'ouvre une jardinerie.",
    "Très bien. VOUS AVEZ GAGNÉ.",
    "Je vous en veux, mais avec beaucoup d'élégance.",
  ],
};
