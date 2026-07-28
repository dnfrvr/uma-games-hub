/* =========================================================
   Sanity Whack — le casting
   ---------------------------------------------------------
   Deux familles d'apparitions :
     - CIBLES  : à taper. Rapportent des points.
     - PIEGES  : à NE PAS taper. Ce sont des choses parfaitement
                 inoffensives de la vie d'Elias — les taper fait monter
                 la jauge de sanity (gag : il panique pour rien).

   Chaque entrée porte son propre dessin SVG : casting 100 % original,
   aucune créature de creepypasta existante, aucun asset externe. Les
   dessins partagent le trait épais et les aplats du reste du portail.
   ========================================================= */

const TRAIT = "#2b1a2e";

/* Petit raccourci : toutes les créatures tiennent dans le même cadre,
   ce qui garantit qu'elles sortent du trou à la même échelle. */
function creature(contenu) {
  return '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round">' + contenu + "</svg>";
}

const DESSINS = {
  gris: creature(
    '<path d="M32 60C16 60 8 44 8 30 8 16 19 6 32 6s24 10 24 24c0 14-8 30-24 30z" fill="#b7e36b" stroke="' + TRAIT + '" stroke-width="4"/>' +
    '<path d="M14 26c2-6 8-8 12-4 3 3 2 8-2 10-5 2-11-1-10-6z" fill="' + TRAIT + '"/>' +
    '<path d="M50 26c-2-6-8-8-12-4-3 3-2 8 2 10 5 2 11-1 10-6z" fill="' + TRAIT + '"/>' +
    '<path d="M26 46q6 5 12 0" fill="none" stroke="' + TRAIT + '" stroke-width="3.5" stroke-linecap="round"/>'
  ),

  ovni: creature(
    '<path d="M20 30a12 12 0 0 1 24 0z" fill="#cfe9ff" stroke="' + TRAIT + '" stroke-width="4"/>' +
    '<ellipse cx="32" cy="34" rx="28" ry="10" fill="#8fa4c4" stroke="' + TRAIT + '" stroke-width="4"/>' +
    '<circle cx="14" cy="36" r="3" fill="#ffd84d" stroke="' + TRAIT + '" stroke-width="2"/>' +
    '<circle cx="32" cy="38" r="3" fill="#ff3d9a" stroke="' + TRAIT + '" stroke-width="2"/>' +
    '<circle cx="50" cy="36" r="3" fill="#4de0ff" stroke="' + TRAIT + '" stroke-width="2"/>' +
    '<path d="M22 44l-6 16h32l-6-16z" fill="rgba(255,216,77,.45)" stroke="none"/>'
  ),

  silhouette: creature(
    '<path d="M6 62l8-30 6 12 6-24 8 20 6-16 8 22 8-14 4 30z" fill="#1f4d33" stroke="' + TRAIT + '" stroke-width="3"/>' +
    '<path d="M32 62c-7 0-11-6-11-14 0-9 5-16 11-16s11 7 11 16c0 8-4 14-11 14z" fill="#14202a" stroke="' + TRAIT + '" stroke-width="3.5"/>' +
    '<circle cx="27" cy="42" r="3" fill="#ffe86b"/><circle cx="37" cy="42" r="3" fill="#ffe86b"/>'
  ),

  oeil: creature(
    '<path d="M4 34c10-14 20-20 28-20s18 6 28 20c-10 14-20 20-28 20S14 48 4 34z" fill="#fff" stroke="' + TRAIT + '" stroke-width="4"/>' +
    '<circle cx="32" cy="34" r="13" fill="#4aa3d4" stroke="' + TRAIT + '" stroke-width="3.5"/>' +
    '<circle cx="32" cy="34" r="6" fill="' + TRAIT + '"/>' +
    '<circle cx="28" cy="30" r="2.5" fill="#fff"/>'
  ),

  chevre: creature(
    '<path d="M16 20c-6-6-8-12-6-14 4-2 9 3 12 8M48 20c6-6 8-12 6-14-4-2-9 3-12 8" fill="#d8d2c4" stroke="' + TRAIT + '" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M32 58c-11 0-18-8-18-20 0-11 7-18 18-18s18 7 18 18c0 12-7 20-18 20z" fill="#efe9dc" stroke="' + TRAIT + '" stroke-width="4"/>' +
    '<rect x="24" y="34" width="7" height="5" rx="2" fill="' + TRAIT + '"/>' +
    '<rect x="33" y="34" width="7" height="5" rx="2" fill="' + TRAIT + '"/>' +
    '<path d="M26 48h12" stroke="' + TRAIT + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M28 56l2 6M36 56l-2 6" stroke="' + TRAIT + '" stroke-width="3" stroke-linecap="round"/>'
  ),

  ombre: creature(
    '<path d="M32 6c6 0 10 5 10 11 0 3-1 6-3 8 8 3 13 11 13 21v18H12V46c0-10 5-18 13-21-2-2-3-5-3-8 0-6 4-11 10-11z" fill="#241a35" stroke="' + TRAIT + '" stroke-width="3.5"/>' +
    '<circle cx="27" cy="17" r="2.6" fill="#c6ff4d"/><circle cx="37" cy="17" r="2.6" fill="#c6ff4d"/>'
  ),

  chat: creature(
    '<path d="M14 24l-2-14 12 6M50 24l2-14-12 6" fill="#d98a3a" stroke="' + TRAIT + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<circle cx="32" cy="36" r="22" fill="#e8a33a" stroke="' + TRAIT + '" stroke-width="4"/>' +
    '<ellipse cx="24" cy="32" rx="3" ry="4.5" fill="' + TRAIT + '"/>' +
    '<ellipse cx="40" cy="32" rx="3" ry="4.5" fill="' + TRAIT + '"/>' +
    '<path d="M32 40l-3 3h6z" fill="' + TRAIT + '"/>' +
    '<path d="M14 38h8M14 44h8M50 38h-8M50 44h-8" stroke="' + TRAIT + '" stroke-width="2.5" stroke-linecap="round"/>'
  ),

  pizza: creature(
    '<path d="M32 6l26 46H6z" fill="#f0c14b" stroke="' + TRAIT + '" stroke-width="4"/>' +
    '<path d="M32 14l20 34H12z" fill="#e8a33a" stroke="none"/>' +
    '<circle cx="32" cy="30" r="5" fill="#c22f52" stroke="' + TRAIT + '" stroke-width="2.5"/>' +
    '<circle cx="22" cy="42" r="4.5" fill="#c22f52" stroke="' + TRAIT + '" stroke-width="2.5"/>' +
    '<circle cx="42" cy="42" r="4.5" fill="#c22f52" stroke="' + TRAIT + '" stroke-width="2.5"/>'
  ),
};

const CIBLES = [
  { id: "gris", svg: DESSINS.gris, nom: "Petit gris générique", points: 100 },
  { id: "ovni", svg: DESSINS.ovni, nom: "Ovni de tourisme", points: 120 },
  { id: "silhouette", svg: DESSINS.silhouette, nom: "Silhouette floue dans les bois", points: 100 },
  { id: "oeil", svg: DESSINS.oeil, nom: "Œil géant dans le ciel", points: 150 },
  { id: "chevre", svg: DESSINS.chevre, nom: "Chèvre suspecte", points: 130 },
  { id: "ombre", svg: DESSINS.ombre, nom: "Ombre humanoïde du couloir", points: 110 },
];

/* La grand-mère réutilise la fabrique de personnages du portail : même
   style de dessin que Glinda ou Eoghan, sans code en double. */
const PIEGES = [
  { id: "chat", svg: DESSINS.chat, nom: "Le chat d'Elias", replique: "C'était le chat. Encore." },
  {
    id: "mamie",
    svg: persoSVG({
      peau: "#f0c39a", cheveux: "boucle", couleurCheveux: "#d8d2c4",
      haut: "#b3477a", bas: "#6b4a8a", accessoire: "lunettes", bouche: "sourire",
    }),
    nom: "Sa grand-mère",
    replique: "Tu as tapé ta grand-mère.",
  },
  { id: "pizza", svg: DESSINS.pizza, nom: "Une pizza", replique: "La pizza n'avait rien demandé." },
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
