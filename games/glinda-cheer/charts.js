/* =========================================================
   Pep Rally Rhythm — les chorégraphies (charts)
   ---------------------------------------------------------
   Une chart = un tempo + une liste de notes { temps_ms, touche }.
   Les notes sont écrites en MOTIFS lisibles plutôt qu'une à une :
   une chaîne = une mesure, un caractère = un pas de la grille.

     < ^ > v  = une note sur la touche correspondante
     .        = silence
     (<^)     = les deux pompons sur le MÊME pas (voir plus bas)
     |        = séparateur décoratif, ignoré

   `parPas` dit combien de pas tient un temps : 2 = croches, 4 = doubles.
   Écrire en doubles ne veut pas dire jouer deux fois plus vite — ça donne
   une grille assez fine pour poser des notes À CÔTÉ du temps. C'est ce qui
   sépare une chorégraphie d'un métronome : une suite régulière de croches
   s'apprend en deux mesures, un contretemps s'écoute.

   Ajouter une chorégraphie = ajouter une entrée dans CHARTS.
   Aucun autre fichier à toucher.

   ---------------------------------------------------------
   RÈGLES D'ÉQUILIBRAGE — elles viennent d'un bug, pas d'une intuition
   ---------------------------------------------------------
   1. Jamais moins de 200 ms entre deux instants de jeu. En dessous, la main
      ne suit plus : la finale était tombée à 101 ms et personne ne la
      terminait.
   2. Quatre notes d'affilée au maximum près de ce plancher, suivies d'une
      respiration d'au moins 400 ms. Sans ça on écrit des suites que seul un
      robot enchaîne.
   3. Deux pompons à la fois au maximum, et jamais au milieu d'une rafale :
      340 ms de silence de chaque côté d'un groupe, le temps de rouvrir
      les doigts.

   Conséquence à connaître avant de « corser » quoi que ce soit : 4 notes
   suivies de 2 pas de repos, c'est 3,33 notes/seconde, et c'est le PLAFOND
   absolu de la règle 2. Une chart plus dense que ça est forcément hors
   règle — l'ancienne finale était à 3,35 n/s, et elle y arrivait avec des
   rafales de 6 et de 8. Elle est redescendue à 3,0.

   Une chart ne devient donc pas plus dure en accélérant, mais en devenant
   moins prévisible : contretemps, phrases impaires, pompons ensemble.
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
 * @param {number} parPas  nombre de pas par temps (2 = croches, 4 = doubles)
 * @param {string[]} motifs  une chaîne par mesure
 * @param {number} departMs  décalage avant la première note
 */
function deplie(bpm, parPas, motifs, departMs) {
  const pasMs = 60000 / bpm / parPas;
  const source = motifs.join("");
  const notes = [];
  let index = 0;

  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === "|" || c === " ") continue; // décoratif

    /* Un groupe entre parenthèses tient sur UN seul pas : c'est le geste
       « les deux pompons en même temps », pas deux notes qui se suivent. */
    if (c === "(") {
      const fin = source.indexOf(")", i);
      for (const d of source.slice(i + 1, fin === -1 ? source.length : fin)) {
        if (SYMBOLES[d]) {
          notes.push({ temps_ms: Math.round(departMs + index * pasMs), touche: SYMBOLES[d] });
        }
      }
      i = fin === -1 ? source.length : fin;
      index++;
      continue;
    }

    if (SYMBOLES[c]) {
      notes.push({ temps_ms: Math.round(departMs + index * pasMs), touche: SYMBOLES[c] });
    }
    index++;
  }

  return notes.sort((a, b) => a.temps_ms - b.temps_ms);
}

/* Le compte à rebours d'entrée laisse le temps aux premières notes de
   descendre à l'écran. */
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
    /* Grille à 300 ms : on ne peut rien jouer de trop serré, même en
       collant deux notes. La chart sert à installer le motif maison
       « <^>v » — la vague d'Augusta — qu'on retrouvera partout ailleurs. */
    motifs: [
      "<...^...", ">..v..^.",   // l'appel
      "<..^..>.", "v...^...",   // la réponse
      "<.^.>.v.", "^...^...",   // la vague, au ralenti
      "v.v.^...", "^...^...",   // l'écho
      "<...>...", "^...v...",   // on repart de zéro
      "<.<.>.>.", "^..v..^.",   // par paires
      "<^>v....", "..^.....",   // la vague pleine vitesse, puis on souffle
      "<..^..>.", "v...^..."    // la sortie
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
    /* Grille à 242 ms : deux notes voisines sont déjà « rapides » au sens
       de la règle 2, donc toute rafale est comptée. Les mesures alternent
       trois figures — le temps fort, la vague, et le contretemps (une note
       posée sur le silence) — pour qu'aucune phrase ne se devine. */
    motifs: [
      "<...^.>.", ">.v.^...",   // les temps forts : on pose le tempo
      "<.^.>.v.", "^...v.^.",   // la marche en croches
      "<^>v....", "^.v.<.>.",   // la vague pleine, puis on souffle
      ".^..>.<v", "<.>.^.v.",   // contretemps : plus rien sur le temps fort
      "<.<.>.>.", "^...v.^.",   // par paires
      "<^>v..v.", "^..<>..^",   // la vague suivie d'une note isolée
      ">.v.>.v.", "^.^.<.v.",   // figures asymétriques
      "<^>v..^.", "v..<^>v."    // la vague enjambe la dernière mesure
    ],
  },
  {
    id: "finale",
    nom: "Finale du championnat",
    difficulte: "Difficile",
    etoiles: "★★★",
    bpm: 150,
    parPas: 2,
    resume: "Des rafales de quatre, et jamais deux au même endroit.",
    /* Grille à 200 ms : c'est EXACTEMENT le plancher jouable, donc chaque
       note voisine compte dans la rafale. D'où la forme de toutes les
       mesures : au plus quatre notes collées, puis deux pas de silence.
       L'ancienne version tenait 3,35 n/s avec des rafales de 6 et de 8 —
       c'est ce qui la rendait impossible, pas son tempo. */
    motifs: [
      "<^>v..<^", ">v..^.>v",   // la vague, puis une rafale à cheval sur la mesure
      "<<.^>>..", "^.v.^<^.",   // paires, trio
      "<^>v..v.", "^..<^>v.",   // vague / respiration / vague décalée
      ".^.v.^<>", "v.v^..<.",   // contretemps : les rafales tombent après le temps
      "<^>v..^.", "v.^<>...",   // retour au motif maison
      "<<>>..vv", "v.^^..<.",   // doublons : la main reste sur place
      ">v^<..>.", "v.v^<>..",   // la vague à l'envers
      "<^>v..<.", "^.v.^..."    // dernière vague, puis on lâche
    ],
  },
  {
    id: "encore",
    nom: "Encore ! Encore !",
    difficulte: "Expert",
    etoiles: "★★★★",
    bpm: 132,
    parPas: 4,
    verrou: "finale",
    verrouTexte: "Termine la Finale du championnat pour débloquer le rappel.",
    resume: "Les deux pompons à la fois, et plus rien sur le temps.",
    /* Le rappel ne peut PAS être plus dense que la finale : 3,33 n/s est le
       plafond de la règle des rafales. Il est donc plus dur autrement —
       grille en doubles croches (114 ms) pour poser les notes à côté du
       temps, et des `(<^)` qui demandent les deux mains d'un coup. Chaque
       groupe est isolé par au moins 341 ms (trois doubles) de chaque côté :
       on a le temps de rouvrir les doigts. */
    motifs: [
      "(<^)...>...v...<.^.", "<..^..>..v..^...",
      "<.^.>.v...^..(>v)..", "^..<...>..v...^.",
      "..<.^.>.v...^.v.", ".(<v)...^..>..v..<.",
      ">..v..<..^..v...", "<.^.>.v...<...(^v).",
      "..^.v...<..>..v.", "...<.^.>.v...^..",
      "(<>)...^..v..^..<..", ">.v.<.^...>.v...",
      "...<..^..>..v..(<^)", "....^...<.^.>...",
      "<.^.>.v...^..v..", "(^v)...<...>......."
    ],
  },
].map((chart) => ({
  ...chart,
  notes: deplie(chart.bpm, chart.parPas, chart.motifs, DEPART_MS),
}));

/* La durée sert à la jauge de progression et au chrono du panneau : elle se
   déduit de la dernière note, jamais écrite à la main (sinon elle ment dès
   qu'on retouche une mesure). */
CHARTS.forEach((chart) => {
  chart.duree_ms = chart.notes[chart.notes.length - 1].temps_ms;
});
