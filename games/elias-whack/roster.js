/* =========================================================
   Sanity Whack — le casting
   ---------------------------------------------------------
   Deux familles d'apparitions :
     - CIBLES  : à taper. Rapportent des points.
     - PIEGES  : à NE PAS taper. Ce sont des choses parfaitement
                 inoffensives de la vie d'Elias — les taper fait monter
                 la jauge de sanity (gag : il panique pour rien).

   Casting 100 % original : aucune créature de creepypasta existante,
   ni par le nom, ni par le dessin. En V1 les emoji font office de
   placeholders, remplaçables plus tard par de vraies images sans
   toucher au moteur.
   ========================================================= */

const CIBLES = [
  { id: "gris", emoji: "👽", nom: "Petit gris générique", points: 100 },
  { id: "ovni", emoji: "🛸", nom: "Ovni de tourisme", points: 120 },
  { id: "silhouette", emoji: "🌲", nom: "Silhouette floue dans les bois", points: 100 },
  { id: "oeil", emoji: "👁️", nom: "Œil géant dans le ciel", points: 150 },
  { id: "chevre", emoji: "🐐", nom: "Chèvre suspecte", points: 130 },
  { id: "ombre", emoji: "👤", nom: "Ombre humanoïde du couloir", points: 110 },
];

const PIEGES = [
  { id: "chat", emoji: "🐈", nom: "Le chat d'Elias", replique: "C'était le chat. Encore." },
  { id: "mamie", emoji: "👵", nom: "Sa grand-mère", replique: "Tu as tapé ta grand-mère." },
  { id: "pizza", emoji: "🍕", nom: "Une pizza", replique: "La pizza n'avait rien demandé." },
];

/* Phrases de fin, tirées au sort selon la façon dont la partie se termine. */
const FINS_PANIQUE = [
  "Elias a rédigé un thread Reddit de 4000 mots. Personne ne l'a lu.",
  "Elias a scotché du papier alu sur les fenêtres. Toutes les fenêtres.",
  "Elias a appelé trois personnes à 4 h du matin. Elles ont raccroché.",
];

const FINS_CALME = [
  "Elias a tout noté dans son carnet. Il est presque serein.",
  "Elias affirme qu'il « gère très bien ». Personne ne le contredit.",
  "Elias a dormi cinq heures d'affilée. Un record.",
];

/* Commentaires d'ambiance selon le palier de sanity. */
const AMBIANCES = [
  "Tout va bien. Enfin, presque.",
  "Elias entend un bruit dans le couloir.",
  "L'écran tremble. Elias aussi.",
  "PLUS RIEN N'EST NORMAL 📡",
];
