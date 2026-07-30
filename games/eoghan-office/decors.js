/* =========================================================
   Kiss & Cache — décors, mobilier et casting
   ---------------------------------------------------------
   La scène est vue DE CÔTÉ, comme les vieux jeux flash de bisous : une
   salle, deux plans de profondeur (devant / derrière), du mobilier posé au
   sol et des personnages qui vont de gauche à droite.

   Repère : x va de 0 à 1000 unités (la largeur de la salle). Le moteur
   convertit en pourcentage, donc tout reste net quelle que soit la taille
   de l'écran.

   Ajouter un décor = ajouter une entrée dans DECORS. Aucun code à écrire.

   Un PNJ se décrit en trois couches, qu'on combine librement :
     motif      "patrouille" (de → a, vitesse) | "tourne" (periode) | "fixe"
     distraction { regarde, pause, alterne } — il baisse les yeux sur son
                écran pendant `pause` ms : plus de faisceau, c'est LA fenêtre
                de tir du joueur. `alterne` le fait repartir de l'autre côté.
     zoom       amplitude (0,4 = jusqu'à +40 % de portée) + `zoom_ms` de
                période : la portée respire au lieu de rester figée.
   Les deux modulations ne dépendent que du temps : la part de salle
   surveillée reste une propriété du décor, donc mesurable
   (`node outils/mesure-difficulte-eoghan.js`).

   `objectifs` fixe les paliers de médaille (argent / or) du terrain. Ils ne
   servent qu'à donner une raison de rejouer un décor déjà réussi.
   ========================================================= */

const LARGEUR_SALLE = 1000;

/* =========================================================
   Le mobilier — tout est dessiné ici, aucun asset externe
   ========================================================= */

const T = "#2b1a2e"; // le trait sombre commun à tout le portail

const PROPS = {
  bureau: {
    largeur: 150, hauteur: 90, bloqueVue: true, cache: true,
    svg:
      '<svg viewBox="0 0 150 90" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="8" y="60" width="12" height="28" fill="#2f6f8f" stroke="' + T + '" stroke-width="4"/>' +
        '<rect x="130" y="60" width="12" height="28" fill="#2f6f8f" stroke="' + T + '" stroke-width="4"/>' +
        '<rect x="0" y="42" width="150" height="20" rx="6" fill="#3d8db3" stroke="' + T + '" stroke-width="4"/>' +
        '<rect x="18" y="60" width="114" height="28" fill="#2f6f8f" stroke="' + T + '" stroke-width="4"/>' +
        '<rect x="46" y="10" width="58" height="34" rx="4" fill="#d8e4ea" stroke="' + T + '" stroke-width="4"/>' +
        '<rect x="54" y="17" width="42" height="20" rx="2" fill="#7fb4cc"/>' +
      "</svg>",
  },
  plante: {
    largeur: 80, hauteur: 110, bloqueVue: true, cache: true,
    svg:
      '<svg viewBox="0 0 80 110" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M40 74C22 70 10 52 14 32c14-2 24 8 26 22 2-16 12-26 26-24 3 20-8 38-26 44z" fill="#3faa5a" stroke="' + T + '" stroke-width="4" stroke-linejoin="round"/>' +
        '<path d="M40 74V44" stroke="' + T + '" stroke-width="4"/>' +
        '<path d="M20 72h40l-6 32H26z" fill="#c56b3a" stroke="' + T + '" stroke-width="4" stroke-linejoin="round"/>' +
      "</svg>",
  },
  casier: {
    largeur: 96, hauteur: 170, bloqueVue: true, cache: true,
    svg:
      '<svg viewBox="0 0 96 170" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="4" y="4" width="88" height="162" rx="6" fill="#8fa4c4" stroke="' + T + '" stroke-width="4"/>' +
        '<rect x="12" y="12" width="32" height="146" rx="4" fill="#a8bcd8" stroke="' + T + '" stroke-width="3"/>' +
        '<rect x="52" y="12" width="32" height="146" rx="4" fill="#a8bcd8" stroke="' + T + '" stroke-width="3"/>' +
        '<circle cx="38" cy="86" r="3.5" fill="' + T + '"/><circle cx="58" cy="86" r="3.5" fill="' + T + '"/>' +
        '<path d="M18 30h20M18 36h20M58 30h20M58 36h20" stroke="' + T + '" stroke-width="3" stroke-linecap="round"/>' +
      "</svg>",
  },
  canape: {
    largeur: 170, hauteur: 90, bloqueVue: true, cache: true,
    svg:
      '<svg viewBox="0 0 170 90" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="26" width="158" height="42" rx="12" fill="#b3477a" stroke="' + T + '" stroke-width="4"/>' +
        '<rect x="0" y="34" width="26" height="42" rx="10" fill="#93305f" stroke="' + T + '" stroke-width="4"/>' +
        '<rect x="144" y="34" width="26" height="42" rx="10" fill="#93305f" stroke="' + T + '" stroke-width="4"/>' +
        '<rect x="26" y="48" width="118" height="28" rx="8" fill="#c9598c" stroke="' + T + '" stroke-width="4"/>' +
        '<rect x="18" y="76" width="10" height="12" fill="#6b2244" stroke="' + T + '" stroke-width="3"/>' +
        '<rect x="142" y="76" width="10" height="12" fill="#6b2244" stroke="' + T + '" stroke-width="3"/>' +
      "</svg>",
  },
  arbre: {
    largeur: 130, hauteur: 200, bloqueVue: true, cache: true,
    svg:
      '<svg viewBox="0 0 130 200" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="55" y="120" width="20" height="76" fill="#8a5a2b" stroke="' + T + '" stroke-width="4"/>' +
        '<circle cx="65" cy="76" r="52" fill="#3faa5a" stroke="' + T + '" stroke-width="4"/>' +
        '<circle cx="30" cy="100" r="30" fill="#48bd66" stroke="' + T + '" stroke-width="4"/>' +
        '<circle cx="100" cy="100" r="30" fill="#48bd66" stroke="' + T + '" stroke-width="4"/>' +
      "</svg>",
  },
  banc: {
    largeur: 150, hauteur: 70, bloqueVue: false, cache: true,
    svg:
      '<svg viewBox="0 0 150 70" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="26" width="138" height="14" rx="6" fill="#c98a4a" stroke="' + T + '" stroke-width="4"/>' +
        '<rect x="6" y="44" width="138" height="12" rx="5" fill="#b3773a" stroke="' + T + '" stroke-width="4"/>' +
        '<rect x="16" y="54" width="10" height="14" fill="#6b4a2b" stroke="' + T + '" stroke-width="3"/>' +
        '<rect x="124" y="54" width="10" height="14" fill="#6b4a2b" stroke="' + T + '" stroke-width="3"/>' +
      "</svg>",
  },
  enceinte: {
    largeur: 80, hauteur: 150, bloqueVue: true, cache: true,
    svg:
      '<svg viewBox="0 0 80 150" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="8" y="6" width="64" height="140" rx="8" fill="#3a2b4e" stroke="' + T + '" stroke-width="4"/>' +
        '<circle cx="40" cy="46" r="22" fill="#5c4a75" stroke="' + T + '" stroke-width="4"/>' +
        '<circle cx="40" cy="46" r="8" fill="#2b1a2e"/>' +
        '<circle cx="40" cy="104" r="14" fill="#5c4a75" stroke="' + T + '" stroke-width="4"/>' +
        '<circle cx="40" cy="104" r="5" fill="#2b1a2e"/>' +
      "</svg>",
  },
  buvette: {
    largeur: 140, hauteur: 100, bloqueVue: true, cache: true,
    svg:
      '<svg viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="6" y="40" width="128" height="56" rx="8" fill="#d8b45a" stroke="' + T + '" stroke-width="4"/>' +
        '<rect x="16" y="52" width="108" height="14" rx="4" fill="#f0d68a"/>' +
        '<rect x="30" y="14" width="18" height="28" rx="4" fill="#ff6b9d" stroke="' + T + '" stroke-width="4"/>' +
        '<rect x="58" y="8" width="18" height="34" rx="4" fill="#4de0ff" stroke="' + T + '" stroke-width="4"/>' +
        '<rect x="86" y="18" width="18" height="24" rx="4" fill="#c6ff4d" stroke="' + T + '" stroke-width="4"/>' +
      "</svg>",
  },
};

/* =========================================================
   Les décors
   ========================================================= */

const DECORS = [
  {
    id: "campus",
    titre: "Le campus",
    emoji: "☀️",
    difficulte: "Facile",
    etoiles: "★",
    ambiance: "Plein jour, pelouse, affiches d'auditions. Peu d'abris, mais de la place pour contourner.",
    chrono_s: 100,
    ragots_max: 3,
    duree_bisou_ms: 800,
    objectifs: { argent: 700, or: 950 },
    gimmick: null,
    palette: {
      fond: "linear-gradient(180deg, #8fd8f0 0%, #bdeaf7 55%, #d9f2c9 100%)",
      solArriere: "#7cc46a",
      solAvant: "#68b158",
      bandeau: "#4f9a45",
    },
    decorFond: "campus",
    eoghan: { x: 80, plan: 0 },
    props: [
      { type: "arbre", x: 120, plan: 1 },
      { type: "arbre", x: 620, plan: 1 },
      { type: "banc", x: 300, plan: 0 },
      { type: "banc", x: 700, plan: 0 },
      { type: "plante", x: 880, plan: 1 },
    ],
    garcons: [
      { x: 430, plan: 0, nom: "Le type du club d'échecs", replique: "Échec et… enfin bref. C'était sympa.",
        look: { peau: "#f0c39a", cheveux: "frange", couleurCheveux: "#4a2c17", haut: "#5b7fd4", bas: "#3a4a7a", accessoire: "lunettes" } },
      { x: 760, plan: 1, nom: "Le gars à la guitare", replique: "J'écrirai une chanson là-dessus.",
        look: { peau: "#d99a6c", cheveux: "boucle", couleurCheveux: "#2b1a2e", haut: "#e8a33a", bas: "#6b4a8a" } },
      { x: 930, plan: 0, nom: "Le poète du fond de la salle", replique: "Je note ça, pour un poème.",
        look: { peau: "#f8dcc0", cheveux: "long", couleurCheveux: "#8a5a2b", haut: "#7a6bd4", bas: "#2f3550" } },
    ],
    pnj: [
      /* Elle cadre plus loin qu'avant, mais elle finit toujours par retourner
         à son fil d'actualité : même surveillance en moyenne, une respiration
         en plus. C'est le décor où on apprend à lire les fenêtres. */
      { x: 520, plan: 1, nom: "la bibliothécaire", motif: "fixe", portee: 380,
        distraction: { regarde: 3000, pause: 1600, alterne: true },
        look: { peau: "#f0c39a", cheveux: "queue", couleurCheveux: "#6b4a8a", haut: "#8a5ac4", bas: "#3a2b4e", accessoire: "lunettes" } },
      { x: 260, plan: 0, nom: "l'agent d'entretien", motif: "patrouille", de: 200, a: 600, vitesse: 60, portee: 185,
        look: { peau: "#a9683f", cheveux: "casquette", couleurCheveux: "#2b1a2e", haut: "#4aa3d4", bas: "#2f4a6b", accessoire: "casquette" } },
      { x: 860, plan: 0, nom: "l'écureuil suspect", motif: "tourne", periode: 2000, portee: 110, petit: true,
        look: { peau: "#c98a4a", cheveux: "crete", couleurCheveux: "#8a5a2b", haut: "#c98a4a", bas: "#8a5a2b" } },
    ],
  },

  {
    id: "soiree",
    titre: "La soirée",
    emoji: "🎉",
    difficulte: "Moyen",
    etoiles: "★★",
    ambiance: "Lumière tamisée, canapés partout, musique à fond. Toutes les 10 s, un flash éclaire TOUT.",
    chrono_s: 80,
    ragots_max: 3,
    duree_bisou_ms: 1000,
    objectifs: { argent: 850, or: 1150 },
    gimmick: "flash",
    palette: {
      fond: "linear-gradient(180deg, #2a1140 0%, #4a1f5e 60%, #6b2a6b 100%)",
      solArriere: "#3d2a52",
      solAvant: "#4e3566",
      bandeau: "#241238",
    },
    decorFond: "soiree",
    eoghan: { x: 70, plan: 0 },
    props: [
      { type: "canape", x: 200, plan: 1 },
      { type: "canape", x: 640, plan: 1 },
      { type: "enceinte", x: 40, plan: 1 },
      { type: "enceinte", x: 950, plan: 1 },
      { type: "buvette", x: 430, plan: 0 },
      { type: "plante", x: 830, plan: 0 },
    ],
    garcons: [
      { x: 300, plan: 0, nom: "Le gars qui a apporté les gâteaux", replique: "Il reste des gâteaux, au fait.",
        look: { peau: "#f8dcc0", cheveux: "court", couleurCheveux: "#c98a3a", haut: "#e0446b", bas: "#2f3550" } },
      { x: 560, plan: 1, nom: "L'artiste plein de peinture", replique: "Tu as de la peinture sur la joue. Garde-la.",
        look: { peau: "#d99a6c", cheveux: "crete", couleurCheveux: "#b03a3a", haut: "#3faa5a", bas: "#4a2c17" } },
      { x: 780, plan: 0, nom: "Le nageur", replique: "J'ai chlore-ment apprécié. …Pardon.",
        look: { peau: "#f0c39a", cheveux: "chauve", couleurCheveux: "#2b1a2e", haut: "#4de0ff", bas: "#2f6f8f" } },
      { x: 940, plan: 1, nom: "Le gars à la guitare", replique: "Deuxième chanson de la soirée.",
        look: { peau: "#a9683f", cheveux: "boucle", couleurCheveux: "#2b1a2e", haut: "#e8a33a", bas: "#6b4a8a" } },
    ],
    pnj: [
      { x: 380, plan: 1, nom: "le danseur", motif: "tourne", periode: 1900, portee: 250,
        look: { peau: "#f0c39a", cheveux: "crete", couleurCheveux: "#e8b84b", haut: "#ff3d9a", bas: "#2b1a2e" } },
      /* Lui reste tel quel : la buvette lui coupe la vue à 260 unités, un zoom
         n'y changerait rien — autant le donner à quelqu'un qui a du champ. */
      { x: 690, plan: 0, nom: "le roi de la table de boissons", motif: "fixe", dir: -1, portee: 300,
        look: { peau: "#7a4a2b", cheveux: "court", couleurCheveux: "#2b1a2e", haut: "#c6ff4d", bas: "#3a4a7a" } },
      /* Elle, elle a toute la gauche de la salle devant elle : son zoom se
         voit vraiment, et le fond de la piste n'est plus jamais acquis. */
      { x: 150, plan: 0, nom: "la fille qui filme des stories", motif: "patrouille", de: 90, a: 460, vitesse: 105, portee: 230,
        zoom: 0.5, zoom_ms: 2600,
        look: { peau: "#f8dcc0", cheveux: "couettes", couleurCheveux: "#b03a3a", haut: "#9b4dff", bas: "#ff8ac4", accessoire: "noeud" } },
      /* Le photographe passe son temps à relire ses photos : grosse portée,
         mais un temps mort régulier — et il ne repart jamais du même côté. */
      { x: 880, plan: 1, nom: "le photographe amateur", motif: "tourne", periode: 2400, portee: 330,
        distraction: { regarde: 2200, pause: 1000, alterne: true },
        look: { peau: "#d99a6c", cheveux: "long", couleurCheveux: "#4a2c17", haut: "#2f6f8f", bas: "#2b1a2e" } },
    ],
  },

  {
    id: "vestiaire",
    titre: "Le vestiaire de sport",
    emoji: "🏀",
    difficulte: "Difficile",
    etoiles: "★★★",
    ambiance: "Rangées de casiers, néons, buée. Toutes les 20 s, un groupe traverse la salle et pousse tout le monde.",
    chrono_s: 55,
    ragots_max: 2,
    duree_bisou_ms: 700,
    objectifs: { argent: 600, or: 800 },
    gimmick: "douche",
    palette: {
      fond: "linear-gradient(180deg, #b9c9de 0%, #93a7c4 55%, #7b8ea9 100%)",
      solArriere: "#8794a8",
      solAvant: "#9aa8bd",
      bandeau: "#5f6d82",
    },
    decorFond: "vestiaire",
    eoghan: { x: 60, plan: 0 },
    props: [
      { type: "casier", x: 110, plan: 1 },
      { type: "casier", x: 205, plan: 1 },
      { type: "casier", x: 900, plan: 1 },
      { type: "casier", x: 995, plan: 1 },
      { type: "banc", x: 380, plan: 0 },
      { type: "banc", x: 760, plan: 0 },
    ],
    garcons: [
      { x: 520, plan: 1, nom: "Le capitaine adjoint", replique: "On n'a rien vu. Enfin, moi si.",
        look: { peau: "#a9683f", cheveux: "court", couleurCheveux: "#2b1a2e", haut: "#e0446b", bas: "#fff" } },
      { x: 290, plan: 0, nom: "Le nageur", replique: "Toujours aussi rapide, toi.",
        look: { peau: "#f0c39a", cheveux: "chauve", couleurCheveux: "#2b1a2e", haut: "#4de0ff", bas: "#2f6f8f" } },
      { x: 900, plan: 0, nom: "Le gars du banc de touche", replique: "Meilleur moment de ma saison.",
        look: { peau: "#f8dcc0", cheveux: "frange", couleurCheveux: "#8a5a2b", haut: "#ffd84d", bas: "#3a4a7a" } },
    ],
    pnj: [
      { x: 480, plan: 0, nom: "le coach", motif: "patrouille", de: 120, a: 880, vitesse: 200, portee: 380,
        look: { peau: "#d99a6c", cheveux: "casquette", couleurCheveux: "#2b1a2e", haut: "#c22f52", bas: "#2f3550", accessoire: "casquette" } },
      /* Le capitaine tient toute la longueur du vestiaire au téléphone, et il
         zoome par-dessus le marché : ici, la respiration ne vient pas de lui
         mais des casiers. */
      { x: 850, plan: 1, nom: "le capitaine d'équipe", motif: "fixe", dir: -1, portee: 500,
        zoom: 0.25, zoom_ms: 2800,
        look: { peau: "#7a4a2b", cheveux: "crete", couleurCheveux: "#2b1a2e", haut: "#ffd84d", bas: "#2b1a2e" } },
      { x: 560, plan: 0, nom: "l'arbitre du dimanche", motif: "tourne", periode: 1100, portee: 300,
        look: { peau: "#f0c39a", cheveux: "chauve", couleurCheveux: "#2b1a2e", haut: "#2b1a2e", bas: "#2b1a2e", accessoire: "lunettes" } },
      { x: 300, plan: 1, nom: "le surveillant de vestiaire", motif: "patrouille", de: 260, a: 720, vitesse: 155, portee: 280,
        look: { peau: "#f8dcc0", cheveux: "court", couleurCheveux: "#8a5a2b", haut: "#4aa3d4", bas: "#2f3550" } },
    ],
  },

  {
    id: "bal",
    titre: "Le bal de promo",
    emoji: "🪩",
    difficulte: "Expert",
    etoiles: "★★★★",
    ambiance: "Le grand soir : gel dans les cheveux, punch tiède et un projecteur qui balaie la piste sans jamais s'arrêter. Il ne trie pas les rangées et les meubles ne l'arrêtent pas — accroupis-toi ou attends-le.",
    chrono_s: 75,
    ragots_max: 2,
    duree_bisou_ms: 900,
    objectifs: { argent: 800, or: 1100 },
    gimmick: "projecteur",
    /* Assez large pour qu'on ne puisse pas le prendre de vitesse en marchant
       (Eoghan fait 210 unités/s), assez lent pour qu'on ait le temps de le
       traverser dans l'autre sens ou de plonger derrière un meuble. */
    projecteur: { largeur: 210, vitesse: 175 },
    palette: {
      fond: "linear-gradient(180deg, #140b33 0%, #2c1560 58%, #4a1d6b 100%)",
      solArriere: "#2a1c4e",
      solAvant: "#3a2668",
      bandeau: "#0f0824",
    },
    decorFond: "bal",
    eoghan: { x: 60, plan: 0 },
    /* Six abris, trois par rangée : avec un projecteur qui passe et repasse,
       il faut toujours avoir un meuble en vue. Les deux enceintes et le canapé
       cadrent la piste du fond ; devant, la table à punch coupe la salle en
       deux et le banc ne cache que si on s'accroupit. */
    props: [
      { type: "enceinte", x: 40, plan: 1 },
      { type: "canape", x: 700, plan: 1 },
      { type: "enceinte", x: 960, plan: 1 },
      { type: "plante", x: 190, plan: 0 },
      { type: "buvette", x: 520, plan: 0 },
      { type: "banc", x: 850, plan: 0 },
    ],
    garcons: [
      { x: 250, plan: 0, nom: "Le cavalier de quelqu'un d'autre", replique: "Techniquement, j'accompagnais quelqu'un.",
        look: { peau: "#f8dcc0", cheveux: "court", couleurCheveux: "#2b1a2e", haut: "#2f3550", bas: "#2f3550", accessoire: "noeud", couleurAccessoire: "#ff3d9a" } },
      /* Planté en plein dans le champ de la reine : la seule façon de
         l'embrasser tranquille est de s'accroupir derrière le banc. */
      { x: 800, plan: 0, nom: "Le trésorier du comité du bal", replique: "Ça, ce n'était pas prévu au budget.",
        look: { peau: "#d99a6c", cheveux: "frange", couleurCheveux: "#4a2c17", haut: "#7a6bd4", bas: "#2b1a2e", accessoire: "lunettes" } },
      { x: 830, plan: 1, nom: "Le roi du bal", replique: "Une couronne, un bisou. Excellente soirée.",
        look: { peau: "#a9683f", cheveux: "boucle", couleurCheveux: "#2b1a2e", haut: "#ffd84d", bas: "#3a2b4e" } },
      { x: 460, plan: 1, nom: "Le gars qui tient le punch", replique: "Ressers-toi. Enfin… tu t'es déjà servi.",
        look: { peau: "#f0c39a", cheveux: "crete", couleurCheveux: "#c98a3a", haut: "#4de0ff", bas: "#2f3550" } },
    ],
    pnj: [
      /* Le DJ tient toute la piste du fond depuis sa cabine — son champ court
         jusqu'au canapé — mais il a un morceau à caler toutes les 2,6 s :
         c'est la respiration du décor, et la seule façon de traverser. */
      { x: 60, plan: 1, nom: "le DJ", motif: "fixe", dir: 1, portee: 640,
        distraction: { regarde: 2600, pause: 1900 },
        look: { peau: "#d99a6c", cheveux: "casquette", couleurCheveux: "#2b1a2e", haut: "#9b4dff", bas: "#2b1a2e", accessoire: "casquette" } },
      /* Elle se filme en continu du même côté, et elle zoome : le fond du
         parquet n'est jamais sûr, seulement plus ou moins loin. */
      { x: 630, plan: 0, nom: "la reine du bal", motif: "fixe", dir: 1, portee: 330,
        zoom: 0.35, zoom_ms: 2600,
        look: { peau: "#f8dcc0", cheveux: "long", couleurCheveux: "#e8b84b", haut: "#ff8ac4", bas: "#ff8ac4", accessoire: "serretete", couleurAccessoire: "#ffd84d" } },
      { x: 300, plan: 0, nom: "le prof chaperon", motif: "patrouille", de: 130, a: 860, vitesse: 145, portee: 300,
        look: { peau: "#f0c39a", cheveux: "chauve", couleurCheveux: "#2b1a2e", haut: "#3a4a7a", bas: "#2f3550", accessoire: "lunettes" } },
      /* Elle garde le coin du canapé, la seule zone que le DJ ne voit pas —
         mais elle republie ses stories toutes les trois secondes. */
      { x: 930, plan: 1, nom: "la déléguée qui fait des stories", motif: "fixe", dir: -1, portee: 260,
        distraction: { regarde: 3200, pause: 1200 },
        look: { peau: "#a9683f", cheveux: "couettes", couleurCheveux: "#b03a3a", haut: "#e0446b", bas: "#2b1a2e", accessoire: "noeud" } },
    ],
  },
];
