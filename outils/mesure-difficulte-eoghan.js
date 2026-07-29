/* Mesure la difficulté réelle des décors de Kiss & Cache :
   un bot fonce vers le garçon le plus proche et embrasse dès qu'il peut.
   On regarde combien de fois il se fait repérer et s'il finit la partie. */
const fs = require("fs");
const vm = require("vm");

function fakeEl() {
  const set = new Set();
  return {
    children: [], className: "", textContent: "", innerHTML: "", title: "", offsetWidth: 0,
    style: { setProperty() {}, removeProperty() {} }, dataset: {},
    classList: { add(...c) { c.forEach((x) => set.add(x)); }, remove(...c) { c.forEach((x) => set.delete(x)); },
      toggle(c, v) { (v === undefined ? !set.has(c) : v) ? set.add(c) : set.delete(c); }, contains(c) { return set.has(c); } },
    appendChild(c) { return c; }, append() {},
    addEventListener() {}, removeAttribute() {}, setAttribute() {}, remove() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 320 }; },
  };
}

function charge() {
  const reg = {};
  const h = { t: 0 };
  const ctx = {
    console, Math, JSON, Set, Map, Number, String, Array, Object,
    performance: { now: () => h.t },
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    document: { body: fakeEl(), getElementById: (id) => (reg[id] = reg[id] || fakeEl()),
      createElement: () => fakeEl(), addEventListener() {} },
  };
  ctx.window = ctx;
  ctx.window.matchMedia = () => ({ matches: false });
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync("shared/perso.js", "utf8"), ctx);
  vm.runInContext(fs.readFileSync("games/eoghan-office/decors.js", "utf8"), ctx);
  vm.runInContext(fs.readFileSync("games/eoghan-office/main.js", "utf8"), ctx);
  return { h, lit: (e) => vm.runInContext(e, ctx) };
}

const DT = 0.05; // 20 images par seconde simulées

/* Couverture : quelle part de la salle est surveillée, en moyenne dans le
   temps ? C'est une propriété du décor seul, indépendante du joueur. */
function couverture(indexDecor) {
  const { h, lit } = charge();
  const DECORS = lit("DECORS"), etat = lit("etat");
  const demarre = lit("demarre"), bougePnj = lit("bougePnj"), gereGimmick = lit("gereGimmick");
  const gereDetection = lit("gereDetection");
  const decor = DECORS[indexDecor];

  h.t = 1000;
  demarre(decor);
  etat.decor = { ...decor, ragots_max: 99999 }; // le bot ne meurt pas

  const PAS = 25;
  let vues = 0, total = 0;

  for (let i = 0; i < decor.chrono_s * 20; i++) {
    h.t += 50;
    gereGimmick(h.t, 0.05);
    etat.pnj.forEach((p) => bougePnj(p, 0.05, h.t));

    for (let plan = 0; plan <= 1; plan++) {
      for (let x = 30; x < 1000; x += PAS) {
        etat.eoghan.x = x;
        etat.eoghan.plan = plan;
        etat.exposition = 0;
        gereDetection(h.t, 0.05);
        if (etat.vu) vues++;
        total++;
      }
    }
  }
  return (vues / total) * 100;
}

function simule(indexDecor, graine) {
  const { h, lit } = charge();
  const DECORS = lit("DECORS"), etat = lit("etat");
  const demarre = lit("demarre"), bougeEoghan = lit("bougeEoghan"), changePlan = lit("changePlan");
  const gereDetection = lit("gereDetection"), tenteBisou = lit("tenteBisou"), avanceBisou = lit("avanceBisou");
  const bougePnj = lit("bougePnj"), gereGimmick = lit("gereGimmick");
  const decor = DECORS[indexDecor];

  h.t = 1000 + graine * 137; // décale le départ : les PNJ ne sont pas en phase
  demarre(decor);
  etat.decor = { ...decor, ragots_max: 99999 }; // on veut la partie entière

  let tempsVu = 0;
  let tours = 0;
  let dernierEssai = 0;
  const debut = h.t;

  while (etat.enCours && h.t - debut < decor.chrono_s * 1000) {
    h.t += DT * 1000;
    tours++;

    gereGimmick(h.t, DT);
    etat.pnj.forEach((p) => bougePnj(p, DT, h.t));

    // Le bot vise le garçon libre le plus proche.
    const cible = etat.garcons.filter((g) => !g.embrasse)
      .sort((a, b) => Math.abs(a.x - etat.eoghan.x) - Math.abs(b.x - etat.eoghan.x))[0];

    if (cible) {
      if (cible.plan !== etat.eoghan.plan) changePlan(cible.plan - etat.eoghan.plan);
      const dx = cible.x - etat.eoghan.x;
      etat.touches.clear();
      if (Math.abs(dx) > 60) etat.touches.add(dx > 0 ? "droite" : "gauche");
      else if (!etat.bisou && h.t > (dernierEssai + 400)) { dernierEssai = h.t; tenteBisou(); }
    }

    bougeEoghan(DT);
    if (etat.bisou) avanceBisou(DT * 1000);
    gereDetection(h.t, DT);
    if (etat.vu) tempsVu++;
  }

  return {
    fini: etat.garcons.every((g) => g.embrasse),
    ragots: etat.ragots,
    score: etat.score,
    exposition: (tempsVu / tours) * 100,
    restants: etat.garcons.filter((g) => !g.embrasse).length,
  };
}

console.log("décor                  | salle surveillée | repérages du bot | bisous pris | chrono");
/* La liste des décors est lue depuis le jeu : un terrain de plus se mesure
   sans toucher à ce banc d'essai. */
charge().lit("DECORS").map((_, i) => i).forEach((i) => {
  const { lit } = charge();
  const decor = lit("DECORS")[i];
  const cov = couverture(i);
  const runs = [];
  for (let g = 0; g < 8; g++) runs.push(simule(i, g));
  const moy = (f) => runs.reduce((s, r) => s + f(r), 0) / runs.length;
  console.log(
    decor.titre.padEnd(22),
    (cov.toFixed(1) + " %").padEnd(18),
    moy((r) => r.ragots).toFixed(1).padEnd(18),
    (decor.garcons.length - moy((r) => r.restants)).toFixed(1).padEnd(12),
    decor.chrono_s + " s"
  );
});
