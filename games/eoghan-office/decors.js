/* =========================================================
   Kiss & Cache — les trois décors
   ---------------------------------------------------------
   Un décor = une carte en ASCII + une liste de PNJ. Le moteur ne connaît
   aucun décor en particulier : ajouter un terrain, c'est ajouter une
   entrée ici, sans toucher à main.js.

   Légende de la carte :
     .  sol libre        #  mur
     T  table / banc     A  arbre / plante
     C  casier / colonne S  canapé / enceinte
     E  position de départ d'Eoghan
     G  un garçon partant (nommé dans l'ordre d'apparition, de haut en bas)

   Les obstacles bloquent le passage ET la vue : se cacher, c'est mettre du
   mobilier entre soi et un cône de vision.

   PNJ — motifs de cône :
     "rotation"    le cône tourne en continu
     "va-et-vient" le PNJ patrouille le long de `chemin` et regarde devant lui
     "fixe"        le cône ne bouge pas (mais il est souvent large)
   ========================================================= */

const DECORS = [
  {
    id: "campus",
    titre: "Le campus",
    emoji: "☀️",
    difficulte: "Facile",
    etoiles: "★",
    ambiance: "Plein jour, pelouse, affiches d'auditions. Peu d'abris, mais de la place pour contourner.",
    chrono_s: 90,
    ragots_max: 3,
    duree_bisou_ms: 800,
    gimmick: null,
    carte: [
      "############",
      "#....A.....#",
      "#..T....G..#",
      "#.....A....#",
      "#..G....T..#",
      "#....A.....#",
      "#.E.....G..#",
      "############",
    ],
    garcons: [
      { nom: "Le type du club d'échecs", replique: "Échec et… enfin bref. C'était sympa." },
      { nom: "Le gars à la guitare", replique: "J'écrirai une chanson là-dessus. Désolé d'avance." },
      { nom: "Le poète du fond de la salle", replique: "Je note ça. Pour plus tard. Pour un poème." },
    ],
    pnj: [
      { x: 6, y: 1, type: "bibliothécaire", emoji: "📚", motif: "rotation", vitesse: 0.55, portee: 3 },
      { x: 3, y: 5, type: "agent d'entretien", emoji: "🧹", motif: "va-et-vient", vitesse: 1, portee: 3,
        chemin: [[2, 5], [8, 5]] },
      { x: 9, y: 3, type: "écureuil suspect", emoji: "🐿️", motif: "rotation", vitesse: 1.6, portee: 2 },
    ],
  },

  {
    id: "soiree",
    titre: "La soirée",
    emoji: "🎉",
    difficulte: "Moyen",
    etoiles: "★★",
    ambiance: "Lumière tamisée, canapés partout, un couloir étroit. Toutes les 10 s, un flash éclaire TOUT.",
    chrono_s: 75,
    ragots_max: 4,
    duree_bisou_ms: 1000,
    gimmick: "flash",
    carte: [
      "############",
      "#S.S..G..S.#",
      "#....TT....#",
      "#.G..TT..G.#",
      "##.######.##",
      "#....S.....#",
      "#.E.....G..#",
      "############",
    ],
    garcons: [
      { nom: "Le gars qui a apporté les gâteaux", replique: "Il reste des gâteaux, au fait." },
      { nom: "L'artiste plein de peinture", replique: "Tu as de la peinture sur la joue. Garde-la." },
      { nom: "Le nageur", replique: "J'ai chlore-ment apprécié. …Pardon." },
      { nom: "Le gars à la guitare", replique: "Deuxième chanson de la soirée. Tu inspires." },
    ],
    pnj: [
      { x: 5, y: 1, type: "danseur", emoji: "🕺", motif: "rotation", vitesse: 1.1, portee: 3 },
      { x: 5, y: 5, type: "roi de la table de boissons", emoji: "🥤", motif: "fixe", vitesse: 0, portee: 4, direction: 0 },
      { x: 2, y: 3, type: "fille qui filme des stories", emoji: "📱", motif: "va-et-vient", vitesse: 1.4, portee: 3,
        chemin: [[1, 3], [3, 3]] },
      { x: 9, y: 5, type: "photographe amateur", emoji: "📸", motif: "rotation", vitesse: 0.8, portee: 3 },
    ],
  },

  {
    id: "vestiaire",
    titre: "Le vestiaire de sport",
    emoji: "🏀",
    difficulte: "Difficile",
    etoiles: "★★★",
    ambiance: "Couloirs étroits entre les casiers, néons, buée. Toutes les 20 s, un groupe traverse le couloir central.",
    chrono_s: 60,
    ragots_max: 2,
    duree_bisou_ms: 600,
    gimmick: "douche",
    carte: [
      "############",
      "#CC.CC.CC.G#",
      "#..........#",
      "#.G.CC.CC..#",
      "#..........#",
      "#CC.CC.CC.G#",
      "#.E........#",
      "############",
    ],
    garcons: [
      { nom: "Le capitaine adjoint", replique: "On n'a rien vu. Enfin, moi si." },
      { nom: "Le nageur", replique: "Toujours aussi rapide, toi." },
      { nom: "Le gars du banc de touche", replique: "Meilleur moment de ma saison." },
    ],
    pnj: [
      { x: 5, y: 2, type: "coach", emoji: "🏐", motif: "va-et-vient", vitesse: 1.8, portee: 4,
        chemin: [[1, 2], [10, 2]] },
      { x: 7, y: 4, type: "capitaine d'équipe", emoji: "🧦", motif: "fixe", vitesse: 0, portee: 4, direction: 2 },
      { x: 3, y: 6, type: "arbitre du dimanche", emoji: "📣", motif: "rotation", vitesse: 1.2, portee: 3 },
    ],
  },
];

/* Décors des cases : ce que chaque caractère de la carte veut dire. */
const TUILES = {
  "#": { bloque: true, classe: "mur", emoji: "" },
  T: { bloque: true, classe: "table", emoji: "🪑" },
  A: { bloque: true, classe: "arbre", emoji: "🌳" },
  C: { bloque: true, classe: "casier", emoji: "🚪" },
  S: { bloque: true, classe: "canape", emoji: "🛋️" },
  ".": { bloque: false, classe: "sol", emoji: "" },
  E: { bloque: false, classe: "sol", emoji: "" },
  G: { bloque: false, classe: "sol", emoji: "" },
};
