/* =========================================================
   Sanity Whack — moteur de jeu
   ---------------------------------------------------------
   Un seul minuteur pilote les apparitions ; sa cadence dépend de la vague
   ET de la sanity (plus Elias panique, plus ça pop vite). Chaque apparition
   vit dans son trou et se retire toute seule au bout de son délai.
   ========================================================= */

const LIGNES = 3;
const COLONNES = 4;
const TROUS = LIGNES * COLONNES;

/* Une vague dure un nombre fixe d'apparitions, après quoi la cadence
   s'accélère et la proportion de pièges augmente un peu. */
const APPARITIONS_PAR_VAGUE = 14;

const SANITY_MAX = 100;
const SANITY = {
  rate: 7,      // une vraie créature ratée : Elias se dit qu'elle est passée
  bourde: 14,   // taper un innocent : la honte fait très mal
  touche: -4,   // un bon clic rassure un peu
};

const PALIERS_SANITY = [0, 35, 65, 88];

const etat = {
  enCours: false,
  score: 0,
  vague: 1,
  sanity: 10,
  apparitions: 0,
  stats: { ok: 0, rate: 0, bourde: 0 },
  serie: 0,
  meilleureSerie: 0,
  occupes: new Set(),
  minuteur: null,
  palier: -1,
};

const $ = (id) => document.getElementById(id);

const elements = {
  grille: $("grille"),
  avatar: $("elias-avatar"),
  score: $("score"),
  vague: $("vague"),
  barre: $("sanity-barre"),
  ambiance: $("ambiance"),
  commentaire: $("commentaire"),
  ecran: $("ecran"),
  ecranTitre: $("ecran-titre"),
  ecranTexte: $("ecran-texte"),
  jouer: $("btn-jouer"),
  stats: { ok: $("stat-ok"), rate: $("stat-rate"), bourde: $("stat-bourde"), serie: $("stat-serie") },
};

const trous = [];

/* =========================================================
   L'avatar d'Elias : il réagit à ce qui se passe
   ---------------------------------------------------------
   Deux sources d'expression :
     - le PALIER DE SANITY, qui est l'état de fond ;
     - une RÉACTION ponctuelle (bon coup, bourde, créature manquée), qui
       prend le dessus pendant un court instant avant de revenir au fond.
   ========================================================= */

const ELIAS = {
  peau: "#f0c39a",
  cheveux: "boucle",
  couleurCheveux: "#4a2c17",
  haut: "#6672d0",
  bas: "#2f3550",
  accessoire: "lunettes",
};

/* Une humeur = un regard + une bouche. */
const HUMEURS = {
  calme: { regard: "face", bouche: "sourire" },
  inquiet: { regard: "gauche", bouche: "neutre" },
  tendu: { regard: "droite", bouche: "neutre" },
  panique: { regard: "face", bouche: "o" },
  content: { regard: "face", bouche: "sourire-large" },
  honte: { regard: "ferme", bouche: "o" },
};

/* L'humeur de fond, par palier de sanity. */
const HUMEUR_PALIER = ["calme", "inquiet", "tendu", "panique"];

let reactionEnCours = null;

function dessineElias(humeur) {
  elements.avatar.innerHTML = persoSVG({ ...ELIAS, ...HUMEURS[humeur] });
  elements.avatar.dataset.humeur = humeur;
}

/* Réaction ponctuelle : elle s'affiche, puis Elias retombe sur l'humeur que
   lui dicte sa jauge de sanity. */
function reagit(humeur, duree) {
  dessineElias(humeur);
  elements.avatar.classList.remove("secoue");
  if (humeur === "honte" || humeur === "panique") {
    void elements.avatar.offsetWidth;
    elements.avatar.classList.add("secoue");
  }
  clearTimeout(reactionEnCours);
  reactionEnCours = setTimeout(humeurDeFond, duree || 900);
}

function humeurDeFond() {
  dessineElias(HUMEUR_PALIER[Math.max(0, etat.palier)] || "calme");
  elements.avatar.classList.remove("secoue");
}

/* =========================================================
   Construction de la grille
   ========================================================= */

function construitGrille() {
  for (let i = 0; i < TROUS; i++) {
    const trou = document.createElement("button");
    trou.type = "button";
    trou.className = "trou";
    trou.dataset.index = String(i);
    trou.setAttribute("aria-label", "Trou " + (i + 1));

    const habitant = document.createElement("span");
    habitant.className = "habitant";
    trou.appendChild(habitant);

    trou.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      frappe(i);
    });

    elements.grille.appendChild(trou);
    trous.push({ el: trou, habitant, occupant: null, minuteur: null });
  }
}

/* =========================================================
   Déroulement d'une partie
   ========================================================= */

function demarre() {
  etat.enCours = true;
  etat.score = 0;
  etat.vague = 1;
  etat.sanity = 10;
  etat.apparitions = 0;
  etat.stats = { ok: 0, rate: 0, bourde: 0 };
  etat.serie = 0;
  etat.meilleureSerie = 0;
  etat.palier = -1;

  trous.forEach((_, i) => vide(i, false));
  elements.ecran.classList.remove("visible");
  elements.commentaire.textContent = "";
  majTableau();
  majSanity(0);
  planifie();
}

function arrete(titre, texte) {
  if (!etat.enCours) return;
  etat.enCours = false;
  clearTimeout(etat.minuteur);
  trous.forEach((_, i) => vide(i, false));

  elements.ecranTitre.textContent = titre;
  elements.ecranTexte.innerHTML =
    texte +
    "<br /><br /><b>" + etat.score + " points</b> · vague " + etat.vague +
    "<br />" + etat.stats.ok + " créatures neutralisées, " +
    etat.stats.rate + " manquées, " + etat.stats.bourde + " bourdes" +
    "<br />Meilleure série : " + etat.meilleureSerie;
  elements.jouer.textContent = "Recommencer";
  elements.ecran.classList.add("visible");
}

/* Cadence : elle raccourcit avec la vague, et encore un peu quand la sanity
   grimpe — c'est ce qui rend les paliers hauts réellement plus durs. */
function delaiApparition() {
  const base = Math.max(320, 1150 - (etat.vague - 1) * 105);
  const panique = 1 - (etat.sanity / SANITY_MAX) * 0.35;
  return Math.round(base * panique * (0.7 + Math.random() * 0.6));
}

function dureeVisible() {
  return Math.max(520, 1750 - (etat.vague - 1) * 135);
}

function planifie() {
  if (!etat.enCours) return;
  etat.minuteur = setTimeout(() => {
    apparait();
    planifie();
  }, delaiApparition());
}

function apparait() {
  const libres = trous
    .map((t, i) => (t.occupant ? -1 : i))
    .filter((i) => i >= 0);
  if (!libres.length) return;

  const index = libres[Math.floor(Math.random() * libres.length)];

  /* Proportion de pièges : 18 % au départ, jusqu'à 35 % dans les vagues
     hautes — assez pour rendre le clic réflexe dangereux, pas assez pour
     que le jeu devienne injuste. */
  const partPieges = Math.min(0.35, 0.18 + (etat.vague - 1) * 0.03);
  const estPiege = Math.random() < partPieges;
  const source = estPiege ? PIEGES : CIBLES;
  const modele = source[Math.floor(Math.random() * source.length)];

  const trou = trous[index];
  trou.occupant = { ...modele, piege: estPiege };
  trou.habitant.innerHTML = modele.svg;
  trou.habitant.title = modele.nom;
  trou.el.classList.add("occupe", estPiege ? "piege" : "cible");

  etat.apparitions++;
  if (etat.apparitions % APPARITIONS_PAR_VAGUE === 0) vagueSuivante();

  trou.minuteur = setTimeout(() => {
    /* Personne n'a tapé : une vraie créature qui s'échappe fait monter la
       sanity, un piège qui repart tout seul est au contraire une bonne
       nouvelle (Elias ne s'est pas ridiculisé). */
    if (!trou.occupant) return;
    const etaitCible = !trou.occupant.piege;
    vide(index, true);
    if (etaitCible) {
      etat.stats.rate++;
      etat.serie = 0;
      majSanity(SANITY.rate);
      commente("Elle est repartie. Moi je l'ai bien vue.");
      reagit("panique", 900);
      majTableau();
    }
  }, dureeVisible());
}

function vide(index, animer) {
  const trou = trous[index];
  clearTimeout(trou.minuteur);
  trou.occupant = null;
  trou.el.classList.remove("occupe", "cible", "piege", "frappe");
  if (animer) {
    trou.el.classList.add("part");
    setTimeout(() => trou.el.classList.remove("part"), 200);
  }
  trou.habitant.innerHTML = "";
  trou.habitant.removeAttribute("title");
}

function vagueSuivante() {
  etat.vague++;
  commente("Vague " + etat.vague + ". Ça s'accélère, je le sens.");
  majTableau();
}

/* =========================================================
   Frappe
   ========================================================= */

function frappe(index) {
  if (!etat.enCours) return;
  const trou = trous[index];

  if (!trou.occupant) {
    /* Taper dans le vide : sans conséquence sur la sanity, mais Elias le
       remarque. On évite de punir, le jeu est déjà nerveux. */
    trou.el.classList.add("frappe");
    setTimeout(() => trou.el.classList.remove("frappe"), 150);
    commente("Il n'y avait rien. Je note quand même l'heure.");
    return;
  }

  const occupant = trou.occupant;

  if (occupant.piege) {
    etat.stats.bourde++;
    etat.serie = 0;
    etat.score = Math.max(0, etat.score - 80);
    majSanity(SANITY.bourde);
    commente(occupant.replique);
    reagit("honte", 1200);
    trou.el.classList.add("bourde");
    setTimeout(() => trou.el.classList.remove("bourde"), 300);
  } else {
    etat.stats.ok++;
    etat.serie++;
    etat.meilleureSerie = Math.max(etat.meilleureSerie, etat.serie);
    etat.score += occupant.points * multiplicateur();
    majSanity(SANITY.touche);
    commente(occupant.replique + (multiplicateur() > 1 ? " (série ×" + multiplicateur() + ")" : ""));
    reagit("content", 800);
  }

  vide(index, true);
  majTableau();
}

/* Série : chaque tranche de 5 bons coups d'affilée double, puis triple les
   points. Se tromper une fois remet le compteur à zéro — c'est ce qui pousse
   à viser au lieu de cliquer partout. */
function multiplicateur() {
  return Math.min(3, 1 + Math.floor(etat.serie / 5));
}

/* =========================================================
   Jauge de sanity et habillage
   ========================================================= */

function majSanity(delta) {
  etat.sanity = Math.max(0, Math.min(SANITY_MAX, etat.sanity + delta));
  elements.barre.style.width = etat.sanity + "%";

  const palier = PALIERS_SANITY.reduce((acc, seuil, i) => (etat.sanity >= seuil ? i : acc), 0);
  if (palier !== etat.palier) {
    etat.palier = palier;
    document.body.dataset.sanity = String(palier);
    elements.ambiance.textContent = AMBIANCES[palier];
    humeurDeFond();
  }

  if (etat.sanity >= SANITY_MAX) {
    arrete(
      "Game over",
      FINS_PANIQUE[Math.floor(Math.random() * FINS_PANIQUE.length)]
    );
  }
}

function majTableau() {
  elements.score.textContent = etat.score;
  elements.vague.textContent = etat.vague;
  elements.stats.ok.textContent = etat.stats.ok;
  elements.stats.rate.textContent = etat.stats.rate;
  elements.stats.bourde.textContent = etat.stats.bourde;
  if (elements.stats.serie) {
    elements.stats.serie.textContent = etat.serie + (multiplicateur() > 1 ? " (×" + multiplicateur() + ")" : "");
  }
}

function commente(texte) {
  elements.commentaire.textContent = texte;
  elements.commentaire.classList.remove("pop");
  void elements.commentaire.offsetWidth;
  elements.commentaire.classList.add("pop");
}

/* =========================================================
   Boutons
   ========================================================= */

elements.jouer.addEventListener("click", demarre);

$("btn-stop").addEventListener("click", () => {
  arrete(
    "Enquête suspendue",
    FINS_CALME[Math.floor(Math.random() * FINS_CALME.length)]
  );
});

construitGrille();
dessineElias("calme");
majTableau();
majSanity(0);
