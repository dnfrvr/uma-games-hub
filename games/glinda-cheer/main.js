/* =========================================================
   Pep Rally Rhythm — moteur de jeu
   ---------------------------------------------------------
   Boucle unique en requestAnimationFrame : à chaque frame on repositionne
   les notes en fonction du temps écoulé depuis le début de la chart.
   Le temps de référence est celui de performance.now(), jamais un compteur
   de frames — sinon un écran à 144 Hz jouerait la chorégraphie 2× trop vite.
   ========================================================= */

/* --- Réglages de jugement (en millisecondes d'écart avec la note) -------
   FENETRE_BIEN est passée de 135 à 140 ms et FENETRE_RATE de 190 à 200 :
   entre les deux se trouvaient les appuis manifestement intentionnels mais
   punis comme une absence de geste. Un jeu de rythme doit dire « tu as
   appuyé trop tard », pas « tu n'as rien fait ». */
const FENETRE_PARFAIT = 60;
const FENETRE_BIEN = 140;
const FENETRE_RATE = 200; // au-delà, la note est comptée ratée toute seule

/* En deçà de cet écart, inutile de signaler l'avance ou le retard : le
   joueur est dans le mille et un conseil permanent devient du bruit. */
const PRESQUE_MS = 25;

const CHUTE_MS = 1900; // temps que met une note pour traverser la piste

const POINTS = { parfait: 300, bien: 150 };
const HYPE = { parfait: 4.5, bien: 2, rate: -8 };

/* Paliers de hype : la foule change de comportement à chaque seuil. */
const PALIERS = [
  { min: 0, classe: "hype-0", texte: "La foule regarde son téléphone." },
  { min: 25, classe: "hype-1", texte: "Quelques têtes se lèvent…" },
  { min: 55, classe: "hype-2", texte: "Ça commence à bouger dans les tribunes !" },
  { min: 80, classe: "hype-3", texte: "LA FOULE EST EN DÉLIRE 🔥" },
];

/* Crans de combo. Les trois premiers suivent le multiplicateur (×2, ×3, ×4) :
   la foule annonce donc quelque chose qui change vraiment le score, pas une
   décoration. Les suivants ne servent qu'à la gloire. */
const CRANS_COMBO = [
  { combo: 10, cri: "COMBO ×2 !" },
  { combo: 20, cri: "COMBO ×3 !" },
  { combo: 30, cri: "COMBO ×4 — LE MAXIMUM !" },
  { combo: 50, cri: "CINQUANTE D'AFFILÉE !" },
  { combo: 75, cri: "LA TRIBUNE EST DEBOUT" },
  { combo: 100, cri: "CENT. SANS EN RATER UNE." },
];

const RANGS = [
  { min: 92, texte: "Spirit level : LÉGENDAIRE 🏆" },
  { min: 75, texte: "Spirit level : la fac en parle encore 📣" },
  { min: 50, texte: "Spirit level : correct, mais Glinda a vu mieux." },
  { min: 25, texte: "Spirit level : deux personnes ont applaudi. Par politesse." },
  { min: 0, texte: "Spirit level : sieste générale 😴" },
];

/* La note finale ne récompense PAS la hype (qui remonte toute seule si on
   joue longtemps) mais la précision : un parfait vaut un point, un « bien »
   la moitié, un raté rien. C'est la seule mesure qu'on peut battre en
   rejouant la même chorégraphie. */
const MENTIONS = [
  { min: 0.98, lettre: "S", texte: "Chorégraphie irréprochable." },
  { min: 0.9, lettre: "A", texte: "Glinda t'a repérée." },
  { min: 0.8, lettre: "B", texte: "Solide. Encore un passage." },
  { min: 0.65, lettre: "C", texte: "Ça tient debout." },
  { min: 0.4, lettre: "D", texte: "On va refaire l'échauffement." },
  { min: 0, lettre: "E", texte: "Le pompon est à l'envers." },
];

/* --- État de la partie -------------------------------------------------- */
const etat = {
  chart: null,
  notes: [],        // { temps_ms, touche, el, jouee }
  debut: 0,
  enCours: false,
  score: 0,
  combo: 0,
  meilleurCombo: 0,
  cranCombo: -1,
  hype: 20,
  stats: { parfait: 0, bien: 0, rate: 0 },
  palier: -1,
  pointsAugusta: 21,
  son: true,
};

const $ = (id) => document.getElementById(id);

const elements = {
  piste: $("piste"),
  couloirs: $("couloirs"),
  jugement: $("jugement"),
  cri: $("cri"),
  avancement: $("avancement"),
  score: $("score"),
  combo: $("combo"),
  hypeBarre: $("hype-barre"),
  hypeTexte: $("hype-texte"),
  foule: $("foule"),
  confettis: $("confettis"),
  glinda: $("glinda"),
  copine: $("copine"),
  tableauAugusta: $("tableau-augusta"),
  tableauChrono: $("tableau-chrono"),
  ecran: $("ecran"),
  ecranTitre: $("ecran-titre"),
  ecranTexte: $("ecran-texte"),
  ecranCharts: $("ecran-charts"),
  ecranBilan: $("ecran-bilan"),
  rejouer: $("btn-rejouer"),
  stats: {
    parfait: $("stat-parfait"),
    bien: $("stat-bien"),
    rate: $("stat-rate"),
    precision: $("stat-precision"),
  },
};

/* Un couloir par touche : c'est aussi la zone tactile pour jouer au doigt. */
const couloirs = {};

const CLAVIER = {
  ArrowLeft: "gauche",
  ArrowUp: "haut",
  ArrowRight: "droite",
  ArrowDown: "bas",
  q: "gauche",
  z: "haut",
  d: "droite",
  s: "bas",
};

const DECOR_TOUCHES = {
  gauche: { fleche: "◀", pompon: "🎀", libelle: "Gauche" },
  haut: { fleche: "▲", pompon: "🌟", libelle: "Haut" },
  droite: { fleche: "▶", pompon: "🎀", libelle: "Droite" },
  bas: { fleche: "▼", pompon: "🌟", libelle: "Bas" },
};

/* =========================================================
   Les records, en localStorage
   ---------------------------------------------------------
   Sans mémoire, une chorégraphie ne se rejoue que pour elle-même. Avec, le
   menu affiche ce qu'il y a à battre — et c'est aussi ce qui déverrouille
   le rappel. Tout passe par ce petit sas : une page servie depuis un
   fichier local, un navigateur en navigation privée ou le faux DOM des
   bancs d'essai n'ont pas de localStorage, et le jeu doit tourner quand
   même.
   ========================================================= */
const memoire = (function () {
  const CLE = "uma_glinda_records";

  function coffre() {
    try {
      return typeof localStorage === "undefined" ? null : localStorage;
    } catch (e) {
      return null; // stockage refusé par le navigateur
    }
  }

  return {
    tout() {
      const c = coffre();
      if (!c) return {};
      try {
        return JSON.parse(c.getItem(CLE) || "{}") || {};
      } catch (e) {
        return {};
      }
    },
    lit(id) {
      return this.tout()[id] || null;
    },
    /** Range le résultat s'il bat le précédent. Renvoie true si record. */
    range(id, resultat) {
      const tous = this.tout();
      const avant = tous[id];
      const record = !avant || resultat.score > avant.score;
      tous[id] = record ? { ...resultat, termine: true } : { ...avant, termine: true };
      const c = coffre();
      if (c) {
        try {
          c.setItem(CLE, JSON.stringify(tous));
        } catch (e) {
          /* quota plein ou stockage refusé : le jeu continue sans mémoire */
        }
      }
      return record;
    },
  };
})();

/** Une chart verrouillée s'ouvre dès que celle dont elle dépend est finie. */
function estVerrouillee(chart) {
  if (!chart.verrou) return false;
  const prealable = memoire.lit(chart.verrou);
  return !prealable || !prealable.termine;
}

/* =========================================================
   Construction de la scène
   ========================================================= */

function construitCouloirs() {
  TOUCHES.forEach((touche) => {
    const couloir = document.createElement("div");
    couloir.className = "couloir couloir-" + touche;

    const notes = document.createElement("div");
    notes.className = "couloir-notes";

    const cible = document.createElement("button");
    cible.type = "button";
    cible.className = "cible";
    cible.dataset.touche = touche;
    cible.setAttribute("aria-label", DECOR_TOUCHES[touche].libelle);
    cible.innerHTML =
      '<span class="cible-pompon" aria-hidden="true">' + DECOR_TOUCHES[touche].pompon + "</span>" +
      '<span class="cible-fleche" aria-hidden="true">' + DECOR_TOUCHES[touche].fleche + "</span>";

    /* pointerdown plutôt que click : sur mobile, click arrive ~300 ms trop
       tard, ce qui rendrait le jeu injouable au doigt. */
    cible.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      joue(touche);
    });

    couloir.append(notes, cible);
    elements.couloirs.appendChild(couloir);
    couloirs[touche] = { couloir, notes, cible };
  });
}

/* --- La foule des tribunes : de vrais petits spectateurs dessinés --------
   Trois rangs, couleurs de maillot alternées (les couleurs de la fac), et
   un décalage d'animation par personne pour que la tribune ne saute pas
   comme un seul homme. */
const MAILLOTS = ["#e91e8c", "#ffd84d", "#4de0ff", "#9b4dff", "#c6ff4d", "#ff8ac4"];

function construitFoule() {
  for (let rang = 0; rang < 5; rang++) {
    const ligne = document.createElement("div");
    ligne.className = "foule-rang foule-rang-" + rang;

    /* Les rangs du fond comptent plus de monde : la tribune paraît pleine
       jusqu'en haut sans coûter des centaines de personnages. */
    const combien = 30 - rang * 2;
    for (let i = 0; i < combien; i++) {
      const spectateur = document.createElement("span");
      spectateur.className = "spectateur";
      /* Un supporter sur six agite une écharpe, un sur neuf brandit un
         panneau : ça suffit à faire vivre la tribune. */
      const accessoire = i % 6 === 0 ? "echarpe" : i % 9 === 4 ? "panneau" : null;
      spectateur.innerHTML = spectateurSVG(MAILLOTS[(i + rang) % MAILLOTS.length], null, accessoire);
      spectateur.style.animationDelay = (i * 0.11 + rang * 0.19).toFixed(2) + "s";
      ligne.appendChild(spectateur);
    }
    elements.foule.appendChild(ligne);
  }
}

/* --- Glinda ------------------------------------------------------------
   Une seule fabrique : on redessine le personnage quand la pose change.
   Le look reste constant, seule la pose bouge. */
/* Uniforme de la squad d'Augusta : bleu marine et blanc. */
const MARINE = "#16255c";

const GLINDA = {
  id: "glinda",
  peau: "#f8dcc0",
  cheveux: "queue",
  couleurCheveux: "#e8b84b",
  haut: MARINE,
  bas: MARINE,
  jupe: "#ffffff",
  pompons: "#ffffff",
  accessoire: "noeud",
  couleurAccessoire: MARINE,
  bouche: "sourire-large",
};

const POSES_GLINDA = {
  gauche: "pompons-gauche",
  droite: "pompons-droite",
  haut: "pompons-haut",
  bas: "pompons-bas",
  repos: "bras-leves",
};

/* Son camarade de squad, décoratif : blond aux cheveux longs, même uniforme
   d'Augusta. Il suit la même pose que Glinda avec un temps de retard, ce qui
   suffit à faire une chorégraphie à deux. */
const COPINE = {
  id: "camarade",
  peau: "#f6dcc4",
  cheveux: "long",
  couleurCheveux: "#f0d68a",
  haut: MARINE,
  bas: MARINE,
  jupe: "#ffffff",
  pompons: "#ffffff",
  accessoire: "serretete",
  couleurAccessoire: MARINE,
  bouche: "sourire",
};

function dessineGlinda(pose) {
  const nom = POSES_GLINDA[pose] || POSES_GLINDA.repos;
  elements.glinda.innerHTML = persoSVG({ ...GLINDA, pose: nom });
  if (elements.copine) {
    elements.copine.innerHTML = persoSVG({ ...COPINE, pose: nom });
  }
}

/* --- Le menu des chorégraphies -----------------------------------------
   Chaque bouton porte son record : c'est là que se joue l'envie de
   recommencer. Le menu est reconstruit après chaque partie, sinon le
   nouveau record ne s'afficherait qu'au rechargement de la page. */
function construitMenuCharts() {
  elements.ecranCharts.innerHTML = "";
  CHARTS.forEach((chart) => {
    const record = memoire.lit(chart.id);
    const verrouillee = estVerrouillee(chart);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chart-btn" + (verrouillee ? " chart-verrouillee" : "");

    let bas;
    if (verrouillee) {
      bas = '<span class="chart-record">🔒 ' + chart.verrouTexte + "</span>";
    } else if (record) {
      bas =
        '<span class="chart-record">Record : <b>' + record.score + "</b> pts · " +
        '<span class="chart-mention">' + record.mention + "</span> · combo " + record.combo +
        (record.sansFaute ? " · <b>sans faute</b>" : "") + "</span>";
    } else {
      bas = '<span class="chart-record">Jamais jouée.</span>';
    }

    btn.innerHTML =
      '<span class="chart-nom">' + chart.nom + "</span>" +
      '<span class="chart-etoiles">' + chart.etoiles + "</span>" +
      '<span class="chart-detail">' + chart.difficulte + " · " + chart.bpm + " BPM · " +
      chart.notes.length + " notes</span>" +
      '<span class="chart-resume">' + chart.resume + "</span>" +
      bas;

    if (verrouillee) {
      btn.disabled = true;
      btn.setAttribute("aria-disabled", "true");
    } else {
      btn.addEventListener("click", () => demarre(chart));
    }
    elements.ecranCharts.appendChild(btn);
  });
}

/* =========================================================
   Déroulement d'une partie
   ========================================================= */

function demarre(chart) {
  etat.chart = chart;
  etat.notes = chart.notes.map((note) => ({ ...note, el: null, jouee: false }));
  etat.score = 0;
  etat.combo = 0;
  etat.meilleurCombo = 0;
  etat.cranCombo = -1;
  etat.hype = 20;
  etat.stats = { parfait: 0, bien: 0, rate: 0 };
  etat.palier = -1;
  etat.pointsAugusta = 21;
  etat.enCours = true;

  Object.values(couloirs).forEach((c) => (c.notes.innerHTML = ""));
  elements.ecran.classList.remove("visible");
  elements.jugement.textContent = "";
  elements.cri.textContent = "";
  majTableau();
  majPanneau(0);
  majHype(0);

  audio.reprend();
  audio.rythme(chart.bpm, () => etat.enCours);

  etat.debut = performance.now();
  decompte();
  requestAnimationFrame(boucle);
}

/* Décompte avant la première note : on cale les paliers sur DEPART_MS pour
   que le « GO ! » tombe pile quand la chorégraphie commence. */
function decompte() {
  const etapes = [
    { a: 0, texte: "3" },
    { a: DEPART_MS * 0.28, texte: "2" },
    { a: DEPART_MS * 0.56, texte: "1" },
    { a: DEPART_MS * 0.84, texte: "GO !" },
  ];
  etapes.forEach((e) => {
    setTimeout(() => {
      if (etat.enCours) affiche(e.texte, "decompte");
    }, e.a);
  });
}

function arrete(termine) {
  if (!etat.enCours) return;
  etat.enCours = false;
  audio.stop();

  const total = etat.stats.parfait + etat.stats.bien + etat.stats.rate;
  const rang = RANGS.find((r) => etat.hype >= r.min);
  const precision = total ? (etat.stats.parfait + etat.stats.bien * 0.5) / total : 0;
  const mention = MENTIONS.find((m) => precision >= m.min);
  const sansFaute = termine && etat.stats.rate === 0 && total > 0;

  /* On ne garde un résultat que si la chorégraphie est allée au bout :
     sinon il suffirait d'abandonner après trois parfaits pour « débloquer »
     le rappel et pour truquer le record. */
  let nouveauRecord = false;
  if (termine) {
    nouveauRecord = memoire.range(etat.chart.id, {
      score: etat.score,
      combo: etat.meilleurCombo,
      mention: mention.lettre,
      precision: Math.round(precision * 100),
      sansFaute,
    });
  }

  elements.ecranTitre.textContent = termine ? "Chorégraphie terminée !" : "Chorégraphie abandonnée";
  elements.ecranTexte.textContent = rang.texte;

  const ancien = memoire.lit(etat.chart.id);
  elements.ecranBilan.innerHTML =
    '<div class="bilan-mention mention-' + mention.lettre + '">' +
      '<b class="bilan-lettre">' + mention.lettre + "</b>" +
      '<span class="bilan-phrase">' + mention.texte + "</span>" +
    "</div>" +
    '<div class="bilan-chiffres">' +
      "<span>Score <b>" + etat.score + "</b></span>" +
      "<span>Précision <b>" + Math.round(precision * 100) + " %</b></span>" +
      "<span>Meilleur combo <b>" + etat.meilleurCombo + "</b></span>" +
      "<span>Parfaits <b>" + etat.stats.parfait + " / " + total + "</b></span>" +
    "</div>" +
    (sansFaute ? '<p class="bilan-exploit">SANS FAUTE — pas une note au sol.</p>' : "") +
    (nouveauRecord
      ? '<p class="bilan-exploit">NOUVEAU RECORD !</p>'
      : ancien && termine
      ? '<p class="bilan-note">Ton record tient bon : ' + ancien.score + " pts.</p>"
      : "");

  elements.rejouer.hidden = false;
  construitMenuCharts(); // le record et le verrou viennent peut-être de changer
  elements.ecran.classList.add("visible");
}

function boucle(maintenant) {
  if (!etat.enCours) return;

  const t = maintenant - etat.debut;
  let restantes = 0;

  etat.notes.forEach((note) => {
    if (note.jouee) return;
    restantes++;

    const avant = note.temps_ms - t;

    /* La note n'entre à l'écran qu'au dernier moment : inutile de garder
       200 <div> en vie pendant toute la chorégraphie. */
    if (avant <= CHUTE_MS && !note.el) {
      const el = document.createElement("span");
      el.className = "note note-" + note.touche;
      el.textContent = DECOR_TOUCHES[note.touche].fleche;
      couloirs[note.touche].notes.appendChild(el);
      note.el = el;
    }

    if (note.el) {
      /* 0 = tout en haut du couloir, 1 = centrée sur la ligne de jugement.
         On positionne en `top` (pourcentage du couloir) et pas en transform :
         un translate en % se calcule sur la taille de la note, pas sur la
         course à parcourir. */
      const progression = 1 - avant / CHUTE_MS;
      note.el.style.top = (progression * 100).toFixed(2) + "%";
      note.el.style.opacity = progression < 0 ? "0" : "1";
    }

    if (avant < -FENETRE_RATE) {
      manque(note, true);
      restantes--;
    }
  });

  majPanneau(t);

  if (restantes === 0 && t > CHUTE_MS) {
    arrete(true);
    return;
  }

  requestAnimationFrame(boucle);
}

/* =========================================================
   Jugement
   ========================================================= */

function joue(touche) {
  const cible = couloirs[touche].cible;
  cible.classList.remove("frappe");
  void cible.offsetWidth; // relance l'animation même en appuis rapprochés
  cible.classList.add("frappe");
  poseGlinda(touche);

  if (!etat.enCours) return;

  const t = performance.now() - etat.debut;

  /* On juge la note la plus proche de l'instant présent dans ce couloir. */
  let candidate = null;
  let ecart = Infinity;
  etat.notes.forEach((note) => {
    if (note.jouee || note.touche !== touche) return;
    const d = Math.abs(note.temps_ms - t);
    if (d < ecart) {
      ecart = d;
      candidate = note;
    }
  });

  if (!candidate || ecart > FENETRE_RATE) {
    /* Appui dans le vide : ça casse le combo, mais ça n'enlève pas de points.
       Les crans repartent de zéro avec le combo, sinon on remonte à 10 sans
       que la foule ne réagisse — elle a déjà crié pour ce cran-là. */
    etat.combo = 0;
    etat.cranCombo = -1;
    affiche("À côté !", "rate");
    majTableau();
    return;
  }

  /* Signe du décalage : négatif = on a appuyé avant la note. C'est
     l'information qui manquait le plus — sans elle, un joueur qui joue
     systématiquement 100 ms trop tôt n'a aucun moyen de le savoir. */
  const decalage = t - candidate.temps_ms;

  if (ecart <= FENETRE_PARFAIT) valide(candidate, "parfait", decalage);
  else if (ecart <= FENETRE_BIEN) valide(candidate, "bien", decalage);
  else manque(candidate, false);
}

function nuance(decalage) {
  if (Math.abs(decalage) < PRESQUE_MS) return "";
  return decalage < 0 ? " ↑ tôt" : " ↓ tard";
}

function valide(note, qualite, decalage) {
  note.jouee = true;
  if (note.el) {
    note.el.classList.add("touchee");
    const el = note.el;
    setTimeout(() => el.remove(), 220);
  }

  etat.stats[qualite]++;
  etat.combo++;
  etat.meilleurCombo = Math.max(etat.meilleurCombo, etat.combo);
  etat.score += POINTS[qualite] * multiplicateur();
  majHype(HYPE[qualite]);
  eclaireCouloir(note.touche, qualite);
  affiche((qualite === "parfait" ? "PARFAIT !" : "Bien !") + nuance(decalage), qualite);
  /* La hauteur du blip monte avec le combo : l'oreille entend la série
     grandir avant que l'œil ne lise le compteur. */
  audio.blip((qualite === "parfait" ? 880 : 660) + Math.min(etat.combo, 40) * 6);
  verifieCranCombo();
  majTableau();
}

function manque(note, expiree) {
  note.jouee = true;
  if (note.el) {
    note.el.classList.add("ratee");
    const el = note.el;
    setTimeout(() => el.remove(), 220);
  }
  etat.stats.rate++;
  etat.combo = 0;
  etat.cranCombo = -1;
  majHype(HYPE.rate);
  affiche(expiree ? "Raté…" : "Trop loin !", "rate");
  majTableau();
}

/* Multiplicateur de combo : +1 tous les 10 enchaînements, plafonné à ×4
   pour que la fin d'une chart difficile ne double pas tout le score. */
function multiplicateur() {
  return Math.min(4, 1 + Math.floor(etat.combo / 10));
}

/* Un cran de combo franchi = la foule hurle et Augusta marque 7 points au
   panneau. C'est le seul endroit où le décor réagit à la PERFORMANCE et pas
   seulement à la jauge de hype, qui remonte toute seule avec le temps. */
function verifieCranCombo() {
  const cran = CRANS_COMBO.reduce((acc, c, i) => (etat.combo >= c.combo ? i : acc), -1);
  if (cran <= etat.cranCombo) return;

  etat.cranCombo = cran;
  etat.pointsAugusta += 7;
  crie(CRANS_COMBO[cran].cri);
  audio.fanfare();
  if (cran >= 2) lanceConfettis();
}

function affiche(texte, classe) {
  elements.jugement.textContent = texte;
  elements.jugement.className = "jugement " + classe;
  void elements.jugement.offsetWidth;
  elements.jugement.classList.add("pop");
}

/* Le cri de la foule occupe son propre calque : mélangé au jugement, il
   effaçait le « PARFAIT ! » de la note qui venait de le déclencher. */
function crie(texte) {
  elements.cri.textContent = texte;
  elements.cri.classList.remove("pop");
  void elements.cri.offsetWidth;
  elements.cri.classList.add("pop");
}

/* Le couloir s'allume à la frappe : sur une rafale, la note disparaît trop
   vite pour qu'on voie autre chose que le couloir. */
function eclaireCouloir(touche, qualite) {
  const el = couloirs[touche].couloir;
  el.classList.remove("eclat", "eclat-parfait");
  void el.offsetWidth;
  el.classList.add("eclat");
  if (qualite === "parfait") el.classList.add("eclat-parfait");
}

/* Glinda prend la pose de la touche jouée, puis revient au repos : c'est le
   retour visuel qui donne l'impression de danser avec la musique. */
let retourRepos = null;

function poseGlinda(touche) {
  dessineGlinda(touche);
  elements.glinda.classList.remove("bouge");
  void elements.glinda.offsetWidth;
  elements.glinda.classList.add("bouge");

  clearTimeout(retourRepos);
  retourRepos = setTimeout(() => dessineGlinda("repos"), 260);
}

/* =========================================================
   Jauge de hype, panneau d'affichage et tableau de bord
   ========================================================= */

function majHype(delta) {
  etat.hype = Math.max(0, Math.min(100, etat.hype + delta));
  elements.hypeBarre.style.width = etat.hype + "%";

  const palier = PALIERS.reduce((acc, p, i) => (etat.hype >= p.min ? i : acc), 0);
  if (palier === etat.palier) return;

  etat.palier = palier;
  document.body.dataset.hype = palier;
  elements.hypeTexte.textContent = PALIERS[palier].texte;

  if (palier === 3) lanceConfettis();
}

/* Le panneau du stade sert de jauge d'avancement : le chrono du 4e quart
   descend au rythme de la chorégraphie. Sans ça, on joue sans savoir s'il
   reste dix secondes ou une minute. */
let dernierChrono = "";

function majPanneau(t) {
  const duree = (etat.chart && etat.chart.duree_ms) || 1;
  const part = Math.max(0, Math.min(1, t / duree));
  elements.avancement.style.width = (part * 100).toFixed(1) + "%";
  elements.tableauAugusta.textContent = etat.pointsAugusta;

  const restant = Math.max(0, Math.round(134 * (1 - part)));
  const texte = Math.floor(restant / 60) + ":" + String(restant % 60).padStart(2, "0");
  if (texte === dernierChrono) return;
  dernierChrono = texte;
  elements.tableauChrono.textContent = texte;
}

function majTableau() {
  elements.score.textContent = etat.score;
  elements.combo.textContent = "×" + multiplicateur() + (etat.combo ? " (" + etat.combo + ")" : "");
  elements.stats.parfait.textContent = etat.stats.parfait;
  elements.stats.bien.textContent = etat.stats.bien;
  elements.stats.rate.textContent = etat.stats.rate;

  const total = etat.stats.parfait + etat.stats.bien + etat.stats.rate;
  const precision = total ? (etat.stats.parfait + etat.stats.bien * 0.5) / total : 1;
  elements.stats.precision.textContent = Math.round(precision * 100) + " %";
}

function lanceConfettis() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const couleurs = ["#ff3d9a", "#ffd84d", "#4de0ff", "#c6ff4d", "#9b4dff"];
  for (let i = 0; i < 26; i++) {
    const c = document.createElement("span");
    c.className = "confetti";
    c.style.left = Math.random() * 100 + "%";
    c.style.background = couleurs[i % couleurs.length];
    c.style.animationDelay = (Math.random() * 0.6).toFixed(2) + "s";
    elements.confettis.appendChild(c);
    c.addEventListener("animationend", () => c.remove());
  }
}

/* =========================================================
   Son : tout est synthétisé, aucun fichier audio à charger
   ========================================================= */

const audio = (function () {
  let ctx = null;
  let timer = null;
  let bruit = null;

  function contexte() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function ton(frequence, duree, volume, type, retard) {
    if (!etat.son) return;
    const c = contexte();
    const debut = c.currentTime + (retard || 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || "square";
    osc.frequency.value = frequence;
    gain.gain.setValueAtTime(volume, debut);
    gain.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
    osc.connect(gain).connect(c.destination);
    osc.start(debut);
    osc.stop(debut + duree);
  }

  /* Applaudissement : du bruit blanc très court. C'est la seule façon
     d'obtenir une foule avec un oscillateur — un carré, même bruité, sonne
     comme un jouet. La table est fabriquée une fois puis relue. */
  function claque(volume) {
    if (!etat.son) return;
    const c = contexte();
    if (typeof c.createBuffer !== "function") return; // faux DOM des bancs d'essai
    if (!bruit) {
      bruit = c.createBuffer(1, Math.floor(c.sampleRate * 0.12), c.sampleRate);
      const donnees = bruit.getChannelData(0);
      for (let i = 0; i < donnees.length; i++) {
        donnees[i] = (Math.random() * 2 - 1) * (1 - i / donnees.length);
      }
    }
    const source = c.createBufferSource();
    const gain = c.createGain();
    source.buffer = bruit;
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.12);
    source.connect(gain).connect(c.destination);
    source.start();
  }

  return {
    reprend() {
      /* Les navigateurs n'autorisent le son qu'après un geste : on (re)démarre
         le contexte au clic sur une chorégraphie. */
      const c = contexte();
      if (c.state === "suspended") c.resume();
    },
    blip(f) {
      ton(f, 0.09, 0.05, "square");
    },
    /* Petit arpège de victoire quand un cran de combo tombe. */
    fanfare() {
      [0, 0.07, 0.14].forEach((retard, i) => ton(523 * Math.pow(1.26, i), 0.12, 0.05, "triangle", retard));
    },
    /* Métronome : un temps marqué, trois temps discrets. À partir du palier
       de hype 2, la tribune tape dans ses mains avec — c'est ce qui fait
       entendre que la foule est entrée dans le morceau. */
    rythme(bpm, continuer) {
      clearInterval(timer);
      let temps = 0;
      timer = setInterval(() => {
        if (!continuer()) {
          clearInterval(timer);
          return;
        }
        const fort = temps % 4 === 0;
        ton(fort ? 180 : 140, 0.05, fort ? 0.07 : 0.03, "triangle");
        if (etat.palier >= 2 && temps % 2 === 0) claque(etat.palier >= 3 ? 0.09 : 0.05);
        temps++;
      }, 60000 / bpm);
    },
    stop() {
      clearInterval(timer);
    },
  };
})();

/* =========================================================
   Entrées clavier et boutons
   ========================================================= */

document.addEventListener("keydown", (ev) => {
  const touche = CLAVIER[ev.key] || CLAVIER[ev.key.toLowerCase()];
  if (!touche) return;
  ev.preventDefault(); // sinon les flèches font défiler la page
  if (ev.repeat) return; // un appui maintenu ne vaut pas dix notes
  joue(touche);
});

$("btn-stop").addEventListener("click", () => arrete(false));

$("btn-son").addEventListener("click", (ev) => {
  etat.son = !etat.son;
  ev.currentTarget.setAttribute("aria-pressed", String(etat.son));
  ev.currentTarget.textContent = etat.son ? "🔊 Son" : "🔇 Son";
});

elements.rejouer.addEventListener("click", () => {
  elements.rejouer.hidden = true;
  elements.ecranBilan.innerHTML = "";
  elements.ecranTitre.textContent = "Choisis ta chorégraphie";
  elements.ecranTexte.textContent =
    "Appuie sur ← ↑ → ↓ (ou tape les pompons) quand la note passe sur la ligne.";
});

/* =========================================================
   Démarrage
   ========================================================= */

construitCouloirs();
construitFoule();
dessineGlinda("repos");
construitMenuCharts();
majTableau();
majHype(0);
elements.ecran.classList.add("visible");
