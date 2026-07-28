/* =========================================================
   Kiss & Cache — moteur de jeu (vue de côté)
   ---------------------------------------------------------
   La salle fait LARGEUR_SALLE unités de large et compte deux plans de
   profondeur : 0 = devant (près de la caméra), 1 = derrière. Eoghan marche
   de gauche à droite et change de plan avec ↑/↓.

   Chaque PNJ tient son téléphone et cadre dans une direction, dans SON plan
   uniquement, sur une certaine portée. Le champ de la caméra est toujours
   dessiné à l'écran : c'est un jeu de timing, jamais une devinette. Si
   Eoghan y reste, le snap part — et avec lui un cran de ragots.
   ========================================================= */

const VITESSE = 210;        // unités par seconde
const VITESSE_ACCROUPI = 95;
const PORTEE_BISOU = 78;    // distance à laquelle on peut embrasser
const EXPOSITION_MAX = 900; // temps toléré dans un faisceau, hors bisou
const ALERTE_MS = 3000;
const RAYON_CACHETTE = 90;  // distance à un meuble pour s'y planquer accroupi

const RANGS = [
  { min: 900, texte: "Fantôme romantique 👻💗" },
  { min: 500, texte: "Discret… ish" },
  { min: 1, texte: "Tout le monde a vu" },
  { min: 0, texte: "Personne n'a rien vu. Il ne s'est rien passé non plus." },
];

const $ = (id) => document.getElementById(id);

const elements = {
  salle: $("salle"),
  fond: $("fond"),
  props: $("props"),
  acteurs: $("acteurs"),
  faisceaux: $("faisceaux"),
  chrono: $("chrono"),
  score: $("score"),
  combo: $("combo"),
  restants: $("restants"),
  ragots: $("ragots"),
  ambiance: $("ambiance"),
  commentaire: $("commentaire"),
  ecran: $("ecran"),
  ecranTitre: $("ecran-titre"),
  ecranTexte: $("ecran-texte"),
  ecranDecors: $("ecran-decors"),
};

/* =========================================================
   État
   ========================================================= */

const etat = {
  decor: null,
  eoghan: { x: 80, plan: 0, dir: 1, accroupi: false, el: null, marche: false },
  garcons: [],
  pnj: [],
  props: [],
  enCours: false,
  boucle: null,
  dernierTemps: 0,
  finChrono: 0,
  score: 0,
  combo: 0,
  ragots: 0,
  exposition: 0,
  bisou: null,
  vu: false,
  alerteJusqua: 0,
  flashJusqua: 0,
  prochainGimmick: 0,
  douche: null,
  touches: new Set(),
};

/* =========================================================
   Construction de la scène
   ========================================================= */

function pourcent(x) {
  return (x / LARGEUR_SALLE) * 100;
}

/* Le plan arrière est plus haut à l'écran et légèrement plus petit :
   c'est ce qui donne la profondeur de la salle. */
function ancrage(plan) {
  return plan === 1 ? { bas: 46, echelle: 0.82 } : { bas: 8, echelle: 1 };
}

function poseActeur(el, x, plan, dir, echelleSup) {
  const a = ancrage(plan);
  el.style.left = pourcent(x) + "%";
  el.style.bottom = a.bas + "%";
  el.style.transform =
    "translateX(-50%) scale(" + (a.echelle * (echelleSup || 1)) * (dir < 0 ? -1 : 1) + "," +
    a.echelle * (echelleSup || 1) + ")";
  el.style.zIndex = plan === 1 ? 2 : 5;
}

function chargeDecor(decor) {
  etat.decor = decor;
  etat.garcons = [];
  etat.pnj = [];
  etat.props = [];

  elements.salle.dataset.decor = decor.id;
  elements.salle.style.setProperty("--fond", decor.palette.fond);
  elements.salle.style.setProperty("--sol-arriere", decor.palette.solArriere);
  elements.salle.style.setProperty("--sol-avant", decor.palette.solAvant);
  elements.salle.style.setProperty("--bandeau", decor.palette.bandeau);

  elements.props.innerHTML = "";
  elements.acteurs.innerHTML = "";
  elements.faisceaux.innerHTML = "";

  // --- Mobilier
  decor.props.forEach((modele) => {
    const modeleProp = PROPS[modele.type];
    const el = document.createElement("div");
    el.className = "prop prop-" + modele.type;
    el.innerHTML = modeleProp.svg;
    el.style.width = pourcent(modeleProp.largeur) + "%";
    const a = ancrage(modele.plan);
    el.style.left = pourcent(modele.x) + "%";
    el.style.bottom = a.bas + "%";
    el.style.transform = "translateX(-50%) scale(" + a.echelle + ")";
    el.style.zIndex = modele.plan === 1 ? 1 : 6;
    elements.props.appendChild(el);

    etat.props.push({ ...modele, ...modeleProp, el });
  });

  // --- Garçons
  decor.garcons.forEach((modele) => {
    const el = persoElement({ ...modele.look, bouche: "sourire" }, "acteur acteur-garcon");
    const coeur = document.createElement("span");
    coeur.className = "coeur-cible";
    coeur.textContent = "💗";
    el.appendChild(coeur);
    elements.acteurs.appendChild(el);
    const g = { ...modele, embrasse: false, el, dir: -1 };
    poseActeur(el, g.x, g.plan, 1);
    etat.garcons.push(g);
  });

  // --- PNJ
  decor.pnj.forEach((modele) => {
    const el = persoElement({ ...modele.look, bouche: "neutre", telephone: true }, "acteur acteur-pnj");
    el.title = modele.nom;
    elements.acteurs.appendChild(el);

    const faisceau = document.createElement("div");
    faisceau.className = "faisceau";
    elements.faisceaux.appendChild(faisceau);

    const p = {
      ...modele,
      dir: modele.dir || 1,
      el,
      faisceau,
      compte: 0,
    };
    poseActeur(el, p.x, p.plan, p.dir, modele.petit ? 0.72 : 1);
    etat.pnj.push(p);
  });

  // --- Eoghan
  etat.eoghan.x = decor.eoghan.x;
  etat.eoghan.plan = decor.eoghan.plan;
  etat.eoghan.dir = 1;
  etat.eoghan.accroupi = false;
  etat.eoghan.el = persoElement(
    { peau: "#f0c39a", cheveux: "boucle", couleurCheveux: "#c98a3a", haut: "#00b32d", bas: "#2f3550", bouche: "sourire" },
    "acteur acteur-eoghan"
  );
  elements.acteurs.appendChild(etat.eoghan.el);
  poseActeur(etat.eoghan.el, etat.eoghan.x, etat.eoghan.plan, 1);

  elements.ambiance.textContent = decor.emoji + " " + decor.ambiance;
}

/* Redessine le visage d'un personnage (regard, bouche) sans tout reconstruire. */
function visage(acteur, look, options) {
  acteur.el.innerHTML = persoSVG({ ...look, ...options });
  if (acteur.coeurEl) acteur.el.appendChild(acteur.coeurEl);
}

/* =========================================================
   Partie
   ========================================================= */

function demarre(decor) {
  chargeDecor(decor);

  etat.score = 0;
  etat.combo = 0;
  etat.ragots = 0;
  etat.exposition = 0;
  etat.bisou = null;
  etat.alerteJusqua = 0;
  etat.flashJusqua = 0;
  etat.douche = null;
  etat.enCours = true;
  etat.dernierTemps = performance.now();
  etat.finChrono = etat.dernierTemps + decor.chrono_s * 1000;
  etat.prochainGimmick = etat.dernierTemps + (decor.gimmick === "flash" ? 10000 : 20000);

  elements.ecran.classList.remove("visible");
  commente("Vas-y. Discrètement. Enfin, essaie.");
  majTableau();

  cancelAnimationFrame(etat.boucle);
  etat.boucle = requestAnimationFrame(boucle);
}

function termine(titre, texte, gagne) {
  if (!etat.enCours) return;
  etat.enCours = false;
  cancelAnimationFrame(etat.boucle);
  annuleBisou();
  document.body.classList.remove("repere", "flash");

  const restant = Math.max(0, Math.ceil((etat.finChrono - performance.now()) / 1000));
  if (gagne) etat.score += restant * 5;

  const rang = RANGS.find((r) => etat.score >= r.min);

  elements.ecranTitre.textContent = titre;
  elements.ecranTexte.innerHTML =
    texte +
    "<br /><br /><b>" + etat.score + " points</b>" +
    (gagne ? " (dont " + restant * 5 + " de bonus rapidité)" : "") +
    "<br />" + rang.texte;
  elements.ecran.classList.add("visible");
  majTableau();
}

/* =========================================================
   Boucle de jeu
   ========================================================= */

function boucle(maintenant) {
  if (!etat.enCours) return;

  const dt = Math.min(0.05, (maintenant - etat.dernierTemps) / 1000);
  etat.dernierTemps = maintenant;

  const restant = Math.max(0, (etat.finChrono - maintenant) / 1000);
  elements.chrono.textContent = restant.toFixed(1) + " s";
  if (restant <= 0) {
    termine("Temps écoulé", "La soirée continue sans toi. Eoghan aussi, mais plus lentement.", false);
    return;
  }

  gereGimmick(maintenant, dt);
  bougeEoghan(dt);
  etat.pnj.forEach((p) => bougePnj(p, dt, maintenant));
  dessineFaisceaux(maintenant);
  if (etat.bisou) avanceBisou(dt * 1000);
  gereDetection(maintenant, dt);

  etat.boucle = requestAnimationFrame(boucle);
}

/* =========================================================
   Eoghan
   ========================================================= */

function bougeEoghan(dt) {
  const e = etat.eoghan;
  if (etat.bisou) return; // pendant un bisou, on ne bouge pas

  let dx = 0;
  if (etat.touches.has("gauche")) dx -= 1;
  if (etat.touches.has("droite")) dx += 1;

  const marche = dx !== 0;
  if (marche) {
    e.dir = dx;
    e.x = Math.max(30, Math.min(LARGEUR_SALLE - 30, e.x + dx * (e.accroupi ? VITESSE_ACCROUPI : VITESSE) * dt));
  }

  if (marche !== e.marche) {
    e.marche = marche;
    e.el.classList.toggle("marche", marche);
  }

  poseActeur(e.el, e.x, e.plan, e.dir);
}

function changePlan(delta) {
  const e = etat.eoghan;
  if (etat.bisou) return;
  const nouveau = Math.max(0, Math.min(1, e.plan + delta));
  if (nouveau === e.plan) return;
  e.plan = nouveau;
  poseActeur(e.el, e.x, e.plan, e.dir);
}

/* Accroupi : Eoghan devient invisible s'il est planqué derrière un meuble.
   Un flash de lumière annule toutes les cachettes. */
function estCache(maintenant) {
  if (maintenant < etat.flashJusqua) return false;
  if (!etat.eoghan.accroupi) return false;
  return etat.props.some(
    (p) => p.cache && p.plan === etat.eoghan.plan && Math.abs(p.x - etat.eoghan.x) < RAYON_CACHETTE
  );
}

/* =========================================================
   PNJ et faisceaux de regard
   ========================================================= */

function bougePnj(p, dt, maintenant) {
  /* Pendant une alerte, tout le monde se braque sur Eoghan : c'est la
     punition d'une première bourde. */
  if (maintenant < etat.alerteJusqua) {
    p.dir = etat.eoghan.x >= p.x ? 1 : -1;
    poseActeur(p.el, p.x, p.plan, p.dir, p.petit ? 0.72 : 1);
    return;
  }

  if (p.motif === "patrouille") {
    p.x += p.dir * p.vitesse * dt;
    if (p.x <= p.de) { p.x = p.de; p.dir = 1; }
    if (p.x >= p.a) { p.x = p.a; p.dir = -1; }
    p.el.classList.add("marche");
  } else if (p.motif === "tourne") {
    p.compte += dt * 1000;
    if (p.compte >= p.periode) {
      p.compte = 0;
      p.dir *= -1;
    }
  }

  poseActeur(p.el, p.x, p.plan, p.dir, p.petit ? 0.72 : 1);
}

/* Un meuble bloque la vue s'il est entre le PNJ et le point regardé,
   dans le même plan. */
function vueBloquee(p, cibleX) {
  const min = Math.min(p.x, cibleX);
  const max = Math.max(p.x, cibleX);
  return etat.props.some(
    (prop) => prop.bloqueVue && prop.plan === p.plan && prop.x > min + 10 && prop.x < max - 10
  );
}

function porteeReelle(p) {
  /* Le faisceau s'arrête au premier meuble opaque rencontré. */
  let portee = p.portee;
  etat.props.forEach((prop) => {
    if (!prop.bloqueVue || prop.plan !== p.plan) return;
    const d = (prop.x - p.x) * p.dir;
    if (d > 0) portee = Math.min(portee, d);
  });
  return Math.max(20, portee);
}

function dessineFaisceaux(maintenant) {
  const flash = maintenant < etat.flashJusqua;

  etat.pnj.forEach((p) => {
    const portee = flash ? LARGEUR_SALLE : porteeReelle(p);
    const debut = p.dir > 0 ? p.x : p.x - portee;
    const a = ancrage(p.plan);

    p.faisceau.style.left = pourcent(debut) + "%";
    p.faisceau.style.width = pourcent(portee) + "%";
    p.faisceau.style.bottom = a.bas + "%";
    p.faisceau.classList.toggle("vers-gauche", p.dir < 0);
    p.faisceau.style.zIndex = p.plan === 1 ? 1 : 4;
    p.faisceau.style.setProperty("--echelle", a.echelle);
    p.faisceau.classList.toggle("danger", etat.vu);
    p.portéeCourante = portee;
  });
}

/* =========================================================
   Détection
   ========================================================= */

function gereDetection(maintenant, dt) {
  const flash = maintenant < etat.flashJusqua;
  const e = etat.eoghan;

  /* On retient QUI cadre Eoghan : c'est ce PNJ qui déclenchera le snap. */
  const photographe = estCache(maintenant)
    ? null
    : etat.pnj.find((p) => {
        if (p.plan !== e.plan) return false; // chacun cadre son plan
        const d = (e.x - p.x) * p.dir;
        if (d < 0) return false;             // il vise ailleurs
        if (d > (flash ? LARGEUR_SALLE : p.portee)) return false;
        return flash || !vueBloquee(p, e.x);
      });

  const vu = !!photographe;
  etat.photographe = photographe;
  etat.vu = vu;
  document.body.classList.toggle("repere", vu);

  if (!vu) {
    etat.exposition = Math.max(0, etat.exposition - dt * 1000);
    return;
  }

  /* Se faire voir pendant un bisou, c'est immédiat : c'est LE moment de
     vulnérabilité du jeu. */
  if (etat.bisou) {
    annuleBisou();
    bourde("📸 SNAP ! La photo part dans le groupe.");
    return;
  }

  etat.exposition += dt * 1000;
  if (etat.exposition >= EXPOSITION_MAX) {
    etat.exposition = 0;
    bourde("📸 Snap ! « Regardez qui traîne ici. »");
  }
}

/* Le snap : le téléphone du PNJ crache son flash, l'écran blanchit une
   fraction de seconde. C'est la sanction, et elle doit se voir. */
function snap() {
  const p = etat.photographe;
  if (p) {
    p.el.classList.remove("snap");
    void p.el.offsetWidth;
    p.el.classList.add("snap");
    setTimeout(() => p.el.classList.remove("snap"), 500);
  }
  document.body.classList.add("snap-flash");
  setTimeout(() => document.body.classList.remove("snap-flash"), 260);
}

function bourde(replique) {
  snap();
  etat.ragots++;
  etat.combo = 0;
  etat.alerteJusqua = performance.now() + ALERTE_MS;
  commente(replique);
  majTableau();

  if (etat.ragots >= etat.decor.ragots_max) {
    termine("Game over", "Toute la fac est au courant. Eoghan trouve ça flatteur.", false);
  }
}

/* =========================================================
   Bisous
   ========================================================= */

function garconProche() {
  return etat.garcons.find(
    (g) => !g.embrasse && g.plan === etat.eoghan.plan && Math.abs(g.x - etat.eoghan.x) <= PORTEE_BISOU
  );
}

function tenteBisou() {
  if (!etat.enCours || etat.bisou) return;
  const garcon = garconProche();
  if (!garcon) return;

  etat.bisou = { garcon, progression: 0, frole: false };
  document.body.classList.add("bisou-en-cours");

  // Les deux se tournent l'un vers l'autre, yeux fermés : la pose de bisou.
  const versLuiEoghan = garcon.x >= etat.eoghan.x ? 1 : -1;
  etat.eoghan.dir = versLuiEoghan;
  garcon.dir = -versLuiEoghan;

  etat.eoghan.el.innerHTML = persoSVG({
    peau: "#f0c39a", cheveux: "boucle", couleurCheveux: "#c98a3a",
    haut: "#00b32d", bas: "#2f3550", regard: "ferme", bouche: "bisou",
  });
  garcon.el.innerHTML = persoSVG({ ...garcon.look, regard: "ferme", bouche: "bisou" });
  garcon.el.appendChild(coeurCible(garcon));

  etat.eoghan.el.classList.add("penche");
  garcon.el.classList.add("penche");
  poseActeur(etat.eoghan.el, etat.eoghan.x, etat.eoghan.plan, etat.eoghan.dir);
  poseActeur(garcon.el, garcon.x, garcon.plan, garcon.dir);
}

function coeurCible(garcon) {
  const coeur = document.createElement("span");
  coeur.className = "coeur-cible";
  coeur.textContent = garcon.embrasse ? "✔" : "💗";
  return coeur;
}

function annuleBisou() {
  if (!etat.bisou) return;
  const garcon = etat.bisou.garcon;

  etat.eoghan.el.innerHTML = persoSVG({
    peau: "#f0c39a", cheveux: "boucle", couleurCheveux: "#c98a3a",
    haut: "#00b32d", bas: "#2f3550", bouche: "sourire",
  });
  etat.eoghan.el.classList.remove("penche");

  if (!garcon.embrasse) {
    garcon.el.innerHTML = persoSVG({ ...garcon.look, bouche: "neutre" });
    garcon.el.appendChild(coeurCible(garcon));
  }
  garcon.el.classList.remove("penche");

  etat.bisou = null;
  document.body.classList.remove("bisou-en-cours");
  elements.salle.style.setProperty("--bisou", "0");
}

function avanceBisou(dtMs) {
  const bisou = etat.bisou;

  /* Bonus « bisou sous le nez » : un faisceau frôle Eoghan sans le toucher. */
  const frole = etat.pnj.some((p) => {
    if (p.plan !== etat.eoghan.plan) return false;
    const d = (etat.eoghan.x - p.x) * p.dir;
    return d > 0 && d <= p.portee + 120 && d > p.portee - 40;
  });
  if (frole) bisou.frole = true;

  bisou.progression += dtMs;
  const part = Math.min(1, bisou.progression / etat.decor.duree_bisou_ms);
  elements.salle.style.setProperty("--bisou", part.toFixed(2));

  if (part < 1) return;

  const garcon = bisou.garcon;
  garcon.embrasse = true;
  garcon.el.innerHTML = persoSVG({ ...garcon.look, regard: "ferme", bouche: "sourire-large" });
  garcon.el.appendChild(coeurCible(garcon));
  garcon.el.classList.add("embrasse");

  etat.combo++;
  let gagne = 100 + (etat.combo - 1) * 50;
  if (bisou.frole) gagne += 200;
  etat.score += gagne;

  coeurs(garcon);
  commente(garcon.replique + (bisou.frole ? " (+200 sous le nez !)" : ""));
  annuleBisou();
  majTableau();

  if (etat.garcons.every((g) => g.embrasse)) {
    termine("Mission accomplie 💗", "Tous les garçons partants ont eu leur bisou. Personne n'a rien vu.", true);
  }
}

function coeurs(garcon) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const a = ancrage(garcon.plan);
  for (let i = 0; i < 6; i++) {
    const c = document.createElement("span");
    c.className = "coeur-envol";
    c.textContent = "💗";
    c.style.left = pourcent(garcon.x) + "%";
    c.style.bottom = a.bas + 14 + "%";
    c.style.setProperty("--decalage", (Math.random() * 60 - 30).toFixed(0) + "px");
    c.style.animationDelay = (i * 0.08).toFixed(2) + "s";
    elements.acteurs.appendChild(c);
    c.addEventListener("animationend", () => c.remove());
  }
}

/* =========================================================
   Gimmicks de décor
   ========================================================= */

function gereGimmick(maintenant, dt) {
  const decor = etat.decor;

  if (decor.gimmick === "flash" && maintenant >= etat.prochainGimmick) {
    etat.flashJusqua = maintenant + 1500;
    etat.prochainGimmick = maintenant + 10000;
    commente("⚡ FLASH ! Tout le monde voit tout.");
  }

  if (decor.gimmick === "douche" && maintenant >= etat.prochainGimmick && !etat.douche) {
    const el = document.createElement("div");
    el.className = "groupe-douche";
    el.innerHTML =
      persoSVG({ peau: "#f0c39a", cheveux: "chauve", couleurCheveux: "#2b1a2e", haut: "#fff", bas: "#4de0ff", bouche: "o" }) +
      persoSVG({ peau: "#a9683f", cheveux: "court", couleurCheveux: "#2b1a2e", haut: "#ffd84d", bas: "#3a4a7a", bouche: "sourire" }) +
      persoSVG({ peau: "#d99a6c", cheveux: "crete", couleurCheveux: "#8a5a2b", haut: "#c6ff4d", bas: "#2b1a2e", bouche: "neutre" });
    elements.acteurs.appendChild(el);
    etat.douche = { x: -120, el };
    etat.prochainGimmick = maintenant + 20000;
    commente("🚿 Le groupe de la douche traverse. Pousse-toi.");
  }

  document.body.classList.toggle("flash", maintenant < etat.flashJusqua);
  avanceDouche(dt);
}

/* Le groupe ne regarde rien, mais il occupe le passage : il pousse Eoghan
   devant lui, et donc souvent hors de sa cachette. */
function avanceDouche(dt) {
  const groupe = etat.douche;
  if (!groupe) return;

  groupe.x += 230 * dt;
  const a = ancrage(0);
  groupe.el.style.left = pourcent(groupe.x) + "%";
  groupe.el.style.bottom = a.bas + "%";

  if (etat.eoghan.plan === 0 && Math.abs(groupe.x - etat.eoghan.x) < 80) {
    etat.eoghan.x = Math.min(LARGEUR_SALLE - 30, groupe.x + 80);
    poseActeur(etat.eoghan.el, etat.eoghan.x, etat.eoghan.plan, etat.eoghan.dir);
    if (etat.bisou) {
      annuleBisou();
      commente("Poussé par le groupe. Eoghan garde sa dignité. À peu près.");
    }
  }

  if (groupe.x > LARGEUR_SALLE + 150) {
    groupe.el.remove();
    etat.douche = null;
  }
}

/* =========================================================
   Entrées
   ========================================================= */

const CLAVIER = {
  ArrowLeft: "gauche", q: "gauche", a: "gauche",
  ArrowRight: "droite", d: "droite",
  ArrowUp: "arriere", z: "arriere", w: "arriere",
  ArrowDown: "avant", s: "avant",
};

document.addEventListener("keydown", (ev) => {
  if (ev.key === "Shift") {
    accroupi(true);
    return;
  }

  if (ev.key === " " || ev.code === "Space") {
    ev.preventDefault();
    if (!etat.bisou) tenteBisou();
    return;
  }

  const action = CLAVIER[ev.key] || CLAVIER[ev.key.toLowerCase()];
  if (!action) return;
  ev.preventDefault();

  if (action === "arriere") changePlan(1);
  else if (action === "avant") changePlan(-1);
  else etat.touches.add(action);
});

document.addEventListener("keyup", (ev) => {
  if (ev.key === "Shift") accroupi(false);
  if (ev.key === " " || ev.code === "Space") annuleBisou();

  const action = CLAVIER[ev.key] || CLAVIER[ev.key.toLowerCase()];
  if (action === "gauche" || action === "droite") etat.touches.delete(action);
});

function accroupi(actif) {
  if (etat.eoghan.accroupi === actif) return;
  etat.eoghan.accroupi = actif;
  document.body.classList.toggle("accroupi", actif);
  etat.eoghan.el.classList.toggle("accroupi", actif);
}

/* Au doigt : on marche vers le côté touché, et on embrasse en maintenant
   le doigt sur un garçon proche. */
elements.salle.addEventListener("pointerdown", (ev) => {
  if (!etat.enCours) return;
  const rect = elements.salle.getBoundingClientRect();
  const x = ((ev.clientX - rect.left) / rect.width) * LARGEUR_SALLE;

  if (garconProche() && Math.abs(x - etat.eoghan.x) < 120) {
    tenteBisou();
    return;
  }
  etat.touches.add(x > etat.eoghan.x ? "droite" : "gauche");
});

document.addEventListener("pointerup", () => {
  etat.touches.clear();
  annuleBisou();
});

/* =========================================================
   Tableau de bord et écrans
   ========================================================= */

function majTableau() {
  elements.score.textContent = etat.score;
  elements.combo.textContent = "×" + Math.max(1, etat.combo);
  elements.restants.textContent = etat.garcons.filter((g) => !g.embrasse).length;

  const max = etat.decor ? etat.decor.ragots_max : 3;
  elements.ragots.innerHTML = "";
  for (let i = 0; i < max; i++) {
    const cran = document.createElement("span");
    cran.className = "cran" + (i < etat.ragots ? " plein" : "");
    cran.textContent = i < etat.ragots ? "💔" : "💗";
    elements.ragots.appendChild(cran);
  }
}

function commente(texte) {
  elements.commentaire.textContent = texte;
  elements.commentaire.classList.remove("pop");
  void elements.commentaire.offsetWidth;
  elements.commentaire.classList.add("pop");
}

function construitMenu() {
  elements.ecranDecors.innerHTML = "";
  DECORS.forEach((decor) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "decor-btn";
    btn.innerHTML =
      '<span class="decor-emoji" aria-hidden="true">' + decor.emoji + "</span>" +
      '<span class="decor-nom">' + decor.titre + "</span>" +
      '<span class="decor-etoiles">' + decor.etoiles + "</span>" +
      '<span class="decor-detail">' + decor.difficulte + " · " + decor.chrono_s + " s · " +
      decor.ragots_max + " ragots max</span>" +
      '<span class="decor-resume">' + decor.ambiance + "</span>";
    btn.addEventListener("click", () => demarre(decor));
    elements.ecranDecors.appendChild(btn);
  });
}

$("btn-stop").addEventListener("click", () => {
  termine("Partie abandonnée", "Eoghan rentre se coucher. Il repassera.", false);
});

construitMenu();
chargeDecor(DECORS[0]);
majTableau();
elements.ecran.classList.add("visible");
