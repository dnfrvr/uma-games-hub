let manifest = {};
// selection[categorie] = id de l'item choisi, ou null
const selection = {};
LAYER_ORDER.forEach((cat) => (selection[cat] = null));

let decorActuel = DECORS[0].id;
let catActive = "decor"; // l'onglet ouvert dans la garde-robe (= RAIL_ORDER[0])

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

/* Les listes de phrases, le barème et les combos sont dans gout.js :
   c'est du contenu, pas de la mécanique. Ce fichier ne fait que les lire. */

async function init() {
  recordGout = litRecord();
  appliquerDecor();
  renderDoll(); // Drew s'affiche même si la garde-robe ne charge pas
  rendGout(evalueGout());

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
  rendGout(evalueGout());
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

  catActive = RAIL_ORDER[0];
  rendEnteteDock();
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
  // Certains combos dépendent du lieu (des lunettes de soleil en intérieur,
  // une tenue de plage sous la pluie) : changer de décor change le score.
  tenueChangee(`Drew pose devant : ${trouveDecor(id).nom}.`);
}

function appliquerDecor() {
  const decor = trouveDecor(decorActuel);
  const doll = document.getElementById("doll");
  doll.style.backgroundColor = decor.vignette || "";
  doll.style.backgroundImage = decor.url ? `url("${decor.url}")` : "none";
  document.querySelectorAll(".decor-btn").forEach((b) => {
    b.classList.toggle("selected", b.dataset.decor === decorActuel);
  });
  rendEnteteDock();
}

function buildItemButton(cat, item) {
  const laideur = item.laideur || 0;

  const btn = document.createElement("button");
  btn.className = "item-btn";
  btn.title = `${item.nom} — ${laideur}/10 de mauvais goût. Attrape-la et lâche-la sur Drew.`;
  btn.dataset.id = item.id;
  btn.dataset.cat = cat;

  const swatch = document.createElement("span");
  swatch.className = "item-swatch";
  swatch.style.backgroundImage = `url("${urlItem(cat, item, true)}")`;

  // La note de la pièce, en clair sur la tuile : sans elle, choisir revient
  // à tirer au sort, et le Drewmètre n'est plus un jeu mais une surprise.
  const note = document.createElement("span");
  note.className = "item-laideur niveau-" + niveauLaideur(laideur);
  note.textContent = laideur;
  note.setAttribute("aria-hidden", "true");

  const nom = document.createElement("span");
  nom.className = "item-nom";
  nom.textContent = item.nom;

  btn.append(swatch, note, nom);
  btn.onclick = () => toggleItem(cat, item.id);
  enableDragVersDrew(btn, cat, item);
  return btn;
}

function niveauLaideur(laideur) {
  if (laideur >= SEUIL_HORRIBLE) return "haut";
  if (laideur < SEUIL_SOBRE) return "bas";
  return "moyen";
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
  catActive = cat;
  document.querySelectorAll(".tab-btn").forEach((b) => {
    const actif = b.dataset.cat === cat;
    b.classList.toggle("active", actif);
    b.setAttribute("aria-selected", actif ? "true" : "false");
  });
  document.querySelectorAll(".wardrobe-panel").forEach((p) => p.classList.toggle("active", p.dataset.cat === cat));
  rendEnteteDock();
}

/* Le rail n'a la place que d'un mot par catégorie. L'en-tête rattrape le
   reste : le nom complet, le nombre de pièces, et surtout ce que Drew
   porte déjà à cet endroit — l'information qui manquait le plus quand on
   fait défiler une bande de vignettes. */
function rendEnteteDock() {
  const entete = document.getElementById("dock-entete");
  if (!entete) return;

  const nom = labelCategorie(catActive);
  const porte = catActive === "decor" ? trouveDecor(decorActuel) : findItem(catActive, selection[catActive]);
  const total = catActive === "decor" ? DECORS.length : (manifest[catActive] || []).length;

  entete.innerHTML = "";
  const titre = document.createElement("b");
  titre.className = "dock-entete-nom";
  titre.textContent = nom;

  const compte = document.createElement("span");
  compte.className = "dock-entete-compte";
  compte.textContent = total + (total > 1 ? " pièces" : " pièce");

  const choix = document.createElement("span");
  choix.className = "dock-entete-choix" + (porte ? "" : " dock-entete-vide");
  choix.textContent = porte ? porte.nom : "rien pour l'instant";

  entete.append(titre, compte, choix);
}

function toggleItem(cat, id) {
  const retire = selection[cat] === id;
  const item = findItem(cat, id);
  selection[cat] = retire ? null : id;
  renderDoll(retire ? null : cat);
  tenueChangee(retire ? phraseRetire(item) : phraseEnfile(item));
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
   Le Drewmètre

   Le moteur ne sait pas ce qui est laid : il additionne les laideurs
   déclarées avec chaque pièce (manifest.json), applique les combos de
   gout.js, et compare le total à un palier. Tout le contenu est donc
   modifiable sans toucher une ligne d'ici — c'est la même séparation
   que pour les silhouettes.
   ========================================================= */

const CLE_RECORD = "drew_gout_record"; // préfixé : le portail partage le localStorage
const SEUIL_SOBRE = 5; // en dessous, la pièce est « portable »
const SEUIL_HORRIBLE = 7; // à partir de là, on la commente autrement

let recordGout = 0;
let recordEnCours = false; // on ne félicite qu'une fois par montée
let combosActifs = new Set();
let dernierSeuil = 0;

function litRecord() {
  try {
    return parseInt(localStorage.getItem(CLE_RECORD), 10) || 0;
  } catch (e) {
    return 0; // navigation privée, ou page ouverte en file:// : on joue sans record
  }
}

function ecrisRecord(valeur) {
  try {
    localStorage.setItem(CLE_RECORD, String(valeur));
  } catch (e) {
    /* pas de stockage : le record vit le temps de la session, c'est tout */
  }
}

/* La tenue portée, dans l'ordre d'empilement. */
function tenuePortee() {
  const pieces = [];
  LAYER_ORDER.forEach((cat) => {
    if (cat === "body" || cat === "sticker_overlay") return;
    const item = selection[cat] && findItem(cat, selection[cat]);
    if (item) pieces.push({ cat, item });
  });
  return pieces;
}

/* Le « lecteur de tenue » passé aux règles de gout.js. Il expose des
   questions (porte-t-il ceci ?), jamais la structure interne : une règle
   écrite aujourd'hui continuera de marcher si `selection` change de forme. */
function lecteurDeTenue(pieces) {
  const etiquettes = pieces.reduce((acc, p) => acc.concat(p.item.tags || []), []);
  return {
    pieces,
    nb: pieces.length,
    decor: decorActuel,
    porte: (id) => pieces.some((p) => p.item.id === id),
    forme: (nom) => pieces.some((p) => (p.item.forme || FORME_PAR_DEFAUT[p.cat]) === nom),
    cat: (c) => (pieces.find((p) => p.cat === c) || {}).item || null,
    nu: (c) => !pieces.some((p) => p.cat === c),
    tag: (e) => etiquettes.indexOf(e) !== -1,
    compte: (e) => etiquettes.filter((x) => x === e).length,
  };
}

function evalueGout() {
  const pieces = tenuePortee();
  const t = lecteurDeTenue(pieces);
  const base = pieces.reduce((somme, p) => somme + (p.item.laideur || 0), 0);

  // Une règle mal écrite ne doit pas emporter le jeu avec elle : elle est
  // simplement ignorée, et signalée en console pour qu'on la corrige.
  const combos = COMBOS.filter((c) => {
    try {
      return !!c.quand(t);
    } catch (e) {
      console.warn("Combo ignoré, sa règle a levé :", c.id, e);
      return false;
    }
  });

  const score = base + combos.reduce((somme, c) => somme + c.points, 0);
  return { score, base, combos, palier: palierPour(score) };
}

function palierPour(score) {
  let trouve = PALIERS[0];
  PALIERS.forEach((p) => {
    if (score >= p.seuil) trouve = p;
  });
  return trouve;
}

function rendGout(etat) {
  const part = Math.min(etat.score / GOUT_MAX, 1) * 100;
  const jauge = document.getElementById("gout-remplissage");
  const marque = document.getElementById("gout-marque");
  const score = document.getElementById("gout-score");
  const palier = document.getElementById("gout-palier");
  const record = document.getElementById("gout-record");
  const combos = document.getElementById("gout-combos");
  if (!jauge) return;

  jauge.style.width = part.toFixed(1) + "%";
  score.textContent = etat.score;
  palier.textContent = etat.palier.titre;
  record.textContent = recordGout ? "record " + recordGout : "";

  // Le repère du record ne se dessine que s'il y en a un, et jamais
  // au-delà du bout de la jauge.
  marque.hidden = !recordGout;
  marque.style.left = Math.min(recordGout / GOUT_MAX, 1) * 100 + "%";

  combos.innerHTML = "";
  etat.combos.forEach((c) => {
    const puce = document.createElement("span");
    puce.className = "gout-combo";
    puce.textContent = c.nom;
    puce.title = c.nom + " : +" + c.points + " points de mauvais goût";
    combos.appendChild(puce);
  });
  combos.classList.toggle("gout-combos-vide", etat.combos.length === 0);
}

/* Le passage obligé après TOUT changement de tenue. Il remet la jauge à
   jour et choisit ce qui mérite d'être dit : une phrase de circonstance
   (`defaut`) ne passe que si rien de plus intéressant ne vient d'arriver.
   `imperatif` sert aux moments qui ont leur propre mise en scène — le raid
   de l'aigle ne doit pas se faire voler sa réplique par un combo. */
function tenueChangee(defaut, imperatif = false) {
  const etat = evalueGout();
  rendGout(etat);

  const nouveaux = etat.combos.filter((c) => !combosActifs.has(c.id));
  const monte = etat.palier.seuil > dernierSeuil;
  const bat = etat.score > recordGout && etat.score > 0;
  // On ne crie au record que s'il y en avait un à battre : le premier
  // vêtement d'un joueur qui découvre le jeu bat forcément « zéro ».
  const premiereFois = bat && !recordEnCours && recordGout > 0;

  combosActifs = new Set(etat.combos.map((c) => c.id));
  dernierSeuil = etat.palier.seuil;
  if (bat) {
    recordGout = etat.score;
    recordEnCours = true;
    ecrisRecord(recordGout);
    rendGout(etat); // le repère du record vient de bouger
  } else if (etat.score < recordGout) {
    recordEnCours = false;
  }

  if (imperatif) showFlavorText(defaut);
  else if (premiereFois) showFlavorText(piocheVariee(PHRASES_RECORD));
  else if (nouveaux.length) showFlavorText(nouveaux[nouveaux.length - 1].texte);
  else if (monte) showFlavorText(etat.palier.texte);
  else showFlavorText(defaut);
}

/* Le ton du commentaire suit la pièce qu'on vient d'enfiler : mettre une
   chemise blanche et mettre un pull de Noël ne se commentent pas pareil. */
function phraseEnfile(item) {
  const laideur = item.laideur || 0;
  if (laideur >= SEUIL_HORRIBLE) return piocheVariee(PHRASES_ENFILE.horrible);
  if (laideur < SEUIL_SOBRE) return piocheVariee(PHRASES_ENFILE.sobre);
  return piocheVariee(PHRASES_ENFILE.moyen);
}

/* Retirer la pièce la plus laide de la tenue est un renoncement, pas un
   nettoyage : le jeu le fait remarquer. À égalité aussi — la pièce était
   quand même ce que la tenue avait de mieux à offrir. */
function phraseRetire(item) {
  const pire = tenuePortee().reduce((max, p) => Math.max(max, p.item.laideur || 0), 0);
  if ((item.laideur || 0) >= SEUIL_HORRIBLE && (item.laideur || 0) >= pire) {
    return piocheVariee(PHRASES_RETIRE_TRESOR);
  }
  return piocheVariee(PHRASES_RETIRE);
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
      tenueChangee(phraseEnfile(item));
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
      tenueChangee(phraseRetire(calque.item));
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
  rendEnteteDock();
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
  // `imperatif` : le raid est une mise en scène, sa réplique ne se fait pas
  // voler par un combo ou un changement de palier.
  tenueChangee(
    tire
      ? `L'aigle a tout emporté. Il laisse à Drew un « ${tire.nom} ». 🦅`
      : piocheVariee(PHRASES_AIGLE_BILAN),
    true
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
  tenueChangee(piocheVariee(PHRASES_CHAOS));
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
