/* =========================================================
   Sanity Whack — le casting
   ---------------------------------------------------------
   Deux familles d'apparitions :
     - CIBLES  : à taper. Rapportent des points.
     - PIEGES  : à NE PAS taper. Ce sont des choses (et des gens) tout à
                 fait inoffensifs — les taper fait monter la jauge de
                 sanity (gag : Elias panique pour rien, puis s'en veut).

   Tous les textes sont dits par Elias, à la première personne : ce sont
   ses commentaires en direct, affichés dans sa bulle.

   `replique` est la phrase canonique de l'entrée ; `repliques` ajoute des
   variantes tirées au hasard. Une partie longue fait sortir dix fois la même
   créature — sans variantes, Elias se met à radoter et on cesse de le lire.

   Chaque entrée porte son propre dessin SVG, dans le style chibi du
   portail (cf. shared/perso.js pour les personnages).
   ========================================================= */

const TRAIT = "#2b1a2e";

/* Toutes les créatures tiennent dans le même cadre : elles sortent donc
   du trou à la même échelle. */
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

  /* Le clown du caniveau : ballon rouge, collerette, sourire fendu. */
  clown: creature(
    '<path d="M50 6a8 8 0 1 1 0 16 8 8 0 0 1 0-16z" fill="#e0002b" stroke="' + TRAIT + '" stroke-width="3"/>' +
    '<path d="M50 22c-2 6-2 12 0 18" fill="none" stroke="' + TRAIT + '" stroke-width="2"/>' +
    '<path d="M10 40c-4-2-6-8-4-12 3 2 6 3 9 3M54 40c4-2 6-8 4-12-3 2-6 3-9 3" fill="#e8501e" stroke="' + TRAIT + '" stroke-width="3"/>' +
    '<path d="M12 46c-2-8 4-14 8-16-6-6-4-14 2-16 4 6 12 8 18 4 4 6 10 8 14 6-2 8-6 12-10 14 4 4 6 10 4 14z" fill="#e8501e" stroke="' + TRAIT + '" stroke-width="3"/>' +
    '<path d="M32 60c-12 0-19-9-19-20S20 20 32 20s19 9 19 20-7 20-19 20z" fill="#fdf3ee" stroke="' + TRAIT + '" stroke-width="4"/>' +
    '<path d="M24 30l4 6M40 30l-4 6" stroke="#c22f52" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="25" cy="38" r="3" fill="' + TRAIT + '"/><circle cx="39" cy="38" r="3" fill="' + TRAIT + '"/>' +
    '<circle cx="32" cy="44" r="4" fill="#e0002b" stroke="' + TRAIT + '" stroke-width="2.5"/>' +
    '<path d="M20 46q12 14 24 0" fill="none" stroke="#c22f52" stroke-width="3.5" stroke-linecap="round"/>'
  ),

  /* Le grand type sans visage, en costume. */
  grandType: creature(
    '<path d="M18 40c-6-4-10-14-8-22 4 4 8 6 10 10M46 40c6-4 10-14 8-22-4 4-8 6-10 10" fill="none" stroke="' + TRAIT + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M32 64V30" stroke="' + TRAIT + '" stroke-width="3"/>' +
    '<path d="M22 64V40c0-6 4-10 10-10s10 4 10 10v24z" fill="#1b1b22" stroke="' + TRAIT + '" stroke-width="3.5"/>' +
    '<path d="M32 30l-5 10 5 6 5-6z" fill="#fff"/>' +
    '<ellipse cx="32" cy="18" rx="11" ry="14" fill="#f2f2f2" stroke="' + TRAIT + '" stroke-width="3.5"/>'
  ),

  /* Toto, le perroquet : il répète tout, y compris ce qu'il ne faut pas. */
  toto: creature(
    '<path d="M22 60l-6 4M42 60l6 4" stroke="' + TRAIT + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M44 40c8 6 12 16 10 22-6 0-12-6-15-13z" fill="#2f6f8f" stroke="' + TRAIT + '" stroke-width="3.5"/>' +
    '<path d="M32 60c-11 0-18-8-18-19s7-19 18-19 18 8 18 19-7 19-18 19z" fill="#3faa5a" stroke="' + TRAIT + '" stroke-width="4"/>' +
    '<path d="M26 30c-6 4-9 12-7 20 4 1 8-3 10-8z" fill="#c6ff4d" stroke="' + TRAIT + '" stroke-width="3"/>' +
    '<circle cx="32" cy="20" r="13" fill="#ffd84d" stroke="' + TRAIT + '" stroke-width="4"/>' +
    '<path d="M24 8c-2-5 2-8 5-6M32 5c0-5 5-6 7-3M40 9c3-4 7-2 7 2" fill="none" stroke="#e0002b" stroke-width="3.5" stroke-linecap="round"/>' +
    '<circle cx="28" cy="19" r="3" fill="' + TRAIT + '"/>' +
    '<circle cx="29" cy="18" r="1" fill="#fff"/>' +
    '<path d="M38 16c6 1 8 5 6 9-3 4-7 3-8-1z" fill="#e8501e" stroke="' + TRAIT + '" stroke-width="3" stroke-linejoin="round"/>'
  ),

  pizza: creature(
    '<path d="M32 6l26 46H6z" fill="#f0c14b" stroke="' + TRAIT + '" stroke-width="4"/>' +
    '<path d="M32 14l20 34H12z" fill="#e8a33a" stroke="none"/>' +
    '<circle cx="32" cy="30" r="5" fill="#c22f52" stroke="' + TRAIT + '" stroke-width="2.5"/>' +
    '<circle cx="22" cy="42" r="4.5" fill="#c22f52" stroke="' + TRAIT + '" stroke-width="2.5"/>' +
    '<circle cx="42" cy="42" r="4.5" fill="#c22f52" stroke="' + TRAIT + '" stroke-width="2.5"/>'
  ),
};

/* Les amis d'Elias, dessinés avec la fabrique commune : ils gardent le look
   qu'ils ont dans leur propre jeu. */
const AMIS = {
  drew: persoSVG({
    peau: "#f8dcc0", cheveux: "long", couleurCheveux: "#8a5a2b",
    haut: "#aa6caa", bas: "#3a2b4e", bouche: "sourire", regard: "face",
  }),
  eoghan: persoSVG({
    peau: "#f0c39a", cheveux: "boucle", couleurCheveux: "#c98a3a",
    haut: "#00b32d", bas: "#2f3550", bouche: "sourire-large", regard: "face",
  }),
  glinda: persoSVG({
    peau: "#f8dcc0", cheveux: "queue", couleurCheveux: "#e8b84b",
    haut: "#16255c", bas: "#16255c", jupe: "#ffffff", pompons: "#ffffff",
    accessoire: "noeud", couleurAccessoire: "#16255c", bouche: "sourire-large",
  }),
};

/* --- À taper : tout ce qui est (peut-être) une vraie menace ------------- */
const CIBLES = [
  { id: "gris", dossier: "creatures", svg: DESSINS.gris, nom: "Petit gris générique", points: 100,
    replique: "Un petit gris. J'AI DES PREUVES maintenant.",
    repliques: [
      "Encore un gris.",
      "Celui-là avait mon adresse.",
    ] },
  { id: "ovni", dossier: "creatures", svg: DESSINS.ovni, nom: "Ovni de tourisme", points: 120,
    replique: "L'ovni est reparti.",
    repliques: [
      "Une soucoupe. En 2026. Ils ne se cachent même plus.",
      "Il clignotait en morse.",
    ] },
  { id: "silhouette", dossier: "creatures", svg: DESSINS.silhouette, nom: "Silhouette floue dans les bois", points: 100,
    replique: "La chose des bois.",
    repliques: [
      "Elle était floue même de près.",
      "Les arbres bougeaient pas. Elle, si.",
    ] },
  { id: "oeil", dossier: "creatures", svg: DESSINS.oeil, nom: "Œil géant dans le ciel", points: 150,
    replique: "L'œil m'a vu.",
    repliques: [
      "Il a cligné. UN ŒIL DE CIEL QUI CLIGNE.",
      "Je lui ai rendu son regard.",
    ] },
  { id: "chevre", dossier: "creatures", svg: DESSINS.chevre, nom: "Chèvre suspecte", points: 130,
    replique: "Cette chèvre me suit depuis mardi.",
    repliques: [
      "Une chèvre avec des pupilles pareilles, non merci.",
      "Elle connaissait mon prénom. Une chèvre.",
    ] },
  { id: "ombre", dossier: "creatures", svg: DESSINS.ombre, nom: "Ombre humanoïde du couloir", points: 110,
    replique: "L'ombre du couloir. Réglé.",
    repliques: [
      "Elle n'avait pas de source lumineuse. AUCUNE.",
      "Trois semaines qu'elle traînait devant ma porte.",
    ] },
  { id: "pennywise", dossier: "creatures", svg: DESSINS.clown, nom: "Pennywise", points: 200,
    replique: "PENNYWISE. Je rentre plus à pied.",
    repliques: [
      "Le clown. LE clown.",
      "Il m'a proposé un ballon.",
    ] },
  { id: "slenderman", dossier: "creatures", svg: DESSINS.grandType, nom: "Slenderman", points: 180,
    replique: "Slenderman. Huit pages, mon œil.",
    repliques: [
      "Pas de visage, costume impeccable.",
      "Il mesure quatre mètres et personne ne dit rien.",
    ] },
];

/* --- À NE PAS taper : ses proches et sa vie quotidienne ----------------- */
const PIEGES = [
  { id: "toto", dossier: "creatures", svg: DESSINS.toto, nom: "Toto, le perroquet d'Elias",
    replique: "…c'était Toto. Et il va le répéter à tout le monde.",
    repliques: [
      "Toto ! Il criait « DERRIÈRE TOI », aussi.",
      "Mon propre perroquet.",
    ] },
  { id: "mamie", dossier: "personnages", svg: persoSVG({
      peau: "#f0c39a", cheveux: "boucle", couleurCheveux: "#d8d2c4",
      haut: "#b3477a", bas: "#6b4a8a", accessoire: "lunettes", bouche: "sourire",
    }), nom: "Sa grand-mère",
    replique: "Non. Non non non. J'ai tapé mamie.",
    repliques: [
      "Elle m'apportait de la soupe. DE LA SOUPE.",
      "Mamie. Devant témoins.",
    ] },
  { id: "pizza", dossier: "objets", svg: DESSINS.pizza, nom: "Une pizza",
    replique: "J'ai tapé une pizza.",
    repliques: [
      "C'était mon dîner.",
      "Une quatre fromages. Je m'en voudrai longtemps.",
    ] },
  { id: "drew", dossier: "personnages", svg: AMIS.drew, nom: "Drew",
    replique: "Pardon Drew. Je croyais que c'était ta veste, le monstre.",
    repliques: [
      "Drew ! Bon, avec cette tenue…",
      "Désolé Drew.",
    ] },
  { id: "eoghan", dossier: "personnages", svg: AMIS.eoghan, nom: "Eoghan",
    replique: "Eoghan ! Arrête de surgir des trous, aussi.",
    repliques: [
      "Qu'est-ce qu'il fait dans un trou, lui, franchement.",
      "Eoghan. Encore.",
    ] },
  { id: "glinda", dossier: "personnages", svg: AMIS.glinda, nom: "Glinda",
    replique: "J'ai tapé Glinda. Je suis un homme mort.",
    repliques: [
      "Toute l'école le saura avant midi.",
      "Elle a souri.",
    ] },
];

/* Phrases de fin — c'est Elias qui raconte sa soirée. */
const FINS_PANIQUE = [
  "J'ai rédigé un thread Reddit de 4000 mots. Personne ne l'a lu.",
  "J'ai scotché du papier alu sur toutes les fenêtres.",
  "J'ai appelé trois personnes à 4 h du matin.",
];

const FINS_CALME = [
  "J'ai tout noté dans mon carnet.",
  "Je gère très bien.",
  "J'ai dormi cinq heures d'affilée. Un record.",
];

/* Ce qu'Elias se dit selon son palier de sanity. */
const AMBIANCES = [
  "Tout va bien.",
  "J'entends un bruit dans le couloir.",
  "L'écran tremble. Moi aussi.",
  "PLUS RIEN N'EST NORMAL 📡",
];

/* Le mot collé au chiffre de la jauge : « 62 % » ne dit rien tout seul. */
const ETATS_SANITY = ["ça va", "nerveux", "ça déraille", "au bout"];

/* Une créature est repartie sans qu'il la touche. */
const RATES = [
  "Elle est repartie.",
  "Trop lent. Elle sait où j'habite, maintenant.",
  "Elle a replongé.",
  "Manquée.",
  "Elle m'a regardé partir.",
];

/* Il a tapé dans un trou vide. */
const VIDES = [
  "Il n'y avait rien. Je note quand même l'heure.",
  "Rien. Il y avait quelque chose il y a une seconde.",
  "Un trou vide, ça n'existe pas.",
  "J'ai tapé par précaution.",
];

/* Passage de vague, tour à tour. `{n}` est remplacé par le numéro. */
const MONTEES = [
  "Vague {n}. Ça s'accélère.",
  "Vague {n}. Ils se relaient, c'est organisé.",
  "Vague {n}. Quelqu'un leur a donné le signal.",
  "Vague {n}. Je tiens.",
];

/* Les vagues qui changent une règle méritent qu'on prévienne le joueur :
   c'est le seul moment où le jeu annonce un nouveau levier de difficulté. */
const ALERTES_VAGUE = {
  6: "Vague 6. L'image commence à sauter. Ce n'est pas ma télé.",
  9: "Vague 9. Ils sortent à DEUX maintenant.",
  11: "Vague 11. Je n'ai plus assez d'yeux pour douze trous.",
  15: "Vague 15. Trois d'un coup.",
  20: "Vague 20. Je crois qu'ils font ça pour m'user.",
};
