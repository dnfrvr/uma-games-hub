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

/* =========================================================
   Courbe de difficulté
   ---------------------------------------------------------
   La partie doit devenir de plus en plus dure, sans jamais atteindre de
   plateau. L'ancienne courbe était une droite bornée : elle touchait son
   minimum à la vague 11 (~1 min 30 de jeu) et ne bougeait plus jamais —
   passé ce point, survivre était une question d'endurance, pas de niveau.

   Trois leviers, qui ne saturent volontairement pas au même moment :

     1. la VITESSE — fenêtre de visée et intervalle entre deux salves. Elle
        chute vite au début puis s'approche d'un plancher : on ne bat pas le
        temps de réaction humain, inutile d'essayer. Sous ~420 ms de fenêtre
        le jeu ne serait plus difficile, il serait aléatoire.
     2. le NOMBRE — à partir de la vague 9, une salve fait sortir plusieurs
        créatures d'un coup. C'est ce levier qui prend le relais quand la
        vitesse est bloquée, et lui n'a pas de raison de s'arrêter.
     3. le TRI — la part de pièges continue de monter vers 42 %. Il faut
        regarder avant de taper, dans une fenêtre de plus en plus courte.

   Chaque levier suit la même courbe géométrique : à chaque vague on retire
   la même PROPORTION de ce qui reste entre la valeur courante et sa valeur
   d'arrivée. Ça descend fort au début, ça continue de descendre toujours,
   et ça ne franchit jamais la borne.

   Repères mesurés (`node outils/test-serie-elias.js`, jauge au calme) :

     vague   fenêtre   salve     créatures/s   pièges   à partir de
        1    1750 ms   1150 ms       1,0        18 %       0 s
        4    1197 ms    750 ms       1,5        28 %      36 s
        8     800 ms    502 ms       2,3        35 %      84 s
       12     605 ms    400 ms       4,1        38 %     131 s
       16     511 ms    359 ms       5,7        40 %     179 s
       20     464 ms    342 ms       6,8        41 %     227 s

   Les temps supposent la jauge à mi-course ; un joueur qui la garde au
   plancher joue des vagues ~15 % plus longues (la panique raccourcit la
   cadence, cf. `delaiApparition`).

   Au-delà de ~4 créatures/s plus personne ne suit : la vague 12 est la
   frontière haute d'une très bonne partie, et la courbe continue de monter
   après, pour qu'il n'y ait jamais de « palier confortable ». Parties
   simulées (25 par profil, `outils/` n'automatise pas ça, c'est un banc
   jetable) : débutant vague 5, joueur moyen vague 10, bon joueur vague 14,
   expert vague 19 — et surtout, tous finissent par tomber. Avec l'ancienne
   courbe, l'expert survivait indéfiniment (vague 190 au bout de 15 min).
   ========================================================= */

const FENETRE = { depart: 1750, arrivee: 420, taux: 0.836 };  // ms visibles
const CADENCE = { depart: 1150, arrivee: 330, taux: 0.80 };   // ms entre 2 salves
const PART_PIEGES = { depart: 0.18, arrivee: 0.42, taux: 0.84 };
const SALVE = { depart: 1.15, arrivee: 3.2, taux: 0.95 };     // créatures par salve

/* La vague où le nombre prend le relais de la vitesse. */
const VAGUE_SALVES = 9;

/* Une vague dure une DURÉE, pas un nombre d'apparitions. Avec l'ancien
   décompte fixe, les vagues rapides défilaient en 3,9 s et le compteur ne
   voulait plus rien dire ; ici chaque vague pèse le même temps de jeu. */
const DUREE_VAGUE_MS = 12000;

/* Effet moyen de la panique sur la cadence : elle raccourcit le délai de 0 à
   35 % selon la jauge. On prend 0,87 pour estimer la longueur d'une vague. */
const PANIQUE_MOYENNE = 0.87;

function courbe(c, vague) {
  return c.arrivee + (c.depart - c.arrivee) * Math.pow(c.taux, vague - 1);
}

const SANITY_MAX = 100;
const SANITY = {
  rate: 7,      // une vraie créature ratée : Elias se dit qu'elle est passée
  bourde: 14,   // taper un innocent : la honte fait très mal
  touche: -4,   // un bon clic rassure un peu
};

const PALIERS_SANITY = [0, 35, 65, 88];

/* L'écran se dégrade aussi avec l'heure qu'il est, pas seulement avec la
   jauge : un joueur excellent la garde au plancher et jouerait sinon quatre
   minutes sur une image impeccable, alors que le grain VHS est tout le sel
   du jeu. Ces vagues font passer l'image au cran suivant, quoi qu'il arrive. */
const PALIERS_VAGUE = [6, 11, 16];

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
  palierEcran: -1,
  salvesRestantes: 0,
};

const $ = (id) => document.getElementById(id);

const elements = {
  grille: $("grille"),
  avatar: $("elias-avatar"),
  score: $("score"),
  vague: $("vague"),
  barre: $("sanity-barre"),
  sanityEtat: $("sanity-etat"),
  ambiance: $("ambiance"),
  commentaire: $("commentaire"),
  annonce: $("annonce-vague"),
  ecran: $("ecran"),
  ecranTitre: $("ecran-titre"),
  ecranTexte: $("ecran-texte"),
  jouer: $("btn-jouer"),
  son: $("btn-son"),
  stats: { ok: $("stat-ok"), rate: $("stat-rate"), bourde: $("stat-bourde"), serie: $("stat-serie") },
};

const trous = [];

/* =========================================================
   Son : synthétisé à la volée, aucun fichier audio
   ---------------------------------------------------------
   Le contexte n'est créé qu'au premier clic (les navigateurs refusent le son
   avant un geste de l'utilisateur) et tout est sous garde : les bancs d'essai
   Node n'ont pas de WebAudio, le jeu doit s'y charger sans broncher.
   ========================================================= */

let audio = null;
let sonActif = true;

function contexteAudio() {
  if (audio) return audio;
  const Fabrique = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
  if (!Fabrique) return null;
  try {
    audio = new Fabrique();
  } catch (e) {
    audio = null;
  }
  return audio;
}

/* Une note très courte. `forme` change la couleur : carré pour le coup sec,
   dent de scie pour la fausse note de la bourde. */
function bip(frequence, duree, forme, volume) {
  if (!sonActif) return;
  const ctx = contexteAudio();
  if (!ctx || !ctx.createOscillator) return;
  if (ctx.state === "suspended" && ctx.resume) ctx.resume();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = forme || "square";
  osc.frequency.value = frequence;
  gain.gain.setValueAtTime(volume || 0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duree);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duree);
}

/* Le coup sec sur une créature : deux notes qui descendent, ça claque. */
function sonTouche(serie) {
  const hauteur = 320 + Math.min(8, serie) * 28; // la série monte dans les aigus
  bip(hauteur, 0.07, "square", 0.09);
  setTimeout(() => bip(hauteur * 0.55, 0.09, "triangle", 0.07), 45);
}

function sonBourde() {
  bip(150, 0.18, "sawtooth", 0.12);
  setTimeout(() => bip(105, 0.26, "sawtooth", 0.1), 110);
}

function sonEchappe() {
  bip(190, 0.14, "sine", 0.07);
}

function sonVague() {
  bip(520, 0.09, "square", 0.07);
  setTimeout(() => bip(690, 0.12, "square", 0.07), 90);
}

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
  /* `asset` demande le visage correspondant à l'humeur ; sans fichier déposé
     la cascade retombe sur « elias », puis sur le dessin. */
  elements.avatar.innerHTML = persoSVG({
    ...ELIAS, ...HUMEURS[humeur], id: "elias", asset: "elias-" + humeur,
  });
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
  etat.palierEcran = -1;

  trous.forEach((_, i) => vide(i, false));
  elements.ecran.classList.remove("visible");
  elements.commentaire.textContent = "";
  armeVague();
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
  const base = courbe(CADENCE, etat.vague);
  const panique = 1 - (etat.sanity / SANITY_MAX) * 0.35;
  return Math.round(base * panique * (0.7 + Math.random() * 0.6));
}

/* Le temps pendant lequel une créature reste tapable. */
function dureeVisible() {
  return Math.round(courbe(FENETRE, etat.vague));
}

/* Part de pièges : elle monte vers 42 % sans jamais l'atteindre. Au-delà, le
   jeu cesserait d'être un jeu d'adresse pour devenir un jeu de retenue. */
function partPieges() {
  return courbe(PART_PIEGES, etat.vague);
}

/* Nombre de créatures qui sortent d'un coup. On tire un entier autour de
   l'espérance : à 1,15 la salve est simple 85 fois sur 100 et double 15 fois,
   ce qui fait monter la pression sans marche d'escalier visible. */
function tailleSalve() {
  const attendu = etat.vague < VAGUE_SALVES
    ? 1
    : courbe(SALVE, etat.vague - VAGUE_SALVES + 1);
  const entier = Math.floor(attendu);
  return entier + (Math.random() < attendu - entier ? 1 : 0);
}

function planifie() {
  if (!etat.enCours) return;
  etat.minuteur = setTimeout(() => {
    const salve = tailleSalve();
    for (let i = 0; i < salve; i++) apparait();
    etat.salvesRestantes--;
    if (etat.salvesRestantes <= 0) vagueSuivante();
    planifie();
  }, delaiApparition());
}

function apparait() {
  const libres = trous
    .map((t, i) => (t.occupant ? -1 : i))
    .filter((i) => i >= 0);
  if (!libres.length) return;

  const index = libres[Math.floor(Math.random() * libres.length)];

  const estPiege = Math.random() < partPieges();
  const source = estPiege ? PIEGES : CIBLES;
  const modele = source[Math.floor(Math.random() * source.length)];

  const trou = trous[index];
  trou.occupant = { ...modele, piege: estPiege };
  /* `dossier` vient de roster.js et dit dans quelle famille d'images chercher.
     Sans image déposée, umaDessin rend le SVG d'origine. */
  trou.habitant.innerHTML =
    modele.dossier && typeof umaDessin === "function"
      ? umaDessin(modele.dossier, modele.id, modele.svg)
      : modele.svg;
  trou.habitant.title = modele.nom;
  trou.el.classList.add("occupe", estPiege ? "piege" : "cible");

  etat.apparitions++;

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
      commente(pioche(RATES));
      reagit("panique", 900);
      clignote(index, "echappee", 420);
      sonEchappe();
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

/* Une vague = DUREE_VAGUE_MS de jeu. Comme la cadence change à chaque vague,
   on recalcule le nombre de salves qui tiennent dedans. */
function armeVague() {
  const moyen = courbe(CADENCE, etat.vague) * PANIQUE_MOYENNE;
  etat.salvesRestantes = Math.max(6, Math.round(DUREE_VAGUE_MS / moyen));
}

function vagueSuivante() {
  etat.vague++;
  armeVague();
  commente(ALERTES_VAGUE[etat.vague] || pioche(MONTEES).replace("{n}", etat.vague));
  annonceVague();
  sonVague();
  majDecor();
  majTableau();
}

/* Le carton plein écran : sans lui, la vague n'existe que comme un petit
   chiffre dans le tableau de bord et l'accélération passe inaperçue. */
function annonceVague() {
  if (!elements.annonce) return;
  elements.annonce.textContent = "VAGUE " + etat.vague;
  elements.annonce.classList.remove("pop");
  void elements.annonce.offsetWidth;
  elements.annonce.classList.add("pop");
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
    clignote(index, "frappe", 150);
    commente(pioche(VIDES));
    return;
  }

  const occupant = trou.occupant;

  if (occupant.piege) {
    etat.stats.bourde++;
    etat.serie = 0;
    etat.score = Math.max(0, etat.score - 80);
    majSanity(SANITY.bourde);
    commente(repliqueDe(occupant));
    reagit("honte", 1200);
    clignote(index, "bourde", 300);
    marque(index, "−80", true);
    sonBourde();
  } else {
    etat.stats.ok++;
    etat.serie++;
    etat.meilleureSerie = Math.max(etat.meilleureSerie, etat.serie);
    const gagne = points(occupant);
    etat.score += gagne;
    majSanity(SANITY.touche);
    commente(repliqueDe(occupant) + (multiplicateur() > 1 ? " (série ×" + multiplicateur() + ")" : ""));
    reagit("content", 800);
    clignote(index, "touchee", 320);
    marque(index, "+" + gagne, false);
    sonTouche(etat.serie);
  }

  vide(index, true);
  majTableau();
}

/* Points d'une créature : sa valeur, la série, et une prime de vague — sans
   elle, mourir vague 14 rapporterait autant que camper vague 3. */
function points(occupant) {
  return Math.round(occupant.points * multiplicateur() * (1 + (etat.vague - 1) * 0.05));
}

/* Série : chaque tranche de 5 bons coups d'affilée double, puis triple les
   points. Se tromper une fois remet le compteur à zéro — c'est ce qui pousse
   à viser au lieu de cliquer partout. */
function multiplicateur() {
  return Math.min(3, 1 + Math.floor(etat.serie / 5));
}

/* =========================================================
   Retours visuels de la grille
   ========================================================= */

/* Pose une classe sur un trou et la retire toute seule. */
function clignote(index, classe, duree) {
  const el = trous[index].el;
  el.classList.remove(classe);
  void el.offsetWidth;
  el.classList.add(classe);
  setTimeout(() => el.classList.remove(classe), duree);
}

/* Le chiffre qui s'envole du trou : c'est le seul retour qui dit COMBIEN on
   vient de gagner ou de perdre, au moment et à l'endroit du clic. */
function marque(index, texte, mauvais) {
  const el = document.createElement("span");
  el.className = "gain" + (mauvais ? " gain-mauvais" : "");
  el.textContent = texte;
  trous[index].el.appendChild(el);
  setTimeout(() => el.remove(), 700);
}

/* =========================================================
   Jauge de sanity et habillage
   ========================================================= */

function majSanity(delta) {
  const avant = etat.sanity;
  etat.sanity = Math.max(0, Math.min(SANITY_MAX, etat.sanity + delta));
  elements.barre.style.width = etat.sanity + "%";

  const palier = PALIERS_SANITY.reduce((acc, seuil, i) => (etat.sanity >= seuil ? i : acc), 0);
  if (palier !== etat.palier) {
    etat.palier = palier;
    humeurDeFond();
  }
  majDecor();

  /* Le chiffre et le mot : la barre seule ne dit pas à quelle distance on est
     du cran suivant, ni ce que ça veut dire pour Elias. */
  if (elements.sanityEtat) {
    elements.sanityEtat.textContent = Math.round(etat.sanity) + " % · " + ETATS_SANITY[palier];
    elements.sanityEtat.dataset.palier = String(palier);
  }
  if (delta > 0 && etat.sanity > avant) clignoteJauge();

  if (etat.sanity >= SANITY_MAX) {
    arrete(
      "Game over",
      FINS_PANIQUE[Math.floor(Math.random() * FINS_PANIQUE.length)]
    );
  }
}

function clignoteJauge() {
  const cadre = elements.barre.parentElement;
  if (!cadre || !cadre.classList) return;
  cadre.classList.remove("monte");
  void cadre.offsetWidth;
  cadre.classList.add("monte");
  setTimeout(() => cadre.classList.remove("monte"), 320);
}

/* L'état de l'écran suit le PIRE des deux : la jauge d'Elias et l'avancée de
   la nuit. Son visage, lui, ne suit que la jauge — c'est son état à lui. */
function palierVague() {
  return PALIERS_VAGUE.reduce((acc, seuil, i) => (etat.vague >= seuil ? i + 1 : acc), 0);
}

function majDecor() {
  const cran = Math.max(0, etat.palier, palierVague());
  if (cran === etat.palierEcran) return;
  etat.palierEcran = cran;
  document.body.dataset.sanity = String(cran);
  elements.ambiance.textContent = AMBIANCES[cran];
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

/* Deux répliques identiques à la suite cassent l'illusion qu'Elias parle
   vraiment : on retire la dernière du chapeau. */
let dernierTexte = "";

function pioche(liste) {
  let texte = liste[Math.floor(Math.random() * liste.length)];
  if (texte === dernierTexte && liste.length > 1) {
    texte = liste[Math.floor(Math.random() * liste.length)];
  }
  return texte;
}

/* Chaque créature a sa réplique canonique, plus quelques variantes. */
function repliqueDe(occupant) {
  if (!occupant.repliques || !occupant.repliques.length) return occupant.replique;
  return pioche([occupant.replique].concat(occupant.repliques));
}

function commente(texte) {
  dernierTexte = texte;
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

if (elements.son) {
  elements.son.addEventListener("click", () => {
    sonActif = !sonActif;
    elements.son.textContent = sonActif ? "🔊 Son" : "🔇 Son";
    elements.son.classList.toggle("coupe", !sonActif);
    if (sonActif) bip(440, 0.08, "square", 0.08);
  });
}

construitGrille();
dessineElias("calme");
majTableau();
majSanity(0);
