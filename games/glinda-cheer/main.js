/* =========================================================
   Pep Rally Rhythm — moteur de jeu
   ---------------------------------------------------------
   Boucle unique en requestAnimationFrame : à chaque frame on repositionne
   les notes en fonction du temps écoulé depuis le début de la chart.
   Le temps de référence est celui de performance.now(), jamais un compteur
   de frames — sinon un écran à 144 Hz jouerait la chorégraphie 2× trop vite.
   ========================================================= */

/* --- Réglages de jugement (en millisecondes d'écart avec la note) ------- */
const FENETRE_PARFAIT = 65;
const FENETRE_BIEN = 135;
const FENETRE_RATE = 190; // au-delà, la note est comptée ratée toute seule

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

const RANGS = [
  { min: 92, texte: "Spirit level : LÉGENDAIRE 🏆" },
  { min: 75, texte: "Spirit level : la fac en parle encore 📣" },
  { min: 50, texte: "Spirit level : correct, mais Glinda a vu mieux." },
  { min: 25, texte: "Spirit level : deux personnes ont applaudi. Par politesse." },
  { min: 0, texte: "Spirit level : sieste générale 😴" },
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
  hype: 20,
  stats: { parfait: 0, bien: 0, rate: 0 },
  palier: -1,
  son: true,
};

const $ = (id) => document.getElementById(id);

const elements = {
  piste: $("piste"),
  couloirs: $("couloirs"),
  jugement: $("jugement"),
  score: $("score"),
  combo: $("combo"),
  hypeBarre: $("hype-barre"),
  hypeTexte: $("hype-texte"),
  foule: $("foule"),
  confettis: $("confettis"),
  glinda: $("glinda"),
  copine: $("copine"),
  ecran: $("ecran"),
  ecranTitre: $("ecran-titre"),
  ecranTexte: $("ecran-texte"),
  ecranCharts: $("ecran-charts"),
  rejouer: $("btn-rejouer"),
  stats: {
    parfait: $("stat-parfait"),
    bien: $("stat-bien"),
    rate: $("stat-rate"),
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

function construitMenuCharts() {
  elements.ecranCharts.innerHTML = "";
  CHARTS.forEach((chart) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chart-btn";
    btn.innerHTML =
      '<span class="chart-nom">' + chart.nom + "</span>" +
      '<span class="chart-etoiles">' + chart.etoiles + "</span>" +
      '<span class="chart-detail">' + chart.difficulte + " · " + chart.bpm + " BPM</span>" +
      '<span class="chart-resume">' + chart.resume + "</span>";
    btn.addEventListener("click", () => demarre(chart));
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
  etat.hype = 20;
  etat.stats = { parfait: 0, bien: 0, rate: 0 };
  etat.palier = -1;
  etat.enCours = true;

  Object.values(couloirs).forEach((c) => (c.notes.innerHTML = ""));
  elements.ecran.classList.remove("visible");
  elements.jugement.textContent = "";
  majTableau();
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

  elements.ecranTitre.textContent = termine ? "Chorégraphie terminée !" : "Chorégraphie abandonnée";
  elements.ecranTexte.innerHTML =
    "<b>" + etat.score + " points</b><br />" +
    rang.texte + "<br />" +
    "Meilleur combo : " + etat.meilleurCombo + " · " +
    etat.stats.parfait + " parfaits sur " + total + " notes";
  elements.rejouer.hidden = false;
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
      manque(note);
      restantes--;
    }
  });

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
    // Appui dans le vide : ça casse le combo, mais ça n'enlève pas de points.
    etat.combo = 0;
    affiche("À côté !", "rate");
    majTableau();
    return;
  }

  if (ecart <= FENETRE_PARFAIT) valide(candidate, "parfait");
  else if (ecart <= FENETRE_BIEN) valide(candidate, "bien");
  else manque(candidate);
}

function valide(note, qualite) {
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
  affiche(qualite === "parfait" ? "PARFAIT !" : "Bien !", qualite);
  audio.blip(qualite === "parfait" ? 880 : 660);
  majTableau();
}

function manque(note) {
  note.jouee = true;
  if (note.el) {
    note.el.classList.add("ratee");
    const el = note.el;
    setTimeout(() => el.remove(), 220);
  }
  etat.stats.rate++;
  etat.combo = 0;
  majHype(HYPE.rate);
  affiche("Raté…", "rate");
  majTableau();
}

/* Multiplicateur de combo : +1 tous les 10 enchaînements, plafonné à ×4
   pour que la fin d'une chart difficile ne double pas tout le score. */
function multiplicateur() {
  return Math.min(4, 1 + Math.floor(etat.combo / 10));
}

function affiche(texte, classe) {
  elements.jugement.textContent = texte;
  elements.jugement.className = "jugement " + classe;
  void elements.jugement.offsetWidth;
  elements.jugement.classList.add("pop");
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
   Jauge de hype et tableau de bord
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

function majTableau() {
  elements.score.textContent = etat.score;
  elements.combo.textContent = "×" + multiplicateur() + (etat.combo ? " (" + etat.combo + ")" : "");
  elements.stats.parfait.textContent = etat.stats.parfait;
  elements.stats.bien.textContent = etat.stats.bien;
  elements.stats.rate.textContent = etat.stats.rate;
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

  function contexte() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function ton(frequence, duree, volume, type) {
    if (!etat.son) return;
    const c = contexte();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || "square";
    osc.frequency.value = frequence;
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duree);
    osc.connect(gain).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duree);
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
    /* Petit métronome : un temps marqué, trois temps discrets. */
    rythme(bpm, continuer) {
      clearInterval(timer);
      let temps = 0;
      timer = setInterval(() => {
        if (!continuer()) {
          clearInterval(timer);
          return;
        }
        ton(temps % 4 === 0 ? 180 : 140, 0.05, temps % 4 === 0 ? 0.07 : 0.03, "triangle");
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
