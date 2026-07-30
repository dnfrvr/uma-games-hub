/* =========================================================
   Run, Glinda, Run — les données du jeu
   ---------------------------------------------------------
   Tout ce qui est CONTENU vit ici : le réglage de difficulté, le casting,
   le mobilier du campus qu'on saute ou sous lequel on glisse, les couches
   du décor et ce que Boq crie derrière. `generateur.js` et `main.js` ne
   connaissent aucun nom propre — ajouter un obstacle ne demande pas d'y
   toucher une ligne.

   Repère du monde : y augmente vers le bas, le sol est à `ySol`, et
   l'abscisse `x` d'un obstacle est sa position DANS LE MONDE (elle ne
   redescend jamais : c'est une course sans fin, le monde se déroule).

   `test-course.js` relit ce fichier et prouve, physique en main, qu'aucune
   configuration engendrée n'est infranchissable. À lancer après toute
   retouche de ces chiffres.
   ========================================================= */

/* --- Le réglage de la physique et de la difficulté ------------------------
   C'est du réglage de jeu, pas de la plomberie : ça vit à côté des obstacles
   pour qu'on puisse relire les deux ensemble. Tout est en pixels et en
   secondes. Les deux valeurs qui font tout le jeu sont `vMin`/`vMax` (la
   vitesse monte) et `echelle` (en combien de mètres elle monte). */
const PHYSIQUE = {
  /* Le saut. hauteur = saut² / 2·gravité = 155 px, temps en l'air = 0,69 s. */
  gravite: 2600,
  saut: 900,
  sautCourt: 420, // vitesse à laquelle on plafonne si on relâche tôt
  chuteMax: 1700,
  plongeon: 1600, // supplément de gravité quand on pousse vers le bas en l'air

  joueurL: 30,
  joueurH: 52,
  joueurHGlisse: 26,

  /* Délai de grâce après avoir quitté le sol, et mémoire d'une commande
     donnée juste avant de retomber : sans eux la course paraît injuste. */
  coyote: 0.09,
  memoireSaut: 0.12,
  memoireGlisse: 0.15,
  glisseMin: 0.3, // une tape suffit à passer une banderole
  glisseMax: 1.1, // mais on ne rampe pas indéfiniment

  /* La montée en régime. La vitesse suit 1 − e^(−m/echelle) : elle grimpe
     vite au début, puis se resserre vers vMax sans jamais l'atteindre. */
  vMin: 300,
  vMax: 760,
  echelle: 620, // en mètres
  pxParMetre: 14,

  /* La marge d'erreur, elle, se referme : c'est le deuxième levier de
     difficulté. Temps de réaction offert entre deux obstacles. */
  reactionDepart: 0.62,
  reactionFinale: 0.2,
  /* Sécurité ajoutée à l'écart minimal entre deux obstacles, en plus de la
     longueur d'un saut complet. Elle absorbe le fait que la vitesse continue
     de monter PENDANT le saut. */
  margeEcart: 40,
  /* Les premiers mètres sont vides : on ne meurt pas avant d'avoir compris. */
  departLibre: 900,

  /* La scène */
  ySol: 330,
  hauteurScene: 420,
  xJoueur: 190, // Glinda reste à cette abscisse à l'écran, c'est le monde qui file

  /* Boq. `ecart` est la distance qui le sépare de Glinda, en pixels. */
  ecartDepart: 250,
  ecartMax: 330,
  ecartChoc: 55, // ce qu'une bourde lui offre, tout de suite
  chocDuree: 0.42, // et le temps où Glinda titube (donc où il gagne encore)
  chocVitesse: 0.55,
  recuperation: 30, // ce qu'on lui reprend chaque seconde, en courant propre
  /* Sa pression monte avec la course : à pleine vitesse, courir sans faute
     ne suffit plus tout à fait. C'est ce qui garantit qu'une partie finit. */
  pressionDepart: 8,
  pressionFinale: 46,
  ecartVisuel: 0.62, // compression de l'écart à l'écran, pour qu'il tienne dedans

  /* Les pompons ramassés en l'air */
  pomponTaille: 26,
  pomponHauteur: 183, // hauteur du pompon au-dessus du sol (bord haut de sa boîte)
  pomponPoints: 25,
  pomponEcart: 14, // et Boq recule un peu : le risque paie
};

/* --- Le casting -----------------------------------------------------------
   Mêmes réglages que dans les autres jeux du portail : c'est la même
   fabrique (shared/perso.js), donc la même Glinda partout. Les poses ne
   changent que ce qui bouge. */
const GLINDA = {
  base: {
    id: "glinda",
    peau: "#f8dcc0",
    cheveux: "queue",
    couleurCheveux: "#e8b84b",
    haut: "#16255c",
    bas: "#16255c",
    jupe: "#ffffff",
    accessoire: "noeud",
    couleurAccessoire: "#16255c",
    bouche: "sourire-large",
  },
  poses: {
    course: { pose: "debout", regard: "droite" },
    saut: { pose: "bras-leves", bouche: "o", regard: "droite" },
    glisse: { pose: "accroupi", bouche: "neutre", regard: "droite" },
    choc: { pose: "pompons-haut", bouche: "o", regard: "ferme" },
  },
};

/* Boq court derrière, téléphone brandi. Il ne veut pas de mal — c'est bien
   le problème : il veut PARLER. */
const BOQ = {
  id: "boq",
  peau: "#f0c39a",
  cheveux: "frange",
  couleurCheveux: "#8a5a2b",
  haut: "#5c8ad6",
  bas: "#3a3f5c",
  bouche: "o",
  regard: "droite",
  pose: "bras-leves",
  telephone: true,
};

/* --- Le mobilier du campus ------------------------------------------------
   Deux genres seulement, et c'est tout le jeu :
     `sol`   posé par terre        → il faut SAUTER par-dessus ;
     `haut`  suspendu à `bas` px du sol → il faut GLISSER dessous.
   `des` est la progression (0 → 1) à partir de laquelle l'obstacle peut
   sortir, `poids` sa fréquence relative. Le générateur refuse de son côté
   tout obstacle trop large pour la vitesse du moment : ajouter une horreur
   de 300 px de large ne cassera donc rien, elle n'apparaîtra simplement
   qu'une fois qu'on va assez vite pour la franchir. */
const OBSTACLES = [
  {
    id: "sac",
    nom: "sac de sport",
    genre: "sol",
    largeur: 38,
    hauteur: 30,
    des: 0,
    poids: 3,
    svg:
      '<svg viewBox="0 0 38 30" width="38" height="30" aria-hidden="true">' +
      '<rect x="2" y="10" width="34" height="18" rx="7" fill="#e0446b" stroke="#2b1a2e" stroke-width="3"/>' +
      '<path d="M12 11c0-5 3-8 7-8s7 3 7 8" fill="none" stroke="#2b1a2e" stroke-width="3"/>' +
      '<path d="M3 19h32" stroke="#2b1a2e" stroke-width="2" opacity=".45"/></svg>',
  },
  {
    id: "poubelle",
    nom: "poubelle du campus",
    genre: "sol",
    largeur: 42,
    hauteur: 48,
    des: 0,
    poids: 3,
    svg:
      '<svg viewBox="0 0 42 48" width="42" height="48" aria-hidden="true">' +
      '<path d="M6 12h30l-3 34H9z" fill="#5f6b7a" stroke="#2b1a2e" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M14 20v22M21 20v22M28 20v22" stroke="#2b1a2e" stroke-width="2" opacity=".45"/>' +
      '<rect x="3" y="5" width="36" height="9" rx="3" fill="#8a97a6" stroke="#2b1a2e" stroke-width="3"/>' +
      '<path d="M17 1h8v4h-8z" fill="#8a97a6" stroke="#2b1a2e" stroke-width="2.5"/></svg>',
  },
  {
    id: "banc",
    nom: "banc du parvis",
    genre: "sol",
    largeur: 86,
    hauteur: 36,
    des: 0.12,
    poids: 2.2,
    svg:
      '<svg viewBox="0 0 86 36" width="86" height="36" aria-hidden="true">' +
      '<path d="M13 12v22M73 12v22" stroke="#3b4250" stroke-width="6" stroke-linecap="round"/>' +
      '<rect x="4" y="4" width="78" height="9" rx="3.5" fill="#c98a3a" stroke="#2b1a2e" stroke-width="3"/>' +
      '<rect x="4" y="17" width="78" height="9" rx="3.5" fill="#b87a2e" stroke="#2b1a2e" stroke-width="3"/></svg>',
  },
  {
    id: "banderole",
    nom: "banderole des sélections",
    genre: "haut",
    largeur: 118,
    hauteur: 36,
    bas: 34, // hauteur libre en dessous : on passe accroupi, pas debout
    des: 0.2,
    poids: 2.4,
    svg:
      '<svg viewBox="0 0 118 36" width="118" height="36" aria-hidden="true">' +
      '<path d="M0 0h118v5H0z" fill="#2b1a2e"/>' +
      '<path d="M4 3h110v22l-55 9-55-9z" fill="#16255c" stroke="#2b1a2e" stroke-width="3" stroke-linejoin="round"/>' +
      '<text x="59" y="20" text-anchor="middle" font-family="Impact, Haettenschweiler, sans-serif" ' +
      'font-size="15" fill="#ffd84d">GO AUGUSTA</text></svg>',
  },
  {
    id: "haie",
    nom: "haie taillée",
    genre: "sol",
    largeur: 56,
    hauteur: 62,
    des: 0.34,
    poids: 2,
    svg:
      '<svg viewBox="0 0 56 62" width="56" height="62" aria-hidden="true">' +
      '<rect x="3" y="16" width="50" height="44" rx="10" fill="#2f7d3a" stroke="#2b1a2e" stroke-width="3"/>' +
      '<path d="M9 17c1-9 9-13 17-10 7-3 15 1 16 10" fill="#3f9c4a" stroke="#2b1a2e" stroke-width="3" stroke-linejoin="round"/>' +
      '<g fill="#ffd84d"><circle cx="16" cy="32" r="3"/><circle cx="39" cy="26" r="3"/><circle cx="30" cy="46" r="3"/></g></svg>',
  },
  {
    id: "guirlande",
    nom: "guirlande de fanions",
    genre: "haut",
    largeur: 168,
    hauteur: 30,
    bas: 36,
    des: 0.55,
    poids: 1.6,
    svg: guirlandeSVG(168, 30),
  },
  {
    id: "caddie",
    nom: "caddie abandonné",
    genre: "sol",
    largeur: 92,
    hauteur: 56,
    des: 0.6,
    poids: 1.8,
    svg:
      '<svg viewBox="0 0 92 56" width="92" height="56" aria-hidden="true">' +
      '<path d="M16 6h70l-9 30H25z" fill="#c3ccd6" stroke="#2b1a2e" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M21 16h63M25 26h55M38 6l-3 30M58 6l-2 30" stroke="#2b1a2e" stroke-width="2" opacity=".55"/>' +
      '<path d="M16 6H5" stroke="#2b1a2e" stroke-width="3.5" stroke-linecap="round"/>' +
      '<circle cx="31" cy="46" r="7" fill="#3b4250" stroke="#2b1a2e" stroke-width="3"/>' +
      '<circle cx="70" cy="46" r="7" fill="#3b4250" stroke="#2b1a2e" stroke-width="3"/></svg>',
  },
];

/* Le pompon à ramasser, seul objet qui ne fait pas mal. */
const POMPON_SVG =
  '<svg viewBox="0 0 26 26" width="26" height="26" aria-hidden="true">' +
  '<g stroke="#2b1a2e" stroke-width="2" stroke-linecap="round">' +
  '<path d="M5 7L1 3M21 7l4-4M5 19l-4 4M21 19l4 4M13 3V0M13 23v3"/></g>' +
  '<circle cx="13" cy="13" r="9" fill="#ffffff" stroke="#2b1a2e" stroke-width="2.5"/>' +
  '<circle cx="13" cy="13" r="3.5" fill="#e91e8c"/></svg>';

/* Les fanions, construits plutôt qu'écrits vingt fois à la main. */
function guirlandeSVG(largeur, hauteur) {
  const couleurs = ["#ff3d9a", "#ffd84d", "#4de0ff", "#ffffff"];
  let fanions = "";
  for (let i = 0; i * 20 + 22 < largeur; i++) {
    const x = 6 + i * 20;
    fanions +=
      '<path d="M' + x + " 7h14l-7 " + (hauteur - 9) + 'z" fill="' + couleurs[i % 4] +
      '" stroke="#2b1a2e" stroke-width="2.5" stroke-linejoin="round"/>';
  }
  return (
    '<svg viewBox="0 0 ' + largeur + " " + hauteur + '" width="' + largeur +
    '" height="' + hauteur + '" aria-hidden="true">' +
    '<path d="M0 4q' + largeur / 2 + " 9 " + largeur + ' 0" fill="none" stroke="#2b1a2e" stroke-width="3"/>' +
    fanions +
    "</svg>"
  );
}

/* --- Le décor, en parallaxe ----------------------------------------------
   Chaque couche est un motif CSS qui se répète tous les `periode` pixels et
   se déplace à `facteur` fois la vitesse du sol. Le motif lui-même est dans
   style.css : ici on ne décide que du rythme. */
const COUCHES = [
  { id: "ciel", facteur: 0.05, periode: 900 },
  { id: "campus", facteur: 0.22, periode: 520 },
  { id: "arbres", facteur: 0.48, periode: 320 },
  { id: "bordure", facteur: 1, periode: 240 },
];

/* --- Ce que Boq crie ------------------------------------------------------
   Il n'est pas méchant. C'est pire : il est sincère. */
const REPLIQUES_BOQ = [
  "« Glinda ! J'ai fait une playlist ! »",
  "« C'est juste UNE question ! »",
  "« J'ai gardé ta place à la cafét' ! »",
  "« Tu as vu mon message de mardi ? »",
  "« Attends, je cours moins vite que toi ! »",
  "« On avait dit qu'on en reparlerait ! »",
  "« J'ai apporté ton pompon oublié ! »",
  "« Deux minutes ! Deux ! »",
];

/* Les petits mots du tableau de bord, par palier d'écart. */
const ALERTES = [
  { seuil: 0.62, texte: "Il est loin. Respire." },
  { seuil: 0.38, texte: "Il gagne du terrain." },
  { seuil: 0.18, texte: "Il est SUR TES TALONS." },
  { seuil: 0, texte: "COURS !" },
];
