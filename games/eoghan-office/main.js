/* =========================================================
   Kiss & Cache — moteur de jeu
   ---------------------------------------------------------
   Tout se joue sur une grille : Eoghan, les garçons, les PNJ et les cônes
   de vision occupent des cases. Une seule horloge (setInterval) fait
   avancer les PNJ, recalcule les cônes et applique les règles ; l'affichage
   ne fait que refléter cet état.

   Règle d'or du jeu : les cônes sont TOUJOURS visibles. C'est un puzzle de
   timing, jamais une devinette.
   ========================================================= */

const TICK_MS = 100;
const PAS_MS = 150;          // délai minimum entre deux pas d'Eoghan
const EXPOSITION_MAX = 900;  // temps toléré dans un cône hors bisou
const ALERTE_MS = 3000;      // durée pendant laquelle les PNJ voisins fixent Eoghan
const DIRECTIONS = [
  { dx: 0, dy: -1 }, // 0 = haut
  { dx: 1, dy: 0 },  // 1 = droite
  { dx: 0, dy: 1 },  // 2 = bas
  { dx: -1, dy: 0 }, // 3 = gauche
];

const RANGS = [
  { min: 900, texte: "Fantôme romantique 👻💗" },
  { min: 500, texte: "Discret… ish" },
  { min: 1, texte: "Tout le monde a vu" },
  { min: 0, texte: "Personne n'a rien vu. Il ne s'est rien passé non plus." },
];

const $ = (id) => document.getElementById(id);

const elements = {
  terrain: $("terrain"),
  tuiles: $("tuiles"),
  acteurs: $("acteurs"),
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
  largeur: 0,
  hauteur: 0,
  grille: [],        // [y][x] = { bloque, classe }
  cases: [],         // éléments DOM des tuiles
  eoghan: { x: 1, y: 1, el: null, accroupi: false, dernierPas: 0 },
  garcons: [],       // { x, y, nom, replique, embrasse, el }
  pnj: [],           // { x, y, dir, ..., el }
  cone: new Set(),   // clés "x,y" couvertes par un cône ce tick
  enCours: false,
  horloge: null,
  finChrono: 0,
  score: 0,
  combo: 0,
  ragots: 0,
  exposition: 0,
  bisou: null,       // { garcon, progression, frolé }
  toucheBisou: false,
  alerteJusqua: 0,
  flashJusqua: 0,
  prochainGimmick: 0,
  douche: null,      // { x, y, sens } pour le décor vestiaire
};

const cle = (x, y) => x + "," + y;

/* =========================================================
   Chargement d'un décor
   ========================================================= */

function chargeDecor(decor) {
  etat.decor = decor;
  etat.hauteur = decor.carte.length;
  etat.largeur = decor.carte[0].length;
  etat.grille = [];
  etat.garcons = [];
  etat.pnj = [];
  etat.cases = [];

  elements.terrain.style.setProperty("--colonnes", etat.largeur);
  elements.terrain.style.setProperty("--lignes", etat.hauteur);
  elements.terrain.dataset.decor = decor.id;
  elements.tuiles.innerHTML = "";
  elements.acteurs.innerHTML = "";

  const nomsRestants = decor.garcons.slice();

  decor.carte.forEach((ligne, y) => {
    etat.grille[y] = [];
    etat.cases[y] = [];

    ligne.split("").forEach((c, x) => {
      const tuile = TUILES[c] || TUILES["."];
      etat.grille[y][x] = { bloque: tuile.bloque };

      const el = document.createElement("div");
      el.className = "tuile tuile-" + tuile.classe;
      if (tuile.emoji) el.textContent = tuile.emoji;
      elements.tuiles.appendChild(el);
      etat.cases[y][x] = el;

      if (c === "E") {
        etat.eoghan.x = x;
        etat.eoghan.y = y;
      }

      if (c === "G") {
        const infos = nomsRestants.shift() || { nom: "Un garçon", replique: "Sympa." };
        etat.garcons.push({ x, y, ...infos, embrasse: false, el: acteur("garcon", "🧑") });
      }
    });
  });

  decor.pnj.forEach((modele) => {
    const p = {
      ...modele,
      dir: modele.direction != null ? modele.direction : 0,
      etape: 0,
      avance: 1,
      progression: 0,
      el: acteur("pnj", modele.emoji),
    };
    p.el.title = modele.type;
    etat.pnj.push(p);
  });

  etat.eoghan.el = acteur("eoghan", "🙂");
  etat.eoghan.el.classList.add("acteur-eoghan");

  elements.ambiance.textContent = decor.emoji + " " + decor.ambiance;
  placeTout();
}

function acteur(classe, emoji) {
  const el = document.createElement("div");
  el.className = "acteur acteur-" + classe;
  el.textContent = emoji;
  elements.acteurs.appendChild(el);
  return el;
}

function place(el, x, y) {
  el.style.transform = "translate(" + x * 100 + "%, " + y * 100 + "%)";
}

function placeTout() {
  place(etat.eoghan.el, etat.eoghan.x, etat.eoghan.y);
  etat.garcons.forEach((g) => place(g.el, g.x, g.y));
  etat.pnj.forEach((p) => place(p.el, p.x, p.y));
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
  etat.toucheBisou = false;
  etat.alerteJusqua = 0;
  etat.flashJusqua = 0;
  etat.douche = null;
  etat.enCours = true;
  etat.finChrono = performance.now() + decor.chrono_s * 1000;
  etat.prochainGimmick = performance.now() + (decor.gimmick === "flash" ? 10000 : 20000);

  elements.ecran.classList.remove("visible");
  commente("Vas-y. Discrètement. Enfin, essaie.");
  majTableau();

  clearInterval(etat.horloge);
  etat.horloge = setInterval(tick, TICK_MS);
}

function termine(titre, texte, gagne) {
  if (!etat.enCours) return;
  etat.enCours = false;
  clearInterval(etat.horloge);
  etat.bisou = null;
  document.body.classList.remove("bisou-en-cours");

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
   Horloge : PNJ, cônes, règles
   ========================================================= */

function tick() {
  const maintenant = performance.now();

  // --- Chrono
  const restant = Math.max(0, (etat.finChrono - maintenant) / 1000);
  elements.chrono.textContent = restant.toFixed(1) + " s";
  if (restant <= 0) {
    termine(
      "Temps écoulé",
      "La soirée continue sans toi. Eoghan aussi, mais plus lentement.",
      false
    );
    return;
  }

  // --- Gimmick propre au décor
  gereGimmick(maintenant);
  avanceDouche();
  document.body.classList.toggle("flash", maintenant < etat.flashJusqua);

  // --- Déplacement des PNJ
  etat.pnj.forEach((p) => bougePnj(p, maintenant));

  // --- Cônes de vision
  calculeCones(maintenant);

  // --- Bisou en cours
  if (etat.bisou) avanceBisou(maintenant);

  // --- Repérage
  gereDetection(maintenant);

  placeTout();
}

function gereGimmick(maintenant) {
  const decor = etat.decor;
  if (!decor.gimmick || maintenant < etat.prochainGimmick) return;

  if (decor.gimmick === "flash") {
    /* Flash de lumière : pendant 1,5 s, plus aucune cachette ne protège. */
    etat.flashJusqua = maintenant + 1500;
    etat.prochainGimmick = maintenant + 10000;
    commente("⚡ FLASH ! Tout le monde voit tout.");
  }

  if (decor.gimmick === "douche" && !etat.douche) {
    /* Le groupe de la douche traverse le couloir central : il ne voit rien,
       mais il pousse Eoghan hors de sa cachette. */
    etat.douche = {
      x: 0,
      y: Math.floor(etat.hauteur / 2),
      pas: 0,
      el: acteur("douche", "🚿"),
    };
    etat.prochainGimmick = maintenant + 20000;
    commente("🚿 Le groupe de la douche arrive. Pousse-toi.");
  }
}

/* Le groupe avance d'une case toutes les trois horloges. Il ne regarde rien
   (aucun cône), mais il occupe le couloir : si Eoghan est sur son passage,
   il se fait pousser sur le côté — et donc souvent hors de sa cachette. */
function avanceDouche() {
  const groupe = etat.douche;
  if (!groupe) return;

  groupe.pas++;
  if (groupe.pas % 3) return;

  groupe.x++;
  if (groupe.x >= etat.largeur) {
    groupe.el.remove();
    etat.douche = null;
    return;
  }

  place(groupe.el, groupe.x, groupe.y);

  if (etat.eoghan.x === groupe.x && etat.eoghan.y === groupe.y) {
    const cotes = [-1, 1];
    const libre1 = cotes
      .map((d) => ({ x: etat.eoghan.x, y: etat.eoghan.y + d }))
      .find((c) => libre(c.x, c.y));
    if (libre1) {
      etat.eoghan.x = libre1.x;
      etat.eoghan.y = libre1.y;
      place(etat.eoghan.el, libre1.x, libre1.y);
    }
    annuleBisou();
    commente("Poussé par le groupe. Eoghan garde sa dignité. À peu près.");
  }
}

function bougePnj(p, maintenant) {
  if (p.motif === "fixe") return;

  p.progression += (TICK_MS / 1000) * (p.vitesse || 1);

  if (p.motif === "rotation") {
    /* Un quart de tour par unité de progression. */
    if (p.progression >= 1) {
      p.progression = 0;
      p.dir = (p.dir + 1) % 4;
    }
    return;
  }

  if (p.motif === "va-et-vient" && p.chemin) {
    if (p.progression < 1) return;
    p.progression = 0;

    const [a, b] = p.chemin;
    const cible = p.avance > 0 ? b : a;
    const dx = Math.sign(cible[0] - p.x);
    const dy = Math.sign(cible[1] - p.y);

    if (dx === 0 && dy === 0) {
      p.avance *= -1;
      return;
    }

    const nx = p.x + dx;
    const ny = p.y + dy;
    if (libre(nx, ny)) {
      p.x = nx;
      p.y = ny;
      p.dir = dx > 0 ? 1 : dx < 0 ? 3 : dy > 0 ? 2 : 0;
    } else {
      p.avance *= -1;
    }
  }
}

function libre(x, y) {
  if (x < 0 || y < 0 || x >= etat.largeur || y >= etat.hauteur) return false;
  return !etat.grille[y][x].bloque;
}

/* Ligne de vue : le mobilier coupe la vue. Bresenham simplifié. */
function voitDepuis(x0, y0, x1, y1) {
  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;

  while (x !== x1 || y !== y1) {
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
    if (x === x1 && y === y1) break;
    if (!libre(x, y)) return false; // du mobilier sur le trajet
  }
  return true;
}

function calculeCones(maintenant) {
  const ancien = etat.cone;
  etat.cone = new Set();
  const alerte = maintenant < etat.alerteJusqua;

  etat.pnj.forEach((p) => {
    /* Pendant une alerte, tous les PNJ fixent Eoghan : le cône se braque
       sur lui, c'est la punition d'une première bourde. */
    if (alerte) {
      const dx = etat.eoghan.x - p.x;
      const dy = etat.eoghan.y - p.y;
      p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0;
    }

    const d = DIRECTIONS[p.dir];
    const portee = p.portee || 3;

    for (let s = 1; s <= portee; s++) {
      for (let l = -(s - 1); l <= s - 1; l++) {
        const x = p.x + d.dx * s + (d.dx === 0 ? l : 0);
        const y = p.y + d.dy * s + (d.dy === 0 ? l : 0);
        if (!libre(x, y)) continue;
        if (!voitDepuis(p.x, p.y, x, y)) continue;
        etat.cone.add(cle(x, y));
      }
    }
  });

  // Rendu : on ne touche que les cases qui changent d'état.
  ancien.forEach((k) => {
    if (etat.cone.has(k)) return;
    const [x, y] = k.split(",").map(Number);
    etat.cases[y][x].classList.remove("vu", "vu-danger");
  });

  const dansCone = etat.cone.has(cle(etat.eoghan.x, etat.eoghan.y));
  etat.cone.forEach((k) => {
    const [x, y] = k.split(",").map(Number);
    etat.cases[y][x].classList.add("vu");
    etat.cases[y][x].classList.toggle("vu-danger", dansCone);
  });
}

/* Accroupi : les PNJ lointains ne repèrent plus Eoghan. Sauf pendant un
   flash de lumière, où plus rien ne protège. */
function estCache(maintenant) {
  if (maintenant < etat.flashJusqua) return false;
  if (!etat.eoghan.accroupi) return false;

  return etat.pnj.every((p) => {
    const distance = Math.abs(p.x - etat.eoghan.x) + Math.abs(p.y - etat.eoghan.y);
    return distance >= 3;
  });
}

function gereDetection(maintenant) {
  const vu = etat.cone.has(cle(etat.eoghan.x, etat.eoghan.y)) && !estCache(maintenant);
  document.body.classList.toggle("repere", vu);

  if (!vu) {
    etat.exposition = Math.max(0, etat.exposition - TICK_MS);
    return;
  }

  /* Se faire voir pendant un bisou, c'est immédiat : c'est LE moment de
     vulnérabilité du jeu. */
  if (etat.bisou) {
    annuleBisou();
    bourde("J'AI TOUT VU !");
    return;
  }

  etat.exposition += TICK_MS;
  if (etat.exposition >= EXPOSITION_MAX) {
    etat.exposition = 0;
    bourde("Eh, qu'est-ce que tu fais là ?");
  }
}

function bourde(replique) {
  etat.ragots++;
  etat.combo = 0;
  etat.alerteJusqua = performance.now() + ALERTE_MS;
  commente(replique);
  majTableau();

  if (etat.ragots >= etat.decor.ragots_max) {
    termine(
      "Game over",
      "Toute la fac est au courant. Eoghan trouve ça flatteur.",
      false
    );
  }
}

/* =========================================================
   Bisous
   ========================================================= */

function garconAdjacent() {
  return etat.garcons.find((g) => {
    if (g.embrasse) return false;
    const d = Math.abs(g.x - etat.eoghan.x) + Math.abs(g.y - etat.eoghan.y);
    return d === 1;
  });
}

function tenteBisou() {
  if (!etat.enCours || etat.bisou) return;
  const garcon = garconAdjacent();
  if (!garcon) return;

  etat.bisou = { garcon, progression: 0, frole: false };
  document.body.classList.add("bisou-en-cours");
  garcon.el.classList.add("en-bisou");
}

function annuleBisou() {
  if (!etat.bisou) return;
  etat.bisou.garcon.el.classList.remove("en-bisou");
  etat.bisou = null;
  document.body.classList.remove("bisou-en-cours");
  elements.terrain.style.setProperty("--bisou", "0");
}

function avanceBisou(maintenant) {
  const bisou = etat.bisou;

  /* Bonus « bisou sous le nez » : un cône passe à une case sans toucher. */
  const voisins = [
    [etat.eoghan.x + 1, etat.eoghan.y],
    [etat.eoghan.x - 1, etat.eoghan.y],
    [etat.eoghan.x, etat.eoghan.y + 1],
    [etat.eoghan.x, etat.eoghan.y - 1],
  ];
  if (voisins.some(([x, y]) => etat.cone.has(cle(x, y)))) bisou.frole = true;

  bisou.progression += TICK_MS;
  const part = Math.min(1, bisou.progression / etat.decor.duree_bisou_ms);
  elements.terrain.style.setProperty("--bisou", part.toFixed(2));

  if (part < 1) return;

  // --- Bisou réussi
  const garcon = bisou.garcon;
  garcon.embrasse = true;
  garcon.el.classList.remove("en-bisou");
  garcon.el.classList.add("embrasse");
  garcon.el.textContent = "😊";

  etat.combo++;
  let gagne = 100 + (etat.combo - 1) * 50;
  if (bisou.frole) gagne += 200;
  etat.score += gagne;

  coeurs(garcon);
  commente(garcon.replique + (bisou.frole ? " (+200 sous le nez !)" : ""));
  annuleBisou();
  majTableau();

  if (etat.garcons.every((g) => g.embrasse)) {
    termine(
      "Mission accomplie 💗",
      "Tous les garçons partants ont eu leur bisou. Personne n'a rien vu.",
      true
    );
  }
}

function coeurs(garcon) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < 5; i++) {
    const c = document.createElement("span");
    c.className = "coeur";
    c.textContent = "💗";
    c.style.setProperty("--decalage", (Math.random() * 40 - 20).toFixed(0) + "px");
    c.style.animationDelay = (i * 0.08).toFixed(2) + "s";
    place(c, garcon.x, garcon.y);
    elements.acteurs.appendChild(c);
    c.addEventListener("animationend", () => c.remove());
  }
}

/* =========================================================
   Déplacement d'Eoghan
   ========================================================= */

function deplace(dx, dy) {
  if (!etat.enCours || etat.bisou) return; // pendant un bisou, on ne bouge pas

  const maintenant = performance.now();
  const delai = etat.eoghan.accroupi ? PAS_MS * 1.8 : PAS_MS;
  if (maintenant - etat.eoghan.dernierPas < delai) return;

  const nx = etat.eoghan.x + dx;
  const ny = etat.eoghan.y + dy;
  if (!libre(nx, ny)) return;
  if (etat.garcons.some((g) => g.x === nx && g.y === ny)) return;
  if (etat.pnj.some((p) => p.x === nx && p.y === ny)) return;

  etat.eoghan.x = nx;
  etat.eoghan.y = ny;
  etat.eoghan.dernierPas = maintenant;
  place(etat.eoghan.el, nx, ny);
}

/* Clic/tap : Eoghan fait UN pas vers la case visée. Simple, prévisible,
   et suffisant pour jouer au doigt sans pavé directionnel. */
elements.terrain.addEventListener("pointerdown", (ev) => {
  if (!etat.enCours) return;
  const rect = elements.terrain.getBoundingClientRect();
  const x = Math.floor(((ev.clientX - rect.left) / rect.width) * etat.largeur);
  const y = Math.floor(((ev.clientY - rect.top) / rect.height) * etat.hauteur);

  const dx = x - etat.eoghan.x;
  const dy = y - etat.eoghan.y;

  // Sur une case adjacente occupée par un garçon : c'est un bisou.
  if (Math.abs(dx) + Math.abs(dy) === 1 &&
      etat.garcons.some((g) => g.x === x && g.y === y && !g.embrasse)) {
    tenteBisou();
    return;
  }

  if (Math.abs(dx) > Math.abs(dy)) deplace(Math.sign(dx), 0);
  else if (dy !== 0) deplace(0, Math.sign(dy));
});

/* Au relâchement du doigt, un bisou entamé au tap s'arrête : même règle
   qu'au clavier, il faut maintenir. */
document.addEventListener("pointerup", () => {
  if (etat.bisou) annuleBisou();
});

const CLAVIER = {
  ArrowUp: [0, -1], ArrowRight: [1, 0], ArrowDown: [0, 1], ArrowLeft: [-1, 0],
  z: [0, -1], d: [1, 0], s: [0, 1], q: [-1, 0],
  w: [0, -1], a: [-1, 0],
};

document.addEventListener("keydown", (ev) => {
  if (ev.key === "Shift") {
    etat.eoghan.accroupi = true;
    document.body.classList.add("accroupi");
    etat.eoghan.el.textContent = "😐";
    return;
  }

  if (ev.key === " " || ev.code === "Space") {
    ev.preventDefault();
    if (!etat.toucheBisou) {
      etat.toucheBisou = true;
      tenteBisou();
    }
    return;
  }

  const dir = CLAVIER[ev.key] || CLAVIER[ev.key.toLowerCase()];
  if (!dir) return;
  ev.preventDefault();
  deplace(dir[0], dir[1]);
});

document.addEventListener("keyup", (ev) => {
  if (ev.key === "Shift") {
    etat.eoghan.accroupi = false;
    document.body.classList.remove("accroupi");
    etat.eoghan.el.textContent = "🙂";
  }
  if (ev.key === " " || ev.code === "Space") {
    etat.toucheBisou = false;
    annuleBisou();
  }
});

/* =========================================================
   Tableau de bord et écrans
   ========================================================= */

function majTableau() {
  elements.score.textContent = etat.score;
  elements.combo.textContent = "×" + Math.max(1, etat.combo);
  const restants = etat.garcons.filter((g) => !g.embrasse).length;
  elements.restants.textContent = restants;

  const max = etat.decor ? etat.decor.ragots_max : 3;
  elements.ragots.innerHTML = "";
  for (let i = 0; i < max; i++) {
    const cran = document.createElement("span");
    cran.className = "cran" + (i < etat.ragots ? " plein" : "");
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
