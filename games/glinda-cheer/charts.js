/* =========================================================
   Pep Rally Rhythm — les chorégraphies (charts)
   ---------------------------------------------------------
   Une chart = un tempo + une liste de notes { temps_ms, touche }.
   Les notes sont écrites en MOTIFS lisibles plutôt qu'une à une :
   une chaîne = une mesure, un caractère = une croche.

     < ^ > v  = une note sur la touche correspondante
     .        = silence
     |        = séparateur décoratif, ignoré

   Ajouter une chorégraphie = ajouter une entrée dans CHARTS.
   Aucun autre fichier à toucher.
   ========================================================= */

const TOUCHES = ["gauche", "haut", "droite", "bas"];

const SYMBOLES = {
  "<": "gauche",
  "^": "haut",
  ">": "droite",
  v: "bas",
};

/**
 * Déplie des motifs en liste de notes.
 * @param {number} bpm  tempo
 * @param {number} parPas  nombre de pas par temps (2 = croches)
 * @param {string[]} motifs  une chaîne par mesure
 * @param {number} départMs  décalage avant la première note
 */
function deplie(bpm, parPas, motifs, departMs) {
  const pasMs = 60000 / bpm / parPas;
  const notes = [];
  let index = 0;

  motifs.join("").split("").forEach((c) => {
    if (c === "|" || c === " ") return; // décoratif
    if (SYMBOLES[c]) {
      notes.push({ temps_ms: Math.round(departMs + index * pasMs), touche: SYMBOLES[c] });
    }
    index++;
  });

  return notes;
}

/* Trois chorégraphies de difficulté croissante. Le compte à rebours d'entrée
   (DEPART_MS) laisse le temps aux premières notes de descendre à l'écran. */
const DEPART_MS = 2600;

const CHARTS = [
  {
    id: "echauffement",
    nom: "Échauffement",
    difficulte: "Facile",
    etoiles: "★",
    bpm: 100,
    parPas: 2,
    resume: "Deux temps pour respirer entre chaque pompon.",
    motifs: [
      "<...^...", ">...v...", "<...>...", "^...^...",
      "<..^..>.", "v...v...", "<.>.^.v.", "^...^...",
      "<...^...", ">...v...", "<.<.>.>.", "^...v...",
      "<..^..>.", "v.v.^.^.", "<.>.<.>.", "^......."
    ],
  },
  {
    id: "mi-temps",
    nom: "Show de mi-temps",
    difficulte: "Moyen",
    etoiles: "★★",
    bpm: 124,
    parPas: 2,
    resume: "Le rythme se resserre, la foule commence à y croire.",
    motifs: [
      "<.^.>.v.", "<.<.^.^.", ">.v.>.v.", "^.^.<.>.",
      "<^>v<^>v", "..v..^..", "<.>.<.>.", "^.v.^.v.",
      "<^..>v..", "<.^.>.v.", "^^..vv..", "<.>.^.v.",
      "<^>v.^.v", "<.<.>.>.", "^v^v<.>.", "<^>v...."
    ],
  },
  {
    id: "finale",
    nom: "Finale du championnat",
    difficulte: "Difficile",
    etoiles: "★★★",
    bpm: 148,
    parPas: 4,
    resume: "Plus personne ne respire. Surtout pas toi.",
    motifs: [
      "<.^.>.v.<.^.>.v.", "<<..^^..>>..vv..",
      "<^>v<^>v<^>v<^>v", "^.^.v.v.<.<.>.>.",
      "<.>.<.>.^^^^vvvv", "<^..v>..<^..v>..",
      "<<>><<>>^^vv^^vv", "<.^.>.v.<^>v<^>v",
      "^v^v^v^v<><><><>", "<^>v..v^<^>v..v^",
      "<<^^>>vv<<^^>>vv", "<.>.^.v.<^>v<^>v",
      "<^>v<^>v^^vv<<>>", "<.<.>.>.^.^.v.v.",
      "<^>v<^>v<^>v<^>v", "<...^...>...v..."
    ],
  },
].map((chart) => ({
  ...chart,
  notes: deplie(chart.bpm, chart.parPas, chart.motifs, DEPART_MS),
}));
