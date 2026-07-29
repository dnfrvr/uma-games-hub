/* =========================================================
   UMA Memory — banc d'essai
   ---------------------------------------------------------
   Un jeu de paires se casse en silence : une grille dont le compte ne tombe
   pas juste laisse une case vide, un duo dont une moitié sert deux fois rend
   une paire ambiguë, et un motif oublié du tirage ne se remarque qu'à la
   quinzième partie. Une capture d'écran ne dit rien de tout ça.

   Ce banc charge `cartes.js` puis `main.js` dans un faux DOM — comme les
   scripts d'`outils/` — et joue de vraies parties, avec un tirage
   déterministe pour qu'un échec soit reproductible.

   Il vérifie :
     - que chaque grille est distribuable (colonnes × rangées = duos × 2) ;
     - que les duos sont sains : moitiés connues, jamais réemployées,
       jamais appariées à elles-mêmes, et tout le casting servi ;
     - que la distribution ne pose JAMAIS deux fois le même dessin ;
     - la règle des deux cartes, le battement de fermeture, la série ;
     - qu'une partie menée jusqu'au bout se termine et se range.

   À lancer depuis la racine du dépôt :
     node games/uma-memory/test-memory.js
   ========================================================= */

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const DOSSIER = __dirname;
const RACINE = path.join(DOSSIER, "..", "..");

/* --------------------------------------------------------- */
/* Un DOM de façade : juste ce que le moteur touche.          */
/* --------------------------------------------------------- */
function fauxElement() {
  const classes = new Set();
  const el = {
    children: [],
    className: "",
    textContent: "",
    innerHTML: "",
    type: "",
    disabled: false,
    style: { valeurs: {}, setProperty(k, v) { this.valeurs[k] = v; }, removeProperty() {} },
    dataset: {},
    ecouteurs: {},
    classList: {
      add(...c) { c.forEach((x) => classes.add(x)); },
      remove(...c) { c.forEach((x) => classes.delete(x)); },
      toggle(c, v) { (v === undefined ? !classes.has(c) : v) ? classes.add(c) : classes.delete(c); },
      contains(c) { return classes.has(c); },
    },
    appendChild(c) { el.children.push(c); return c; },
    append(...c) { el.children.push(...c); },
    addEventListener(nom, f) { (el.ecouteurs[nom] = el.ecouteurs[nom] || []).push(f); },
    removeAttribute() {},
    setAttribute() {},
    remove() {},
    focus() { el.focusRecu = true; },
  };
  return el;
}

/* Le générateur du tirage : reproductible, donc un échec se rejoue. */
function hasardFige(graine) {
  let a = graine >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function charge() {
  const registre = {};
  const horloge = { t: 0 };
  const minuteries = new Map();
  let prochaine = 1;

  const contexte = {
    console, Math, JSON, Set, Map, Number, String, Array, Object, Infinity, Date,
    performance: { now: () => horloge.t },
    /* Les minuteries sont mises de côté au lieu d'être lancées : le banc
       décide lui-même quand le battement de fermeture s'écoule. */
    setTimeout(f, d) { minuteries.set(prochaine, { f, d }); return prochaine++; },
    clearTimeout(id) { minuteries.delete(id); },
    setInterval() { return 0; },
    clearInterval() {},
    localStorage: {
      donnees: {},
      getItem(k) { return Object.prototype.hasOwnProperty.call(this.donnees, k) ? this.donnees[k] : null; },
      setItem(k, v) { this.donnees[k] = String(v); },
      removeItem(k) { delete this.donnees[k]; },
    },
    document: {
      body: fauxElement(),
      getElementById: (id) => (registre[id] = registre[id] || fauxElement()),
      createElement: () => fauxElement(),
      addEventListener() {},
    },
  };
  contexte.window = contexte;
  contexte.window.matchMedia = () => ({ matches: false });
  vm.createContext(contexte);

  vm.runInContext(fs.readFileSync(path.join(RACINE, "shared/perso.js"), "utf8"), contexte, {
    filename: "perso.js",
  });
  vm.runInContext(fs.readFileSync(path.join(DOSSIER, "cartes.js"), "utf8"), contexte, {
    filename: "cartes.js",
  });
  vm.runInContext(fs.readFileSync(path.join(DOSSIER, "main.js"), "utf8"), contexte, {
    filename: "main.js",
  });

  return {
    horloge,
    registre,
    /* Fait s'écouler toutes les minuteries en attente. */
    ecoule() {
      const enCours = [...minuteries.values()];
      minuteries.clear();
      enCours.forEach((m) => m.f());
    },
    lit: (expression) => vm.runInContext(expression, contexte),
  };
}

/* --------------------------------------------------------- */
const reussies = [];
const echouees = [];
const verifie = (nom, condition, detail) =>
  (condition ? reussies : echouees).push(nom + (detail ? " — " + detail : ""));

const jeu = charge();
const MOTIFS = jeu.lit("MOTIFS");
const DUOS = jeu.lit("DUOS");
const NIVEAUX = jeu.lit("NIVEAUX");
const REGLAGES = jeu.lit("REGLAGES");
const MENTIONS = jeu.lit("MENTIONS");
const etat = jeu.lit("etat");
const demarre = jeu.lit("demarre");
const clique = jeu.lit("clique");
const distribue = jeu.lit("distribue");
const mention = jeu.lit("mention");

/* ===================== Le casting ===================== */
{
  const ids = MOTIFS.map((m) => m.id);
  verifie("aucun identifiant en double", new Set(ids).size === ids.length);

  verifie("chaque motif a un dessin SVG",
    MOTIFS.every((m) => typeof m.svg === "string" && m.svg.indexOf("<svg") === 0 && m.svg.endsWith("</svg>")));

  verifie("tous les dessins tiennent dans le cadre commun 48 × 72",
    MOTIFS.every((m) => m.svg.indexOf('viewBox="0 0 48 72"') > 0));

  verifie("chaque motif a un nom, une teinte et une famille",
    MOTIFS.every((m) => m.nom && /^#[0-9a-f]{6}$/i.test(m.fond) && m.famille));

  /* Le casting doit être celui du portail : les quatre têtes d'affiche, les
     personnages des autres jeux, et tout ce qui y sert d'ennemi. */
  const attendus = [
    "drew", "glinda", "elias", "eoghan", "boq", "mads", "mamie",
    "nils", "elphie", "cafard", "oiseau", "lutin", "ange",
    "gris", "ovni", "silhouette", "oeil", "chevre", "ombre",
    "pennywise", "slenderman", "toto",
  ];
  const manquants = attendus.filter((id) => ids.indexOf(id) < 0);
  verifie("tout le casting du portail est sur le tapis", manquants.length === 0,
    manquants.length ? "manque : " + manquants.join(", ") : attendus.length + " tetes");
}

/* ===================== Les duos ===================== */
{
  verifie("assez de duos pour la plus grande grille",
    DUOS.length >= NIVEAUX[NIVEAUX.length - 1].duos,
    DUOS.length + " duos");

  const connus = new Set(MOTIFS.map((m) => m.id));
  const inconnus = [];
  DUOS.forEach((d) => {
    if (!connus.has(d.a)) inconnus.push(d.a);
    if (!connus.has(d.b)) inconnus.push(d.b);
  });
  verifie("chaque moitie de duo est un motif existant", inconnus.length === 0,
    inconnus.join(", "));

  /* Un motif qui appartiendrait a deux duos rendrait une paire ambigue :
     deux cartes differentes iraient avec la meme troisieme. */
  const employes = [];
  DUOS.forEach((d) => employes.push(d.a, d.b));
  const doublons = employes.filter((id, i) => employes.indexOf(id) !== i);
  verifie("aucun motif ne sert dans deux duos", doublons.length === 0, doublons.join(", "));

  verifie("aucun duo ne s'apparie avec lui-meme", DUOS.every((d) => d.a !== d.b));

  verifie("chaque duo explique son lien",
    DUOS.every((d) => typeof d.replique === "string" && d.replique.length > 15));

  verifie("tout le casting sert : aucun motif orphelin",
    employes.length === MOTIFS.length,
    MOTIFS.length + " motifs pour " + DUOS.length + " duos");
}

/* ===================== Les grilles ===================== */
{
  NIVEAUX.forEach((n) => {
    const cases = n.colonnes * n.rangees;
    verifie("« " + n.nom + " » : la grille tombe juste",
      cases === n.duos * 2,
      cases + " cases pour " + n.duos + " duos");
    verifie("« " + n.nom + " » : le casting suffit a la remplir", n.duos <= DUOS.length);
  });

  for (let i = 1; i < NIVEAUX.length; i++) {
    const avant = NIVEAUX[i - 1];
    const apres = NIVEAUX[i];
    verifie("la grille grandit : " + avant.nom + " → " + apres.nom,
      apres.duos > avant.duos, avant.duos + " → " + apres.duos + " duos");
    verifie("le temps de reference suit la taille : " + apres.nom,
      apres.cible_s > avant.cible_s);
  }
}

/* ===================== La distribution ===================== */
{
  const niveau = NIVEAUX[2];
  const tapis = distribue(niveau, hasardFige(7));

  verifie("le tapis a exactement le bon nombre de cartes",
    tapis.length === niveau.colonnes * niveau.rangees, tapis.length + " cartes");

  const comptes = {};
  tapis.forEach((c) => {
    comptes[c.motif.id] = (comptes[c.motif.id] || 0) + 1;
  });
  verifie("aucun dessin n'apparait deux fois sur le tapis",
    Object.keys(comptes).every((id) => comptes[id] === 1),
    Object.keys(comptes).length + " dessins tous differents");

  const parDuo = {};
  tapis.forEach((c) => (parDuo[c.duo] = (parDuo[c.duo] || 0) + 1));
  verifie("chaque duo est present en deux moities",
    Object.keys(parDuo).length === niveau.duos &&
      Object.keys(parDuo).every((d) => parDuo[d] === 2));

  verifie("les deux moities d'un duo sont bien les deux motifs declares",
    Object.keys(parDuo).every((d) => {
      const paire = tapis.filter((c) => String(c.duo) === d).map((c) => c.motif.id).sort();
      return DUOS.some((duo) => [duo.a, duo.b].sort().join() === paire.join());
    }));

  verifie("chaque carte porte la phrase de son duo",
    tapis.every((c) => typeof c.lien === "string" && c.lien.length > 15));

  verifie("les cartes demarrent toutes face cachee",
    tapis.every((c) => !c.ouverte && !c.resolue));

  /* Deux tirages de suite ne doivent pas donner le meme tapis. */
  const cle = (t) => t.map((c) => c.motif.id).join("|");
  verifie("deux distributions successives different",
    cle(distribue(niveau, hasardFige(1))) !== cle(distribue(niveau, hasardFige(2))));

  /* Et la composition change : sur une grille qui ne prend pas tous les
     duos, ceux qui sortent doivent varier d'une partie a l'autre. */
  const composition = (graine) =>
    distribue(niveau, hasardFige(graine)).map((c) => c.motif.id).sort().join();
  let compositionsDifferentes = false;
  for (let g = 0; g < 20 && !compositionsDifferentes; g++) {
    if (composition(g) !== composition(g + 50)) compositionsDifferentes = true;
  }
  verifie("les duos presents changent d'une partie a l'autre", compositionsDifferentes);
}

/* ===================== La regle des deux cartes ===================== */
{
  jeu.horloge.t = 1000;
  demarre(NIVEAUX[0], hasardFige(42));

  const moitiesDe = (duo) => etat.cartes.filter((c) => c.duo === duo).map((c) => c.index);

  verifie("la partie demarre", etat.enCours && etat.coups === 0 && etat.score === 0);
  verifie("le tapis est distribue", etat.cartes.length === 12);

  /* --- Deux cartes qui ne vont pas ensemble --- */
  const a = etat.cartes[0];
  const b = etat.cartes.find((c) => c.duo !== a.duo);
  clique(a.index);
  verifie("la premiere carte se retourne", etat.cartes[a.index].ouverte);
  verifie("retourner une seule carte ne coute pas de coup", etat.coups === 0);
  clique(b.index);
  verifie("la deuxieme carte compte un coup", etat.coups === 1);
  verifie("les deux cartes restent lisibles avant de se refermer",
    etat.cartes[a.index].ouverte && etat.cartes[b.index].ouverte);
  verifie("une fermeture est programmee", !!etat.attente);
  jeu.ecoule();
  verifie("les cartes se referment apres le battement",
    !etat.cartes[a.index].ouverte && !etat.cartes[b.index].ouverte);
  verifie("une erreur ne rapporte rien", etat.score === 0 && etat.duos === 0);

  /* --- Recliquer pendant le battement ne doit pas etre ignore --- */
  clique(a.index);
  clique(b.index);
  const troisieme = etat.cartes.find((c) => c.index !== a.index && c.index !== b.index);
  clique(troisieme.index);
  verifie("un clic pendant le battement referme et prend le clic",
    !etat.cartes[a.index].ouverte && etat.cartes[troisieme.index].ouverte);
  jeu.ecoule();
  etat.cartes.forEach((c) => {
    if (!c.resolue) c.ouverte = false;
  });
  etat.choix.length = 0;

  /* --- Un vrai duo : deux dessins DIFFERENTS qui vont ensemble --- */
  const duo = moitiesDe(etat.cartes[0].duo);
  const scoreAvant = etat.score;
  verifie("les deux moities d'un duo ne se ressemblent pas",
    etat.cartes[duo[0]].motif.id !== etat.cartes[duo[1]].motif.id,
    etat.cartes[duo[0]].motif.nom + " + " + etat.cartes[duo[1]].motif.nom);
  clique(duo[0]);
  clique(duo[1]);
  verifie("un duo reforme reste sur la table",
    etat.cartes[duo[0]].resolue && etat.cartes[duo[1]].resolue);
  verifie("un duo rapporte ses points", etat.score === scoreAvant + REGLAGES.pointsDuo);
  verifie("un duo ne programme aucune fermeture", !etat.attente);
  verifie("le compteur de duos monte", etat.duos === 1);
  verifie("la serie demarre a 1", etat.serie === 1);

  /* --- Recliquer une carte deja reglee ne fait rien --- */
  const coupsAvant = etat.coups;
  verifie("une carte deja reglee ne se reclique pas", clique(duo[0]) === false);
  verifie("... et ne coute pas de coup", etat.coups === coupsAvant);

  /* --- La serie, et sa remise a zero --- */
  const suivant = etat.cartes.find((c) => !c.resolue);
  const duo2 = moitiesDe(suivant.duo);
  clique(duo2[0]);
  clique(duo2[1]);
  verifie("deux duos d'affilee font une serie de 2", etat.serie === 2);
  verifie("la serie ajoute son bonus",
    etat.score === scoreAvant + 2 * REGLAGES.pointsDuo + REGLAGES.bonusSerie,
    etat.score + " pts");

  const scoreAvantRate = etat.score;
  const restes = etat.cartes.filter((c) => !c.resolue);
  const x = restes[0];
  const y = restes.find((c) => c.duo !== x.duo);
  clique(x.index);
  clique(y.index);
  verifie("une erreur casse la serie", etat.serie === 0);
  verifie("une erreur ne retire aucun point", etat.score === scoreAvantRate);
  jeu.ecoule();
}

/* ===================== Une partie menee jusqu'au bout ===================== */
{
  jeu.horloge.t = 5000;
  demarre(NIVEAUX[1], hasardFige(11));
  const niveau = etat.niveau;

  /* Un joueur qui connait le tapis ET les duos : il ne joue que des paires
     justes. C'est le cas parfait. */
  const parDuo = {};
  etat.cartes.forEach((c) => {
    (parDuo[c.duo] = parDuo[c.duo] || []).push(c.index);
  });

  Object.keys(parDuo).forEach((d) => {
    jeu.horloge.t += 900;
    clique(parDuo[d][0]);
    clique(parDuo[d][1]);
  });

  verifie("la partie se termine quand tous les duos sont reformes",
    !etat.enCours && etat.fini);
  verifie("aucun coup gaspille pour un joueur parfait", etat.coups === niveau.duos,
    etat.coups + " coups pour " + niveau.duos + " duos");
  verifie("toutes les cartes sont reglees", etat.cartes.every((c) => c.resolue));
  verifie("le bonus de rapidite est verse", etat.bonusTemps > 0, "+" + etat.bonusTemps);
  verifie("le chrono est arrete et coherent",
    etat.temps_ms > 0 && etat.temps_ms < niveau.cible_s * 1000,
    Math.round(etat.temps_ms / 1000) + " s");
  verifie("la meilleure serie vaut le nombre de duos",
    etat.meilleureSerie === niveau.duos);
  verifie("la mention la plus haute recompense la partie parfaite",
    mention() === MENTIONS[0], mention().titre);
  verifie("le record est enregistre", etat.record && etat.record.premier === true);
  verifie("plus rien ne se clique apres la fin", clique(0) === false);

  /* Le record ne doit pas etre ecrase par une partie moins bonne. */
  const meilleur = etat.score;
  jeu.horloge.t += 1000;
  demarre(niveau, hasardFige(12));
  const parDuo2 = {};
  etat.cartes.forEach((c) => {
    (parDuo2[c.duo] = parDuo2[c.duo] || []).push(c.index);
  });
  /* Cette fois on se trompe une fois par duo, et on met quatre fois plus de
     temps : meme grille, partie plus laborieuse. */
  const duos2 = Object.keys(parDuo2);
  duos2.forEach((d, rang) => {
    jeu.horloge.t += 4000;
    const autre = duos2[(rang + 1) % duos2.length];
    if (autre !== d) {
      clique(parDuo2[d][0]);
      clique(parDuo2[autre][0]);
      jeu.ecoule();
    }
    clique(parDuo2[d][0]);
    clique(parDuo2[d][1]);
  });
  verifie("se tromper coute des coups", etat.coups > niveau.duos, etat.coups + " coups");
  verifie("le record n'est pas ecrase par une partie moins bonne",
    etat.score < meilleur && etat.record.bat === false,
    etat.score + " pts contre " + meilleur);
  verifie("une partie laborieuse recolte une mention plus modeste",
    mention() !== MENTIONS[0], mention().titre);
}

/* --------------------------------------------------------- */
console.log("\n=== UMA Memory — banc d'essai ===\n");
reussies.forEach((n) => console.log("  OK    " + n));
echouees.forEach((n) => console.log("  ECHEC " + n));
console.log(
  "\n" + reussies.length + " verification(s) passee(s), " + echouees.length + " echouee(s).\n"
);
process.exit(echouees.length ? 1 : 0);
