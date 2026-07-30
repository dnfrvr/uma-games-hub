/* =========================================================
   UMA Memory — le moteur
   ---------------------------------------------------------
   Un jeu de paires, à ceci près que les paires ne sont pas des doublons :
   chaque carte est unique et va avec UNE autre (voir `DUOS` dans cartes.js).
   Le moteur, lui, ne connaît ni les têtes ni les liens : il compare des
   identifiants de duo, un point c'est tout. Ajouter un duo ou une taille de
   grille ne demande pas d'y toucher.

   Ce qu'il fait :
     - distribue un tapis à partir d'une grille ;
     - la règle des deux cartes, avec un battement de lecture avant fermeture ;
     - coups, chrono, série, score, bonus de rapidité ;
     - les records par grille, en localStorage.

   Rendu en DOM plutôt qu'en canvas, comme les autres jeux du portail : les
   dessins sont des SVG, autant les poser tels quels.

   Aucune animation pilotée par le script : tout ce qui bouge est une
   transition CSS, que `prefers-reduced-motion` coupe déjà pour tout le site.
   Le seul temps compté à la main est le battement de fermeture — c'est une
   règle du jeu, pas une décoration : il reste en place même sans animation.

   Les fonctions sont déclarées au premier niveau, sans fermeture englobante :
   c'est ce qui permet à `test-memory.js` de jouer une partie entière sans
   navigateur, comme les bancs d'essai des autres jeux.
   ========================================================= */

/* --- L'état de la partie en cours --------------------------------------- */
const etat = {
  niveau: null,
  cartes: [],
  /* Index des cartes ouvertes qui n'ont pas encore été jugées. */
  choix: [],
  /* Ce qui doit se refermer après le battement de lecture, s'il y a lieu. */
  attente: null,
  coups: 0,
  duos: 0,
  score: 0,
  serie: 0,
  meilleureSerie: 0,
  debut_ms: 0,
  temps_ms: 0,
  enCours: false,
  fini: false,
  /* Dernière carte atteinte au clavier, pour les flèches. */
  curseur: 0,
};

const CLE_RECORDS = "uma_memory_records";

let minuterie = null; // le battement de fermeture
let horlogeTic = null; // le chrono affiché

/* --- Petits utilitaires ------------------------------------------------- */

function maintenant() {
  return typeof performance !== "undefined" && performance.now
    ? performance.now()
    : Date.now();
}

function tire(liste, hasard) {
  return liste[Math.floor((hasard || Math.random)() * liste.length)];
}

/* Battage de Fisher-Yates. Le générateur est injectable pour que le banc
   d'essai puisse rejouer deux fois exactement le même tapis. */
function melange(liste, hasard) {
  const rng = hasard || Math.random;
  for (let i = liste.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tampon = liste[i];
    liste[i] = liste[j];
    liste[j] = tampon;
  }
  return liste;
}

function enTemps(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m + " : " + (s < 10 ? "0" : "") + s;
}

/* Le catalogue des motifs, rangé par identifiant : le tirage travaille sur
   les duos, mais il faut bien retrouver le dessin de chaque moitié. */
const PAR_ID = {};
MOTIFS.forEach((m) => {
  PAR_ID[m.id] = m;
});

/* =========================================================
   La distribution
   ---------------------------------------------------------
   On tire des DUOS, pas des cartes : chaque duo retenu pose ses deux
   moitiés sur le tapis, puis tout est battu. Les duos présents changent
   d'une partie à l'autre, donc la même grille ne se rejoue jamais à
   l'identique.
   ========================================================= */
function distribue(niveau, hasard) {
  const rng = hasard || Math.random;
  const tires = melange(DUOS.slice(), rng).slice(0, niveau.duos);

  const cartes = [];
  tires.forEach((duo, rang) => {
    /* Le duo est identifié par son rang dans le tirage : deux cartes vont
       ensemble si et seulement si elles portent le même. */
    cartes.push({ motif: PAR_ID[duo.a], duo: rang, lien: duo.replique });
    cartes.push({ motif: PAR_ID[duo.b], duo: rang, lien: duo.replique });
  });

  melange(cartes, rng);
  cartes.forEach((c, i) => {
    c.index = i;
    c.ouverte = false;
    c.resolue = false;
  });
  return cartes;
}

function demarre(niveau, hasard) {
  arreteMinuterie();
  etat.niveau = niveau;
  etat.cartes = distribue(niveau, hasard);
  etat.choix = [];
  etat.attente = null;
  etat.coups = 0;
  etat.duos = 0;
  etat.score = 0;
  etat.serie = 0;
  etat.meilleureSerie = 0;
  etat.debut_ms = maintenant();
  etat.temps_ms = 0;
  etat.enCours = true;
  etat.fini = false;
  etat.curseur = 0;

  dessineGrille();
  cacheEcran();
  majCarnet();
  dit(tire(PHRASES_DEPART));
  lanceChrono();
}

/* =========================================================
   La règle du jeu
   ========================================================= */

/**
 * Retourne la carte d'indice `i`. C'est le seul point d'entrée du jeu :
 * la souris, le clavier et le banc d'essai passent tous par là.
 * @returns {boolean} vrai si la carte s'est effectivement retournée.
 */
function clique(i) {
  if (!etat.enCours) return false;

  /* Cliquer pendant le battement de fermeture ne doit pas être ignoré :
     on referme tout de suite et on prend le clic. Sinon le jeu paraît
     sourd exactement au moment où le joueur va vite. */
  if (etat.attente) resout();

  const c = etat.cartes[i];
  if (!c || c.ouverte || c.resolue) return false;

  c.ouverte = true;
  etat.choix.push(i);
  majCarte(c);

  if (etat.choix.length === 2) juge();

  majCarnet();
  return true;
}

function juge() {
  etat.coups++;
  const a = etat.cartes[etat.choix[0]];
  const b = etat.cartes[etat.choix[1]];

  /* Deux cartes vont ensemble si elles appartiennent au même duo — jamais
     parce qu'elles se ressemblent : sur ce tapis, aucun dessin n'est là
     deux fois. */
  if (a.duo === b.duo) {
    a.resolue = true;
    b.resolue = true;
    etat.duos++;
    etat.serie++;
    if (etat.serie > etat.meilleureSerie) etat.meilleureSerie = etat.serie;
    etat.choix = [];

    const bonus = REGLAGES.bonusSerie * Math.min(etat.serie - 1, REGLAGES.serieMax - 1);
    ajouteScore(REGLAGES.pointsDuo + bonus);
    majCarte(a);
    majCarte(b);
    /* La phrase du duo est ce qui apprend le lien : c'est elle qui rendra
       la partie suivante plus facile. */
    dit(a.lien, bonus ? "Série de " + etat.serie + " — bonus +" + bonus : null);

    if (etat.duos === etat.niveau.duos) termine();
    return;
  }

  etat.serie = 0;
  const aFermer = etat.choix.slice();
  etat.choix = [];
  dit(tire(PHRASES_RATE));
  programme({ fermer: aFermer }, REGLAGES.delaiRetour_ms);
}

/* Referme ce qui attendait. Appelé par la minuterie, ou d'avance par un
   joueur pressé qui reclique. */
function resout() {
  arreteMinuterie();
  if (!etat.attente) return;
  etat.attente.fermer.forEach((j) => {
    const c = etat.cartes[j];
    if (!c || c.resolue) return;
    c.ouverte = false;
    majCarte(c);
  });
  etat.attente = null;
}

function programme(attente, delai) {
  etat.attente = attente;
  if (typeof setTimeout !== "function") return;
  minuterie = setTimeout(resout, delai);
}

function arreteMinuterie() {
  if (minuterie !== null && typeof clearTimeout === "function") clearTimeout(minuterie);
  minuterie = null;
}

function ajouteScore(points) {
  etat.score = Math.max(0, etat.score + points);
}

/* =========================================================
   La fin de partie
   ========================================================= */
function termine() {
  arreteMinuterie();
  arreteChrono();
  etat.enCours = false;
  etat.fini = true;
  etat.temps_ms = maintenant() - etat.debut_ms;
  etat.attente = null;
  etat.choix = [];

  const gagnees = Math.max(0, etat.niveau.cible_s - etat.temps_ms / 1000);
  etat.bonusTemps = Math.round(gagnees * REGLAGES.bonusSeconde);
  ajouteScore(etat.bonusTemps);

  etat.record = enregistreRecord();
  majCarnet();
  montreFin();
}

function mention() {
  const ratio = etat.coups / Math.max(1, etat.niveau.duos);
  for (const m of MENTIONS) if (ratio <= m.max) return m;
  return MENTIONS[MENTIONS.length - 1];
}

/* =========================================================
   Les records — la seule chose qui survit à la partie
   ---------------------------------------------------------
   Rien de tout ça ne doit empêcher de jouer : un navigateur qui refuse le
   stockage (navigation privée, réglage strict) lève à la lecture comme à
   l'écriture, d'où les deux filets.
   ========================================================= */
function litRecords() {
  try {
    if (typeof localStorage === "undefined") return {};
    return JSON.parse(localStorage.getItem(CLE_RECORDS) || "{}") || {};
  } catch (e) {
    return {};
  }
}

function enregistreRecord() {
  const tous = litRecords();
  const ancien = tous[etat.niveau.id];
  const neuf = {
    score: etat.score,
    coups: etat.coups,
    temps_ms: Math.round(etat.temps_ms),
  };
  if (ancien && ancien.score >= neuf.score) return { bat: false, meilleur: ancien };

  tous[etat.niveau.id] = neuf;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(CLE_RECORDS, JSON.stringify(tous));
    }
  } catch (e) {
    /* Tant pis pour le record : la partie, elle, s'est bien terminée. */
  }
  return { bat: !!ancien, meilleur: neuf, premier: !ancien };
}

/* =========================================================
   Le chrono
   ---------------------------------------------------------
   Recalculé depuis l'heure de départ à chaque tic plutôt qu'incrémenté :
   un onglet en arrière-plan ralentit les minuteries, il ne doit pas
   ralentir le temps.
   ========================================================= */
function lanceChrono() {
  arreteChrono();
  if (typeof setInterval !== "function") return;
  horlogeTic = setInterval(majChrono, 250);
  majChrono();
}

function arreteChrono() {
  if (horlogeTic !== null && typeof clearInterval === "function") clearInterval(horlogeTic);
  horlogeTic = null;
}

function majChrono() {
  if (!etat.enCours) return;
  etat.temps_ms = maintenant() - etat.debut_ms;
  ecrit("mem-chrono", enTemps(etat.temps_ms));
}

/* =========================================================
   Le rendu
   ---------------------------------------------------------
   Tout ce qui suit est du DOM et rien d'autre : chaque fonction se tait si
   son hôte n'existe pas, pour que le moteur tourne aussi sans page.
   ========================================================= */

const elementsCartes = [];

function hote(id) {
  return typeof document !== "undefined" && document.getElementById
    ? document.getElementById(id)
    : null;
}

function ecrit(id, texte) {
  const el = hote(id);
  if (el) el.textContent = texte;
}

function dessineGrille() {
  const grille = hote("mem-grille");
  if (!grille) return;

  grille.innerHTML = "";
  elementsCartes.length = 0;
  /* La feuille de style borne la largeur du tapis à partir de la place
     disponible en hauteur : il lui faut les deux dimensions de la grille. */
  grille.style.setProperty("--mem-colonnes", String(etat.niveau.colonnes));
  grille.style.setProperty("--mem-rangees", String(etat.niveau.rangees));

  etat.cartes.forEach((c) => {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.className = "mem-carte";

    const pivot = document.createElement("span");
    pivot.className = "mem-pivot";

    const dos = document.createElement("span");
    dos.className = "mem-dos";
    dos.setAttribute("aria-hidden", "true");

    const avant = document.createElement("span");
    avant.className = "mem-avant";
    avant.style.setProperty("--mem-teinte", c.motif.fond);

    const dessin = document.createElement("span");
    dessin.className = "mem-dessin";
    dessin.setAttribute("aria-hidden", "true");
    dessin.innerHTML = c.motif.svg;

    const nom = document.createElement("span");
    nom.className = "mem-nom";
    nom.textContent = c.motif.nom;

    avant.append(dessin, nom);
    pivot.append(dos, avant);
    bouton.appendChild(pivot);

    bouton.addEventListener("click", () => clique(c.index));
    bouton.addEventListener("focus", () => {
      etat.curseur = c.index;
    });

    elementsCartes[c.index] = bouton;
    grille.appendChild(bouton);
    majCarte(c);
  });
}

function majCarte(c) {
  const el = elementsCartes[c.index];
  if (!el) return;

  el.classList.toggle("mem-ouverte", !!c.ouverte);
  el.classList.toggle("mem-trouvee", !!c.resolue);
  el.disabled = !!c.resolue;

  /* L'étiquette lue à voix haute dit l'état, pas seulement le nom : « carte
     cachée » et « duo trouvé » ne se distinguent pas autrement. */
  el.setAttribute(
    "aria-label",
    "Carte " + (c.index + 1) + " sur " + etat.cartes.length + ", " +
      (!c.ouverte
        ? "face cachée"
        : c.motif.nom + (c.resolue ? ", duo trouvé" : ""))
  );
}

function dit(phrase, note) {
  const bulle = hote("mem-bulle");
  if (!bulle) return;
  bulle.innerHTML = "";

  const dite = document.createElement("span");
  dite.className = "mem-dite";
  dite.textContent = phrase;
  bulle.appendChild(dite);

  if (note) {
    const seconde = document.createElement("span");
    seconde.className = "mem-regle";
    seconde.textContent = note;
    bulle.appendChild(seconde);
  }
}

function majCarnet() {
  if (!etat.niveau) return;
  ecrit("mem-grille-nom", etat.niveau.nom);
  ecrit("mem-coups", String(etat.coups));
  ecrit("mem-duos", etat.duos + " / " + etat.niveau.duos);
  ecrit("mem-score", String(etat.score));
  ecrit("mem-serie", etat.serie > 1 ? "×" + etat.serie : "—");

  const record = litRecords()[etat.niveau.id];
  ecrit("mem-record", record ? record.score + " pts" : "aucun");
}

/* =========================================================
   Les écrans posés par-dessus le tapis
   ========================================================= */

function cacheEcran() {
  const ecran = hote("mem-ecran");
  if (ecran) ecran.classList.remove("mem-visible");
}

function boite(titre) {
  const ecran = hote("mem-ecran");
  if (!ecran) return null;
  ecran.innerHTML = "";
  ecran.classList.add("mem-visible");

  const b = document.createElement("div");
  b.className = "mem-boite";

  const h = document.createElement("h2");
  h.className = "mem-titre";
  h.textContent = titre;
  b.appendChild(h);

  ecran.appendChild(b);
  return b;
}

function paragraphe(parent, texte, classe) {
  const p = document.createElement("p");
  p.className = classe || "mem-texte";
  p.textContent = texte;
  parent.appendChild(p);
  return p;
}

function montreAccueil() {
  const b = boite("Le tapis d'Augusta");
  if (!b) return;

  paragraphe(
    b,
    "Retourne deux cartes à la fois. Aucune carte n'est là deux fois : il " +
      "faut retrouver celle qui VA AVEC. Drew et son camion, le clown et son " +
      "ballon."
  );

  const choix = document.createElement("div");
  choix.className = "mem-choix";
  const records = litRecords();

  NIVEAUX.forEach((niveau) => {
    const carte = document.createElement("button");
    carte.type = "button";
    carte.className = "mem-choix-carte";

    const nom = document.createElement("span");
    nom.className = "mem-choix-nom";
    nom.textContent = niveau.nom;

    const taille = document.createElement("span");
    taille.className = "mem-choix-taille";
    taille.textContent = niveau.colonnes + " × " + niveau.rangees;

    const detail = document.createElement("span");
    detail.className = "mem-choix-detail";
    detail.textContent = niveau.detail;

    const rec = document.createElement("span");
    rec.className = "mem-choix-record";
    rec.textContent = records[niveau.id]
      ? "Record : " + records[niveau.id].score + " pts"
      : "Jamais joué";

    carte.append(nom, taille, detail, rec);
    carte.addEventListener("click", () => demarre(niveau));
    choix.appendChild(carte);
  });

  b.appendChild(choix);
}

function montreFin() {
  const m = mention();
  const b = boite(m.titre);
  if (!b) return;

  paragraphe(b, m.mot);

  const table = document.createElement("dl");
  table.className = "mem-bilan";
  const lignes = [
    ["Score", etat.score + " pts"],
    ["Coups", String(etat.coups)],
    ["Temps", enTemps(etat.temps_ms)],
    ["Meilleure série", etat.meilleureSerie > 1 ? "×" + etat.meilleureSerie : "aucune"],
    ["Bonus rapidité", "+" + etat.bonusTemps],
  ];
  lignes.forEach(([cle, valeur]) => {
    const dt = document.createElement("dt");
    dt.textContent = cle;
    const dd = document.createElement("dd");
    dd.textContent = valeur;
    table.append(dt, dd);
  });
  b.appendChild(table);

  if (etat.record && (etat.record.bat || etat.record.premier)) {
    paragraphe(b, "Nouveau record sur cette grille !", "mem-record-neuf");
  }

  /* Le carnet des duos : c'est ce qu'on emporte d'une partie à l'autre.
     Le relire est exactement ce qui fait progresser à la prochaine. */
  const titreDuos = document.createElement("h3");
  titreDuos.className = "mem-sous-titre";
  titreDuos.textContent = "Les duos de cette partie";
  b.appendChild(titreDuos);

  const liste = document.createElement("ul");
  liste.className = "mem-duos";
  const vus = {};
  etat.cartes.forEach((c) => {
    if (vus[c.duo]) return;
    vus[c.duo] = true;
    const autre = etat.cartes.filter((d) => d.duo === c.duo && d !== c)[0];
    const li = document.createElement("li");
    li.textContent = c.motif.nom + " ↔ " + autre.motif.nom;
    liste.appendChild(li);
  });
  b.appendChild(liste);

  const boutons = document.createElement("div");
  boutons.className = "mem-boutons";

  const rejouer = document.createElement("button");
  rejouer.type = "button";
  rejouer.className = "fun-btn primary";
  rejouer.textContent = "Rejouer ce tapis";
  rejouer.addEventListener("click", () => demarre(etat.niveau));

  const changer = document.createElement("button");
  changer.type = "button";
  changer.className = "fun-btn";
  changer.textContent = "Changer de grille";
  changer.addEventListener("click", montreAccueil);

  boutons.append(rejouer, changer);
  b.appendChild(boutons);
}

/* =========================================================
   Le clavier
   ---------------------------------------------------------
   Les cartes sont de vrais boutons : Tab et Entrée marchent tout seuls. Les
   flèches ne font qu'ajouter le déplacement en grille, qui est ce qu'on
   attend d'un tapis — et elles sautent les cartes déjà réglées, sur
   lesquelles le focus ne peut de toute façon pas se poser.
   ========================================================= */
const FLECHES = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

function auClavier(e) {
  if (!etat.enCours || !etat.niveau) return;
  const pas = FLECHES[e.key];
  if (!pas) return;

  const colonnes = etat.niveau.colonnes;
  const total = etat.cartes.length;
  let x = etat.curseur % colonnes;
  let y = Math.floor(etat.curseur / colonnes);

  /* On avance dans la direction demandée jusqu'à tomber sur une carte
     encore jouable, ou jusqu'à sortir du tapis. */
  for (let essai = 0; essai < total; essai++) {
    x += pas[0];
    y += pas[1];
    if (x < 0 || x >= colonnes || y < 0) return;
    const cible = y * colonnes + x;
    if (cible >= total) return;
    const el = elementsCartes[cible];
    if (el && !el.disabled) {
      e.preventDefault();
      etat.curseur = cible;
      if (el.focus) el.focus();
      return;
    }
  }
}

if (typeof document !== "undefined" && document.addEventListener) {
  document.addEventListener("keydown", auClavier);
}

/* Le tapis n'est pas distribué au chargement : on commence par demander sa
   taille, comme le faisaient les jeux de l'époque. */
montreAccueil();
