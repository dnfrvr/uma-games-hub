let manifest = {};
// selection[categorie] = id de l'item choisi, ou null
const selection = {};
LAYER_ORDER.forEach((cat) => (selection[cat] = null));

let decorActuel = DECORS[0].id;

// Ordre d'affichage du rail : de la tête aux pieds, pour suivre le regard.
// (LAYER_ORDER, lui, reste l'ordre d'empilement des calques et ne bouge pas.)
const RAIL_ORDER = [
  "decor",
  "chapeau_couvre_chef",
  "coiffure",
  "visage_extra",
  "bijoux",
  "haut",
  "veste_manteau",
  "ceinture_accessoire_taille",
  "calecon",
  "bas",
  "chaussures",
];

const PHRASES_CHAOS = [
  "Drew pense que ça matche. Drew a tort.",
  "L'aigle regarde déjà cette tenue avec intérêt.",
  "Un vrai crime de mode, signé Drew.",
  "Quelqu'un a laissé Drew choisir seul. On voit le résultat.",
  "Même les mannequins de vitrine refuseraient ça.",
  "Le hasard a fait de son mieux. Le hasard a échoué.",
  "Drew sort comme ça. Drew assume. Drew a tort d'assumer.",
  "Trois styles se battent sur ce corps. Aucun ne gagne.",
  "C'est audacieux. C'est surtout illégal dans quatre États.",
  "Le miroir a demandé une pause.",
  "On dirait une penderie qui a explosé sur quelqu'un.",
  "Drew appelle ça « une vibe ». On appelle ça autrement.",
  "Quelque part, un styliste vient de se réveiller en sueur.",
  "Cette tenue a été validée par personne.",
];

const PHRASES_ENFILE = [
  "Drew enfile ça sans hésiter une seconde.",
  "Voilà. C'est fait. On ne peut plus revenir en arrière.",
  "Drew trouve que ça lui va très bien.",
  "Ce choix sera commenté à la table.",
  "Drew est ravi. Drew est seul à l'être.",
  "Drew se regarde. Drew approuve. Drew est le seul juge ici.",
  "Décision prise en zéro seconde de réflexion.",
  "Ça change tout. Pas en mieux, mais ça change tout.",
  "Drew hoche la tête devant le miroir. Personne d'autre ne hoche.",
  "Noté. Le jury délibère encore.",
  "Ce vêtement a attendu son heure. Son heure est peut-être mal choisie.",
  "Drew appelle ça une signature. On appelle ça un aveu.",
  "Ajouté à la tenue, et au dossier.",
];

const PHRASES_RETIRE = [
  "Drew récupère un peu de dignité.",
  "Retiré. La garde-robe respire.",
  "Bien vu, ça n'allait avec rien.",
  "Une pièce en moins, un problème en moins.",
  "Drew fait semblant de ne l'avoir jamais portée.",
  "Sage. Vraiment sage.",
  "Le miroir souffle un peu.",
  "Rangé. On n'en reparlera plus.",
  "Drew hésite, puis l'enlève. Bonne pioche.",
];

/* L'aigle parle deux fois : quand il fond sur Drew, puis quand il repart. */
const PHRASES_AIGLE_ARRIVEE = [
  "L'aigle a repéré la tenue. Il descend. 🦅",
  "Un cri dans le ciel. L'aigle a vu. 🦅",
  "L'aigle plonge. Drew n'a rien vu venir. 🦅",
  "Une ombre passe sur Drew. Ce n'est pas un nuage. 🦅",
  "L'aigle en a assez vu. Il arrive. 🦅",
  "Trop tard pour se changer : l'aigle est déjà en piqué. 🦅",
];

const PHRASES_AIGLE_BILAN = [
  "L'aigle a fondu sur la garde-robe de Drew. Il ne lui reste que son caleçon. 🦅",
  "Tenue confisquée. Drew reste en caleçon, comme la dernière fois. 🦅",
  "L'aigle repart les serres pleines. Drew repart en caleçon. 🦅",
  "Plus rien. Juste un caleçon et beaucoup de questions. 🦅",
  "Le ciel a repris ce qui lui appartenait. Drew garde le caleçon. 🦅",
];

async function init() {
  appliquerDecor();
  renderDoll(); // Drew s'affiche même si la garde-robe ne charge pas

  try {
    const res = await fetch("assets/manifest.json");
    if (!res.ok) throw new Error("HTTP " + res.status);
    manifest = await res.json();
  } catch (e) {
    console.error("manifest.json illisible :", e);
    showFlavorText(
      "La garde-robe n'a pas pu être chargée. Le site doit tourner via un serveur local — voir PROCEDURE.md, §0."
    );
    return;
  }

  fusionneDecorsDeclares(manifest.decor);
  buildWardrobeTabs();
  appliquerDecor();
  renderDoll();
  prechargeGardeRobe();
  showFlavorText("Attrape une pièce dans la garde-robe et lâche-la sur Drew.");
}

function buildWardrobeTabs() {
  const tabsEl = document.getElementById("wardrobe-tabs");
  const panelsEl = document.getElementById("wardrobe-panels");
  tabsEl.innerHTML = "";
  panelsEl.innerHTML = "";

  RAIL_ORDER.forEach((cat, i) => {
    const tab = document.createElement("button");
    tab.className = "tab-btn" + (i === 0 ? " active" : "");
    tab.dataset.cat = cat;
    tab.title = labelCategorie(cat);
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", i === 0 ? "true" : "false");
    tab.setAttribute("aria-controls", "panneau-" + cat);
    tab.id = "onglet-" + cat;

    const icone = document.createElement("span");
    icone.setAttribute("aria-hidden", "true");
    icone.textContent = ICONE_CATEGORIE[cat] || "✦";
    const libelle = document.createElement("span");
    libelle.className = "tab-label";
    libelle.textContent = labelCourt(cat);
    tab.append(icone, libelle);

    tab.onclick = () => switchTab(cat);
    tab.onkeydown = (e) => naviguerRail(e, cat);
    tabsEl.appendChild(tab);

    const panel = document.createElement("div");
    panel.className = "wardrobe-panel" + (i === 0 ? " active" : "");
    panel.dataset.cat = cat;
    panel.id = "panneau-" + cat;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", "onglet-" + cat);

    if (cat === "decor") {
      DECORS.forEach((d) => panel.appendChild(buildDecorButton(d)));
    } else {
      (manifest[cat] || []).forEach((item) => panel.appendChild(buildItemButton(cat, item)));
    }

    panelsEl.appendChild(panel);
  });
}

function buildDecorButton(decor) {
  const btn = document.createElement("button");
  btn.className = "item-btn decor-btn";
  btn.title = decor.nom;
  btn.dataset.decor = decor.id;

  const vignette = document.createElement("span");
  vignette.className = "item-swatch";
  vignette.style.backgroundColor = decor.vignette;
  vignette.style.backgroundImage = `url("${decor.url}")`;

  const nom = document.createElement("span");
  nom.className = "item-nom";
  nom.textContent = decor.nom;

  btn.append(vignette, nom);
  btn.onclick = () => choisirDecor(decor.id);
  return btn;
}

function choisirDecor(id) {
  decorActuel = id;
  appliquerDecor();
  showFlavorText(`Drew pose devant : ${trouveDecor(id).nom}.`);
}

function appliquerDecor() {
  const decor = trouveDecor(decorActuel);
  const doll = document.getElementById("doll");
  doll.style.backgroundColor = decor.vignette || "";
  doll.style.backgroundImage = decor.url ? `url("${decor.url}")` : "none";
  document.querySelectorAll(".decor-btn").forEach((b) => {
    b.classList.toggle("selected", b.dataset.decor === decorActuel);
  });
}

function buildItemButton(cat, item) {
  const btn = document.createElement("button");
  btn.className = "item-btn";
  btn.title = item.nom + " — attrape-la et lâche-la sur Drew";
  btn.dataset.id = item.id;
  btn.dataset.cat = cat;

  const swatch = document.createElement("span");
  swatch.className = "item-swatch";
  swatch.style.backgroundImage = `url("${urlItem(cat, item, true)}")`;

  const nom = document.createElement("span");
  nom.className = "item-nom";
  nom.textContent = item.nom;

  btn.append(swatch, nom);
  btn.onclick = () => toggleItem(cat, item.id);
  enableDragVersDrew(btn, cat, item);
  return btn;
}

// Une icône par catégorie, façon rail latéral des jeux d'habillage.
const ICONE_CATEGORIE = {
  decor: "🏞️",
  calecon: "🩲",
  bas: "👖",
  chaussures: "👟",
  haut: "👕",
  veste_manteau: "🧥",
  ceinture_accessoire_taille: "🎀",
  bijoux: "💎",
  coiffure: "💇",
  chapeau_couvre_chef: "🧢",
  visage_extra: "🕶️",
};

function labelCategorie(cat) {
  const noms = {
    decor: "Décor",
    calecon: "Caleçon",
    bas: "Bas",
    chaussures: "Chaussures",
    haut: "Haut",
    veste_manteau: "Veste",
    ceinture_accessoire_taille: "Ceinture",
    bijoux: "Bijoux",
    coiffure: "Coiffure",
    chapeau_couvre_chef: "Chapeau",
    visage_extra: "Visage",
  };
  return noms[cat] || cat;
}

// Version courte, pour tenir sous l'icône du rail.
function labelCourt(cat) {
  const noms = {
    chaussures: "Pieds",
    ceinture_accessoire_taille: "Taille",
    coiffure: "Cheveux",
    chapeau_couvre_chef: "Tête",
  };
  return noms[cat] || labelCategorie(cat);
}

/* Flèches et Origine/Fin dans le rail, comme attendu d'une liste d'onglets. */
function naviguerRail(e, cat) {
  const pas = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
  let cible = null;

  if (pas) cible = RAIL_ORDER[(RAIL_ORDER.indexOf(cat) + pas + RAIL_ORDER.length) % RAIL_ORDER.length];
  else if (e.key === "Home") cible = RAIL_ORDER[0];
  else if (e.key === "End") cible = RAIL_ORDER[RAIL_ORDER.length - 1];
  if (!cible) return;

  e.preventDefault();
  switchTab(cible);
  document.getElementById("onglet-" + cible).focus();
}

function switchTab(cat) {
  document.querySelectorAll(".tab-btn").forEach((b) => {
    const actif = b.dataset.cat === cat;
    b.classList.toggle("active", actif);
    b.setAttribute("aria-selected", actif ? "true" : "false");
  });
  document.querySelectorAll(".wardrobe-panel").forEach((p) => p.classList.toggle("active", p.dataset.cat === cat));
}

function toggleItem(cat, id) {
  const retire = selection[cat] === id;
  selection[cat] = retire ? null : id;
  renderDoll(retire ? null : cat);
  showFlavorText(piocheVariee(retire ? PHRASES_RETIRE : PHRASES_ENFILE));
}

function findItem(cat, id) {
  return (manifest[cat] || []).find((it) => it.id === id);
}

function pioche(liste) {
  return liste[Math.floor(Math.random() * liste.length)];
}

/* Un tirage purement aléatoire ressort régulièrement la phrase qu'on vient
   de lire, et le jeu a l'air de tourner en rond. Celle-ci retient le dernier
   tirage de chaque liste et l'évite. */
const dernierTirage = new WeakMap();

function piocheVariee(liste) {
  if (liste.length < 2) return liste[0];
  const dernier = dernierTirage.get(liste);
  let choix;
  do {
    choix = pioche(liste);
  } while (choix === dernier);
  dernierTirage.set(liste, choix);
  return choix;
}

/* =========================================================
   Glisser-déposer (souris + tactile, via les événements pointer)
   - une vignette de la garde-robe → sur Drew  = on l'enfile
   - une pièce portée par Drew → sur la garde-robe = on la retire
   ========================================================= */

const SEUIL_DRAG = 6; // px avant de considérer que c'est un glissé et non un clic

function enableDragVersDrew(el, cat, item) {
  demarrerDrag(el, () => ({
    apercu: urlItem(cat, item, true),
    etiquette: item.nom,
    cibleSelector: ".doll-frame",
    classeSurvol: "drop-actif",
    onDepot: () => {
      selection[cat] = item.id;
      renderDoll(cat);
      showFlavorText(piocheVariee(PHRASES_ENFILE));
    },
  }));
}

function optsRetrait(calque) {
  return {
    apercu: urlItem(calque.cat, calque.item, true),
    etiquette: calque.item.nom,
    cibleSelector: ".dock",
    classeSurvol: "drop-retour",
    onDepot: () => {
      selection[calque.cat] = null;
      renderDoll();
      showFlavorText(piocheVariee(PHRASES_RETIRE));
    },
  };
}

/* `resoudreOpts(event)` décide au moment du clic ce qui est attrapé — la
   surface de la poupée sert à toutes les pièces, il faut donc trancher tard.
   Renvoyer null annule le glissé. */
function demarrerDrag(el, resoudreOpts) {
  el.addEventListener("pointerdown", (e) => {
    if (e.button) return; // clic gauche / contact tactile uniquement

    const opts = resoudreOpts(e);
    if (!opts) return;

    const cible = document.querySelector(opts.cibleSelector);
    if (!cible) return;

    const depart = { x: e.clientX, y: e.clientY };
    let fantome = null;

    el.setPointerCapture(e.pointerId);

    const onMove = (ev) => {
      if (!fantome) {
        if (Math.hypot(ev.clientX - depart.x, ev.clientY - depart.y) < SEUIL_DRAG) return;
        fantome = creerFantome(opts.apercu, opts.etiquette);
        el.classList.add("dragging");
      }

      fantome.style.left = ev.clientX + "px";
      fantome.style.top = ev.clientY + "px";
      cible.classList.toggle(opts.classeSurvol, estDansRect(ev.clientX, ev.clientY, cible.getBoundingClientRect()));
    };

    const onUp = (ev) => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      cible.classList.remove(opts.classeSurvol);
      if (!fantome) return; // pas de glissé : c'était un clic, laissé à onclick

      fantome.remove();
      el.classList.remove("dragging");
      // Un vrai glissé ne doit pas déclencher en plus le clic de la vignette.
      el.addEventListener("click", (c) => c.stopImmediatePropagation(), { capture: true, once: true });

      if (ev.type === "pointerup" && estDansRect(ev.clientX, ev.clientY, cible.getBoundingClientRect())) {
        opts.onDepot();
      }
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
  });
}

function creerFantome(apercu, etiquette) {
  const g = document.createElement("div");
  g.className = "drag-ghost";
  // Construit par l'API DOM : un nom de fichier contenant une apostrophe
  // casserait un attribut style assemblé à la main.
  const vue = document.createElement("span");
  vue.className = "drag-ghost-img";
  vue.style.backgroundImage = `url("${apercu}")`;
  g.append(vue, etiquette);
  document.body.appendChild(g);
  return g;
}

function estDansRect(x, y, r) {
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

/* =========================================================
   Quelle pièce est sous le pointeur ?

   Les calques couvrent tout le cadre 400×600 : un test par rectangle rendait
   les pièces internes inatteignables dès qu'une pièce externe passait dessus.
   On teste donc la transparence réelle de chaque calque, du plus externe au
   plus interne. Le masque est calculé une fois par image puis mémorisé, ce
   qui marche aussi bien avec les silhouettes SVG qu'avec de vrais PNG.
   ========================================================= */

const masques = new Map(); // url -> { pret, data:Uint8Array (1 = opaque) }
let calquesPortes = []; // du plus interne au plus externe
let canvasMasque = null;

const SEUIL_ALPHA = 24; // en dessous, on considère le pixel transparent

function masquePour(url) {
  let m = masques.get(url);
  if (m) return m;

  m = { pret: false, data: null };
  masques.set(url, m);

  const img = new Image();
  img.onload = () => {
    if (!canvasMasque) {
      canvasMasque = document.createElement("canvas");
      canvasMasque.width = CANVAS_W;
      canvasMasque.height = CANVAS_H;
    }
    const ctx = canvasMasque.getContext("2d", { willReadFrequently: true });
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.drawImage(img, 0, 0, CANVAS_W, CANVAS_H);
    try {
      const px = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H).data;
      const opaque = new Uint8Array(CANVAS_W * CANVAS_H);
      for (let i = 0, j = 3; i < opaque.length; i++, j += 4) opaque[i] = px[j] > SEUIL_ALPHA ? 1 : 0;
      m.data = opaque;
    } catch (e) {
      // Image d'une autre origine : on ne peut pas lire ses pixels.
      m.data = null;
    }
    m.pret = true;
  };
  img.onerror = () => (m.pret = true);
  img.src = url;
  return m;
}

function calqueSous(clientX, clientY) {
  const doll = document.getElementById("doll");
  const r = doll.getBoundingClientRect();
  if (!r.width || !r.height) return null;

  const x = Math.floor(((clientX - r.left) / r.width) * CANVAS_W);
  const y = Math.floor(((clientY - r.top) / r.height) * CANVAS_H);
  if (x < 0 || y < 0 || x >= CANVAS_W || y >= CANVAS_H) return null;

  for (let i = calquesPortes.length - 1; i >= 0; i--) {
    const calque = calquesPortes[i];
    const m = masquePour(calque.url);
    if (m.pret && m.data && m.data[y * CANVAS_W + x]) return calque;
  }
  return null;
}

// Prépare les masques et le cache image de toute la garde-robe, pour éviter
// le clignotement au premier affichage de chaque pièce.
function prechargeGardeRobe() {
  masquePour(urlCorps());
  Object.entries(manifest).forEach(([cat, items]) => {
    if (cat === "decor" || cat === "body") return; // pas des calques de vêtement
    (items || []).forEach((item) => masquePour(urlItem(cat, item)));
  });
}

/* ========================================================= */

/* `catAnimee` : la catégorie qui vient de changer, pour n'animer qu'elle.
   Passer "*" anime toute la tenue (Chaos Drew), null n'anime rien. */
function renderDoll(catAnimee = null) {
  const doll = document.getElementById("doll");
  doll.innerHTML = "";
  calquesPortes = [];

  // Corps de base (toujours affiché)
  doll.appendChild(calqueImage(urlCorps(), "Drew", false));

  LAYER_ORDER.forEach((cat) => {
    if (cat === "body" || cat === "sticker_overlay") return;
    const id = selection[cat];
    if (!id) return;
    const item = findItem(cat, id);
    if (!item) return;

    const url = urlItem(cat, item);
    const img = calqueImage(url, item.nom, catAnimee === "*" || catAnimee === cat, item);
    doll.appendChild(img);
    calquesPortes.push({ cat, item, url, img });
  });

  doll.appendChild(zoneInteractive());
  updateWardrobeSelectionStyles();
}

/* Une seule surface au-dessus des calques : elle retrouve la pièce visée par
   sa transparence, la met en évidence, et sert de poignée de glissé. */
function zoneInteractive() {
  const zone = document.createElement("div");
  zone.className = "doll-hit";

  const eclaire = (calque) => {
    calquesPortes.forEach((c) => c.img.classList.toggle("survol", c === calque));
    zone.style.cursor = calque ? "grab" : "default";
    zone.title = calque ? `${calque.item.nom} — clique ou glisse vers la garde-robe pour la retirer` : "";
  };

  zone.addEventListener("pointermove", (e) => eclaire(calqueSous(e.clientX, e.clientY)));
  zone.addEventListener("pointerleave", () => eclaire(null));
  zone.addEventListener("click", (e) => {
    const calque = calqueSous(e.clientX, e.clientY);
    if (calque) toggleItem(calque.cat, calque.item.id);
  });

  demarrerDrag(zone, (e) => {
    const calque = calqueSous(e.clientX, e.clientY);
    return calque ? optsRetrait(calque) : null;
  });

  return zone;
}

function calqueImage(url, alt, anime, item) {
  const img = document.createElement("img");
  img.className = "layer-img" + (anime ? " entre" : "");
  img.src = url;
  img.alt = alt;
  img.draggable = false;
  if (item && (item.decalageX || item.decalageY)) {
    img.style.transform = `translate(${item.decalageX || 0}px, ${item.decalageY || 0}px)`;
  }
  return img;
}

function updateWardrobeSelectionStyles() {
  // Les vignettes de décor n'ont pas de catégorie : elles gardent leur
  // propre état, sinon `undefined === undefined` les marquerait toutes.
  document.querySelectorAll(".item-btn[data-cat]").forEach((btn) => {
    btn.classList.toggle("selected", selection[btn.dataset.cat] === btn.dataset.id);
  });
  // Pastille sur les catégories dont Drew porte déjà une pièce
  document.querySelectorAll(".tab-btn").forEach((tab) => {
    tab.classList.toggle("porte", !!selection[tab.dataset.cat]);
  });
}

/* Drew garde ses coordonnées de calques en 400×600 : on ne redimensionne
   pas la scène, on la met à l'échelle pour qu'elle tienne dans la place
   disponible. L'export PNG reste donc inchangé. */
function fitDoll() {
  const fit = document.querySelector(".doll-fit");
  const frame = document.querySelector(".doll-frame");
  if (!fit || !frame) return;
  const dispo = fit.getBoundingClientRect();
  const echelle = Math.min(dispo.width / frame.offsetWidth, dispo.height / frame.offsetHeight, 1);
  document.documentElement.style.setProperty("--doll-scale", echelle.toFixed(3));
}

/* --- Le raid de l'aigle -------------------------------------------------
   Une petite mise en scène plutôt qu'un déshabillage instantané : l'aigle
   arrive, fond sur Drew, et ce n'est qu'au moment où il repart que les
   fringues disparaissent — parties avec lui. Les repères ci-dessous sont
   calés sur les keyframes `volPique` de style.css. */

const AIGLE_DUREE_MS = 1900;  // = --aigle-duree
const AIGLE_SAISIE_MS = 780;  // = le palier 41 %, quand les serres se referment
let raidEnCours = false;

function resetOutfit() {
  if (raidEnCours) return; // un aigle à la fois

  // Réglage système « moins d'animations » : pas de spectacle, on déshabille
  // tout de suite.
  if (animationsCoupees()) {
    deshabilleDrew();
    return;
  }

  raidEnCours = true;
  const bouton = document.getElementById("btn-eagle");
  if (bouton) bouton.disabled = true;

  showFlavorText(piocheVariee(PHRASES_AIGLE_ARRIVEE));
  playEagleAnimation();

  setTimeout(() => {
    // Relevé au dernier moment : le joueur a pu se rhabiller pendant le piqué.
    // Le caleçon qu'il portait déjà reste sur Drew, donc il ne s'envole pas.
    const emportees = calquesPortes.filter(
      (calque) => !(calque.cat === "calecon" && selection.calecon)
    );
    deshabilleDrew();
    envoleLesPieces(emportees);
    secoueDrew();
  }, AIGLE_SAISIE_MS);

  setTimeout(() => {
    raidEnCours = false;
    if (bouton) bouton.disabled = false;
  }, AIGLE_DUREE_MS);
}

/* L'aigle emporte tout sauf le caleçon. Celui que le joueur a choisi s'il en
   a mis un, sinon l'aigle en laisse un au hasard — Drew n'y échappe jamais. */
function deshabilleDrew() {
  const choisi = selection.calecon;
  LAYER_ORDER.forEach((cat) => {
    if (cat !== "body") selection[cat] = null;
  });

  const dispo = manifest.calecon || [];
  const tire = !choisi && dispo.length ? pioche(dispo) : null;
  selection.calecon = choisi || (tire ? tire.id : null);

  renderDoll(tire ? "calecon" : null);
  showFlavorText(
    tire
      ? `L'aigle a tout emporté. Il laisse à Drew un « ${tire.nom} ». 🦅`
      : piocheVariee(PHRASES_AIGLE_BILAN)
  );
}

/* Les pièces arrachées ne s'évaporent pas : elles suivent l'aigle vers le
   ciel. Copiées dans un calque enfant de #doll, elles se calent d'elles-mêmes
   sur les vêtements qu'elles remplacent ; le temps du vol, #doll lève sa
   découpe pour les laisser sortir du cadre. */
const ENVOL_DUREE_MS = 900; // = l'animation `emportee` de style.css
const ENVOL_DECALAGE_MS = 35; // les pièces partent en grappe, pas d'un bloc

function envoleLesPieces(pieces) {
  const doll = document.getElementById("doll");
  if (!pieces.length || !doll) return;

  const envol = document.createElement("div");
  envol.className = "envol";
  envol.setAttribute("aria-hidden", "true");

  pieces.forEach((piece, i) => {
    const img = document.createElement("img");
    img.className = "envol-piece";
    img.src = piece.url;
    img.alt = "";
    img.draggable = false;
    img.style.animationDelay = i * ENVOL_DECALAGE_MS + "ms";
    envol.appendChild(img);
  });

  doll.classList.add("envol-actif");
  doll.appendChild(envol);

  // Un `animationend` par pièce laisserait le calque en place si l'onglet
  // passe en arrière-plan pendant le vol. Un minuteur, lui, nettoie toujours.
  setTimeout(() => {
    envol.remove();
    doll.classList.remove("envol-actif");
  }, ENVOL_DUREE_MS + pieces.length * ENVOL_DECALAGE_MS + 200);
}

function secoueDrew() {
  const doll = document.getElementById("doll");
  if (!doll) return;
  doll.classList.remove("secousse");
  void doll.offsetWidth;
  doll.classList.add("secousse");
}

function animationsCoupees() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function chaosOutfit() {
  LAYER_ORDER.forEach((cat) => {
    if (cat === "body" || cat === "sticker_overlay") return;
    const items = manifest[cat] || [];
    if (items.length === 0) return;
    const pick = Math.random() < 0.15 ? null : items[Math.floor(Math.random() * items.length)].id;
    selection[cat] = pick;
  });

  // Même dans le chaos, Drew garde un caleçon — comme avec l'aigle.
  const calecons = manifest.calecon || [];
  if (!selection.calecon && calecons.length) selection.calecon = pioche(calecons).id;

  renderDoll("*"); // tout a changé : toute la tenue s'anime
  showFlavorText(piocheVariee(PHRASES_CHAOS));
}

function showFlavorText(text) {
  const bulle = document.getElementById("flavor-text");
  const texte = document.getElementById("flavor-texte");
  if (!bulle || !texte) return;
  texte.textContent = text;
  bulle.classList.remove("show");
  void bulle.offsetWidth; // restart animation
  bulle.classList.add("show");
}

function playEagleAnimation() {
  const eagle = document.getElementById("eagle-anim");
  eagle.classList.remove("fly");
  void eagle.offsetWidth;
  eagle.classList.add("fly");
}

document.addEventListener("DOMContentLoaded", () => {
  init();
  document.getElementById("btn-chaos").onclick = chaosOutfit;
  document.getElementById("btn-eagle").onclick = resetOutfit;
  document.getElementById("btn-export").onclick = exportDollAsPng;

  fitDoll();
  window.addEventListener("resize", fitDoll);
  if (document.fonts) document.fonts.ready.then(fitDoll);

  // La bulle a une hauteur fixe, donc la scène ne bouge qu'avec la fenêtre.
  // L'observateur rattrape les cas que `resize` ne couvre pas (barre d'URL
  // mobile qui se rétracte, dock qui change de hauteur).
  if (window.ResizeObserver) {
    new ResizeObserver(fitDoll).observe(document.querySelector(".doll-fit"));
  }
});
