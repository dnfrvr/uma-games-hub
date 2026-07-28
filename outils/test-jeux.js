/* =========================================================
   Bancs d'essai headless des trois jeux du hub.
   Charge shared/perso.js + les fichiers du jeu dans un faux DOM,
   puis vérifie les règles sans navigateur.
   ========================================================= */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function fakeEl() {
  const set = new Set();
  return {
    children: [], className: "", textContent: "", innerHTML: "", title: "", type: "",
    offsetWidth: 0, hidden: false,
    style: { setProperty() {}, removeProperty() {} },
    dataset: {},
    classList: {
      add(...c) { c.forEach((x) => set.add(x)); },
      remove(...c) { c.forEach((x) => set.delete(x)); },
      toggle(c, v) { (v === undefined ? !set.has(c) : v) ? set.add(c) : set.delete(c); },
      contains(c) { return set.has(c); },
    },
    appendChild(c) { this.children.push(c); return c; },
    append(...c) { this.children.push(...c); },
    addEventListener() {}, removeAttribute() {}, setAttribute() {}, remove() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 320 }; },
  };
}

function charge(dossier) {
  const registre = {};
  const horloge = { t: 0 };
  const ctx = {
    console, Math, JSON, Set, Map, Number, String, Array, Object,
    performance: { now: () => horloge.t },
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    AudioContext: function () {
      return {
        state: "running", currentTime: 0, resume() {},
        createOscillator: () => ({ frequency: {}, connect: () => ({ connect() {} }), start() {}, stop() {} }),
        createGain: () => ({ gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: () => ({ connect() {} }) }),
        destination: {},
      };
    },
    document: {
      body: fakeEl(),
      getElementById: (id) => (registre[id] = registre[id] || fakeEl()),
      createElement: () => fakeEl(),
      addEventListener() {},
    },
  };
  ctx.window = ctx;
  ctx.window.matchMedia = () => ({ matches: false });
  ctx.window.AudioContext = ctx.AudioContext;
  vm.createContext(ctx);

  vm.runInContext(fs.readFileSync("shared/perso.js", "utf8"), ctx, { filename: "perso.js" });
  for (const f of fs.readdirSync(dossier).filter((f) => f.endsWith(".js") && f !== "main.js")) {
    vm.runInContext(fs.readFileSync(path.join(dossier, f), "utf8"), ctx, { filename: f });
  }
  vm.runInContext(fs.readFileSync(path.join(dossier, "main.js"), "utf8"), ctx, { filename: "main.js" });

  return { ctx, horloge, lit: (e) => vm.runInContext(e, ctx) };
}

const ok = [], ko = [];
const verifie = (nom, cond, detail) => (cond ? ok : ko).push(nom + (detail ? " — " + detail : ""));

/* ===================== La fabrique de personnages ===================== */
{
  const { lit } = charge("games/glinda-cheer");
  const persoSVG = lit("persoSVG");
  const spectateurSVG = lit("spectateurSVG");

  const svg = persoSVG({ cheveux: "queue", jupe: "#e91e8c", pompons: "#ffd84d", pose: "pompons-haut" });
  verifie("le personnage est un SVG complet", svg.startsWith("<svg") && svg.endsWith("</svg>"));
  verifie("la jupe est dessinée", svg.includes("#e91e8c"));
  verifie("les pompons sont dessinés", svg.split("#ffd84d").length > 2);
  verifie("chaque pose change le dessin",
    persoSVG({ pose: "pompons-gauche" }) !== persoSVG({ pose: "pompons-droite" }));
  verifie("le spectateur est plus léger que le personnage",
    spectateurSVG("#fff").length < svg.length);
}

/* ===================== Pep Rally Rhythm ===================== */
{
  const { lit, horloge } = charge("games/glinda-cheer");
  const CHARTS = lit("CHARTS"), etat = lit("etat");
  const demarre = lit("demarre"), joue = lit("joue"), boucle = lit("boucle");
  const multiplicateur = lit("multiplicateur"), majHype = lit("majHype");

  verifie("3 chorégraphies", CHARTS.length === 3);
  verifie("les notes sont chronologiques",
    CHARTS[0].notes.every((n, i, a) => i === 0 || n.temps_ms >= a[i - 1].temps_ms));
  verifie("la difficulté monte", CHARTS[2].notes.length > CHARTS[0].notes.length,
    CHARTS[0].notes.length + " → " + CHARTS[2].notes.length);

  horloge.t = 10000;
  demarre(CHARTS[0]);
  const n0 = etat.notes[0];
  horloge.t = 10000 + n0.temps_ms;
  joue(n0.touche);
  verifie("note frappée pile = parfait à 300 points", etat.stats.parfait === 1 && etat.score === 300);

  const n1 = etat.notes[1];
  horloge.t = 10000 + n1.temps_ms + 80;
  joue(n1.touche);
  verifie("note frappée à 80 ms = bien", etat.stats.bien === 1);

  const scoreAvant = etat.score;
  horloge.t += 5000;
  joue("gauche");
  verifie("frappe dans le vide : score inchangé, combo cassé", etat.score === scoreAvant && etat.combo === 0);

  const ratesAvant = etat.stats.rate;
  horloge.t = 10000 + CHARTS[0].notes[10].temps_ms + 5000;
  boucle(horloge.t);
  verifie("les notes dépassées sont ratées", etat.stats.rate > ratesAvant);

  etat.combo = 25;
  verifie("multiplicateur ×3 à 25 de combo", multiplicateur() === 3);
  etat.combo = 200;
  verifie("multiplicateur plafonné à ×4", multiplicateur() === 4);

  majHype(1000);
  verifie("la hype ne dépasse pas 100", etat.hype === 100);
  majHype(-1000);
  verifie("la hype ne descend pas sous 0", etat.hype === 0);
}

/* ===================== Sanity Whack ===================== */
{
  const { lit } = charge("games/elias-whack");
  const etat = lit("etat"), demarre = lit("demarre"), frappe = lit("frappe");
  const trous = lit("trous"), CIBLES = lit("CIBLES"), PIEGES = lit("PIEGES");
  const majSanity = lit("majSanity");

  verifie("12 trous", trous.length === 12);
  verifie("casting complet", CIBLES.length === 8 && PIEGES.length === 6,
    CIBLES.length + " cibles, " + PIEGES.length + " pièges");
  verifie("chaque créature a son dessin",
    CIBLES.concat(PIEGES).every((c) => typeof c.svg === "string" && c.svg.includes("<svg")));
  verifie("chaque apparition a une réplique d'Elias",
    CIBLES.concat(PIEGES).every((c) => typeof c.replique === "string" && c.replique.length > 5));
  verifie("les amis du hub sont bien des pièges",
    ["drew", "eoghan", "glinda"].every((id) => PIEGES.some((p) => p.id === id)));

  demarre();
  trous[0].occupant = { ...CIBLES[0], piege: false };
  frappe(0);
  verifie("taper une créature rapporte ses points", etat.score === CIBLES[0].points);
  verifie("le trou se vide", trous[0].occupant === null);

  const sanityAvant = etat.sanity;
  trous[1].occupant = { ...PIEGES[0], piege: true };
  frappe(1);
  verifie("taper un innocent fait monter la sanity", etat.sanity > sanityAvant);

  etat.score = 10;
  trous[2].occupant = { ...PIEGES[1], piege: true };
  frappe(2);
  verifie("le score ne descend jamais sous zéro", etat.score === 0);

  majSanity(1000);
  verifie("game over à sanity maximale", !etat.enCours);
}

/* ===================== Kiss & Cache (vue de côté) ===================== */
{
  const { lit, horloge } = charge("games/eoghan-office");
  const DECORS = lit("DECORS"), etat = lit("etat"), PROPS = lit("PROPS");
  const demarre = lit("demarre"), bougeEoghan = lit("bougeEoghan"), changePlan = lit("changePlan");
  const gereDetection = lit("gereDetection"), tenteBisou = lit("tenteBisou");
  const avanceBisou = lit("avanceBisou"), bourde = lit("bourde"), vueBloquee = lit("vueBloquee");

  verifie("3 décors", DECORS.length === 3);
  verifie("chaque meuble a un dessin",
    Object.values(PROPS).every((p) => p.svg.includes("<svg") && p.largeur > 0));

  horloge.t = 1000;
  demarre(DECORS[0]);
  verifie("les garçons sont placés", etat.garcons.length === 3);
  verifie("les PNJ sont placés", etat.pnj.length === 3);
  verifie("le mobilier est posé", etat.props.length === 5);
  verifie("Eoghan démarre à sa place", etat.eoghan.x === 80 && etat.eoghan.plan === 0);

  // Déplacement
  etat.touches.add("droite");
  bougeEoghan(0.5);
  verifie("Eoghan marche vers la droite", etat.eoghan.x > 80, "x = " + Math.round(etat.eoghan.x));
  etat.touches.clear();

  etat.eoghan.x = 5;
  etat.touches.add("gauche");
  bougeEoghan(1);
  verifie("Eoghan ne sort pas de la salle", etat.eoghan.x >= 30, "x = " + Math.round(etat.eoghan.x));
  etat.touches.clear();

  changePlan(1);
  verifie("le changement de rangée fonctionne", etat.eoghan.plan === 1);
  changePlan(1);
  verifie("il n'y a que deux rangées", etat.eoghan.plan === 1);
  changePlan(-1);

  /* Ligne de vue : un meuble haut (arbre, casier, canapé) coupe la vue, un
     meuble bas (banc) ne la coupe pas — il sert seulement de cachette. */
  const pnjTest = etat.pnj[1];
  pnjTest.plan = 1; // le plan des arbres du campus
  pnjTest.x = 200;
  pnjTest.dir = 1;
  verifie("un meuble haut coupe la vue", vueBloquee(pnjTest, 900), "arbre à x=620");
  verifie("sans obstacle, la vue passe", !vueBloquee(pnjTest, 400));

  pnjTest.plan = 0; // le plan des bancs
  verifie("un banc ne coupe pas la vue (il sert de cachette)", !vueBloquee(pnjTest, 900));

  // Détection : Eoghan planté dans le champ de vision
  etat.eoghan.plan = 0;
  etat.eoghan.x = 260;
  etat.eoghan.accroupi = false;
  etat.exposition = 0;
  const ragotsAvant = etat.ragots;
  for (let i = 0; i < 12; i++) { horloge.t += 100; gereDetection(horloge.t, 0.1); }
  verifie("rester dans un faisceau finit par se voir", etat.ragots === ragotsAvant + 1,
    "ragots = " + etat.ragots);

  // Bisou
  etat.pnj.forEach((p) => (p.portee = 0)); // plus personne ne regarde
  etat.alerteJusqua = 0;
  const cible = etat.garcons[0];
  etat.eoghan.plan = cible.plan;
  etat.eoghan.x = cible.x - 40;
  tenteBisou();
  verifie("le bisou démarre au contact", !!etat.bisou);

  const scoreAvant = etat.score;
  for (let i = 0; i < 14 && etat.bisou; i++) { horloge.t += 100; avanceBisou(100); }
  verifie("le garçon est embrassé", cible.embrasse);
  verifie("le score monte", etat.score > scoreAvant, etat.score + " pts");
  verifie("pas de second bisou sur le même garçon", (tenteBisou(), !etat.bisou));

  // Se faire voir pendant un bisou = repérage immédiat
  const cible2 = etat.garcons[1];
  etat.eoghan.plan = cible2.plan;
  etat.eoghan.x = cible2.x - 40;
  etat.exposition = 0;
  tenteBisou();
  const ragotsAvant2 = etat.ragots;
  etat.pnj[0].plan = etat.eoghan.plan;
  etat.pnj[0].x = etat.eoghan.x - 100;
  etat.pnj[0].dir = 1;
  etat.pnj[0].portee = 400;
  horloge.t += 100;
  gereDetection(horloge.t, 0.1);
  verifie("être vu pendant un bisou coupe tout", !etat.bisou && etat.ragots === ragotsAvant2 + 1);

  // Victoire
  etat.enCours = true;
  etat.pnj.forEach((p) => (p.portee = 0));
  etat.garcons.forEach((g) => (g.embrasse = true));
  const dernier = etat.garcons[2];
  dernier.embrasse = false;
  etat.eoghan.plan = dernier.plan;
  etat.eoghan.x = dernier.x - 40;
  tenteBisou();
  for (let i = 0; i < 14 && etat.bisou; i++) { horloge.t += 100; avanceBisou(100); }
  verifie("la partie se termine quand tout le monde est embrassé", !etat.enCours);
  verifie("le bonus rapidité est ajouté", etat.score > 300, etat.score + " pts");

  // Game over aux ragots
  demarre(DECORS[2]); // vestiaire : 2 ragots max
  bourde("test");
  verifie("1er cran : la partie continue", etat.enCours);
  bourde("test");
  verifie("game over au dernier cran", !etat.enCours);
}

console.log("\n=== Bancs d'essai des trois jeux ===");
ok.forEach((t) => console.log("  OK    " + t));
ko.forEach((t) => console.log("  ÉCHEC " + t));
console.log("\n" + ok.length + " vérifications passées, " + ko.length + " échouées.");
process.exit(ko.length ? 1 : 0);
