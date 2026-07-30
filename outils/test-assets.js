#!/usr/bin/env node
/* =========================================================
   Banc d'essai de la chaîne d'images
   ---------------------------------------------------------
   Vérifie que le remplacement des SVG par des PNG fonctionne AVANT qu'un seul
   dessin existe. Sans ça, on ne saurait qu'au premier fichier déposé si la
   plomberie tient — et on chercherait la panne dans le dessin.

   Le banc fabrique de vrais PNG (en-tête + zlib, sans dépendance), les fait
   passer par le scanner, puis interroge le résolveur dans un faux DOM.

   Il nettoie derrière lui : aucun fichier de test ne reste dans assets/.
   ========================================================= */

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");

const RACINE = path.resolve(__dirname, "..");

/* =========================================================
   Fabriquer un PNG valide de N × M pixels
   ---------------------------------------------------------
   On écrit un PNG minimal à la main plutôt que d'ajouter une dépendance à un
   dépôt qui n'en a aucune : signature, IHDR, IDAT (zlib), IEND.
   ========================================================= */

const TABLE_CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = TABLE_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, donnees) {
  const longueur = Buffer.alloc(4);
  longueur.writeUInt32BE(donnees.length, 0);
  const corps = Buffer.concat([Buffer.from(type, "ascii"), donnees]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corps), 0);
  return Buffer.concat([longueur, corps, crc]);
}

function fabriquePNG(largeur, hauteur) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largeur, 0);
  ihdr.writeUInt32BE(hauteur, 4);
  ihdr[8] = 8;  // 8 bits par canal
  ihdr[9] = 6;  // RVB + alpha
  ihdr[10] = 0; // compression standard
  ihdr[11] = 0; // filtrage standard
  ihdr[12] = 0; // pas d'entrelacement

  /* Une image transparente : chaque ligne commence par son octet de filtre. */
  const parLigne = 1 + largeur * 4;
  const brut = Buffer.alloc(parLigne * hauteur, 0);

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(brut)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* =========================================================
   Charger shared/images.js dans un faux DOM
   ========================================================= */

function chargeResolveur(assets) {
  const ctx = {
    console, Math, JSON, Object, String, Number, URL,
    location: { href: "http://exemple.test/games/eoghan-office/index.html" },
    document: { currentScript: { src: "http://exemple.test/shared/images.js" } },
  };
  ctx.window = ctx;
  if (assets) ctx.window.UMA_ASSETS = assets;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(RACINE, "shared/images.js"), "utf8"), ctx, {
    filename: "images.js",
  });
  return ctx;
}

/* =========================================================
   Le banc
   ========================================================= */

const ok = [], ko = [];
const verifie = (nom, cond, detail) => (cond ? ok : ko).push(nom + (detail ? " — " + detail : ""));

const crees = [];
function depose(dossier, nom, largeur, hauteur) {
  const abs = path.join(RACINE, dossier);
  fs.mkdirSync(abs, { recursive: true });
  const chemin = path.join(abs, nom);
  fs.writeFileSync(chemin, fabriquePNG(largeur, hauteur));
  crees.push(chemin);
  return chemin;
}

function nettoie() {
  for (const c of crees) {
    try { fs.unlinkSync(c); } catch (e) { /* déjà parti */ }
  }
}

try {
  /* --- 1. Lecture des dimensions --------------------------------------- */
  const { dimensions, scanne } = require("./scan-assets");

  const p = depose("assets/personnages", "__essai.png", 96, 144);
  const d = dimensions(p);
  verifie("les dimensions d'un PNG sont lues", d && d.largeur === 96 && d.hauteur === 144,
    d ? d.largeur + "×" + d.hauteur : "illisible");
  fs.unlinkSync(p);

  /* --- 2. Le scanner accepte le bon format ------------------------------ */
  depose("assets/personnages", "drew.png", 96, 144);       // 2× pile
  depose("assets/creatures", "ovni.png", 64, 64);          // 1×, accepté aussi
  depose("assets/personnages", "boq.png", 50, 70);         // ratio faux
  depose("assets/personnages", "pas-au-programme.png", 96, 144);

  const { index, rapport } = scanne();

  verifie("un fichier au bon ratio est indexé", !!index["personnages/drew"]);
  verifie("l'échelle 2× est reconnue",
    index["personnages/drew"] && index["personnages/drew"].echelle === 2,
    index["personnages/drew"] ? "échelle = " + index["personnages/drew"].echelle : "absent");
  verifie("l'échelle 1× est reconnue aussi",
    index["creatures/ovni"] && index["creatures/ovni"].echelle === 1,
    index["creatures/ovni"] ? "échelle = " + index["creatures/ovni"].echelle : "absent");
  verifie("le chemin indexé est relatif à la racine",
    index["personnages/drew"] && index["personnages/drew"].src === "assets/personnages/drew.png",
    index["personnages/drew"] && index["personnages/drew"].src);

  verifie("un mauvais ratio est REJETÉ, pas indexé",
    !index["personnages/boq"] && rapport.rejets.some((r) => r.entree.id === "boq"));
  verifie("le rejet explique pourquoi",
    rapport.rejets.some((r) => r.entree.id === "boq" && /ratio/.test(r.raison)),
    (rapport.rejets.find((r) => r.entree.id === "boq") || {}).raison);
  verifie("un nom inconnu est signalé et non avalé",
    rapport.inattendus.some((i) => /pas-au-programme/.test(i.fichier)));
  verifie("ce qui n'est pas déposé est compté comme manquant",
    rapport.manquants.length > 100, rapport.manquants.length + " manquants");

  /* --- 3. Le résolveur -------------------------------------------------- */
  const SVG = '<svg id="repli"></svg>';

  const sansIndex = chargeResolveur(null);
  verifie("sans index, on retombe sur le SVG",
    sansIndex.umaDessin("personnages", "drew", SVG) === SVG);
  verifie("sans index, umaAssetsCharges() est faux", sansIndex.umaAssetsCharges() === false);
  verifie("sans index, umaFond() rend null",
    sansIndex.umaFond("decors-eoghan", "campus") === null);

  const avecIndex = chargeResolveur({
    "personnages/drew": { src: "assets/personnages/drew.png", largeur: 96, hauteur: 144, echelle: 2 },
    "personnages/eoghan": { src: "assets/personnages/eoghan.png", largeur: 96, hauteur: 144, echelle: 2 },
    "creatures/ovni": { src: "assets/creatures/ovni.png", largeur: 64, hauteur: 64, echelle: 1 },
  });

  const rendu = avecIndex.umaDessin("personnages", "drew", SVG);
  verifie("avec index, une image remplace le SVG", /<img/.test(rendu) && !/svg/.test(rendu));
  verifie("l'image pointe le bon fichier", /assets\/personnages\/drew\.png/.test(rendu));
  verifie("un PNG 2× s'affiche à la taille du cadre (48×72)",
    /width="48"/.test(rendu) && /height="72"/.test(rendu), rendu.match(/width="\d+" height="\d+"/));
  verifie("un PNG 1× s'affiche à sa taille (64×64)",
    /width="64"/.test(avecIndex.umaDessin("creatures", "ovni", SVG)));
  verifie("l'alt est vide par défaut (image décorative)", /alt=""/.test(rendu));
  verifie("une classe est transmise",
    /class="acteur"/.test(avecIndex.umaDessin("personnages", "drew", SVG, { classe: "acteur" })));

  /* La cascade : c'est elle qui permet de livrer UN dessin par personnage et
     de voir le résultat partout, avant d'affiner pose par pose. */
  const casc = avecIndex.umaDessin("personnages", "eoghan-accroupi", SVG);
  verifie("la cascade retombe sur le personnage de base",
    /assets\/personnages\/eoghan\.png/.test(casc));
  verifie("la cascade ne confond pas deux personnages",
    avecIndex.umaDessin("personnages", "mads-nargue", SVG) === SVG);
  verifie("un id inconnu retombe sur le SVG",
    avecIndex.umaDessin("personnages", "inexistant", SVG) === SVG);
  verifie("une famille inconnue retombe sur le SVG",
    avecIndex.umaDessin("nimporte-quoi", "drew", SVG) === SVG);

  /* Une source malveillante ne doit pas pouvoir sortir de l'attribut. */
  const piege = chargeResolveur({
    "personnages/drew": { src: 'x" onerror="alert(1)', largeur: 96, hauteur: 144, echelle: 2 },
  });
  verifie("le chemin est échappé dans l'attribut",
    !/onerror="alert/.test(piege.umaDessin("personnages", "drew", SVG)));

  /* --- 4. Le CÂBLAGE des jeux ------------------------------------------
     Le résolveur peut être parfait et un jeu ne jamais l'appeler. Ces
     vérifications chargent le vrai moteur avec un index où TOUTES les images
     existent, et exigent qu'il rende une balise `img` au lieu du SVG. C'est
     ce qui garantit que déposer un fichier suffit — sans elles, on ne le
     saurait qu'en regardant l'écran, et seulement pour le jeu regardé. */
  const indexComplet = {};
  {
    const { FAMILLES: F } = require("./assets-familles");
    for (const [nom, fam] of Object.entries(F)) {
      for (const e of fam.ids) {
        indexComplet[nom + "/" + e.id] = {
          src: fam.dossier + "/" + e.id + ".png",
          largeur: fam.cadre.largeur * 2, hauteur: fam.cadre.hauteur * 2, echelle: 2,
        };
      }
    }
  }

  function chargeJeu(dossier, assets) {
    const registre = {};
    const horloge = { t: 0 };
    const fakeEl = () => {
      const set = new Set();
      const ec = {};
      return {
        children: [], className: "", textContent: "", innerHTML: "", title: "", type: "",
        offsetWidth: 0, hidden: false,
        style: { setProperty() {}, removeProperty() {} }, dataset: {},
        classList: {
          add(...c) { c.forEach((x) => set.add(x)); },
          remove(...c) { c.forEach((x) => set.delete(x)); },
          toggle(c, v) { (v === undefined ? !set.has(c) : v) ? set.add(c) : set.delete(c); },
          contains(c) { return set.has(c); },
        },
        appendChild(c) { this.children.push(c); return c; },
        append(...c) { this.children.push(...c); },
        addEventListener(t, f) { (ec[t] = ec[t] || []).push(f); },
        declenche(t, ev) { (ec[t] || []).forEach((f) => f(Object.assign({ preventDefault() {} }, ev))); },
        removeAttribute() {}, setAttribute() {}, remove() {},
        /* Le bouchon doit répondre à tout ce que les dix moteurs appellent au
           chargement, sinon l'essai échoue pour une raison qui n'a rien à voir
           avec ce qu'on mesure. */
        querySelector() { return fakeEl(); },
        querySelectorAll() { return []; },
        closest() { return null; },
        focus() {}, blur() {},
        insertBefore(c) { this.children.push(c); return c; },
        getContext() { return contexte2D(); },
        getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 320 }; },
      };
    };
    /* Derry Driver dessine sa route au canvas : il faut un contexte muet. */
    const contexte2D = () => new Proxy({}, {
      get(cible, prop) {
        if (prop === "canvas") return { width: 800, height: 320 };
        if (prop === "createLinearGradient" || prop === "createPattern") {
          return () => ({ addColorStop() {} });
        }
        if (prop === "measureText") return () => ({ width: 10 });
        return typeof prop === "string" ? () => undefined : undefined;
      },
      set() { return true; },
    });
    const ctx = {
      console, Math, JSON, Set, Map, Number, String, Array, Object, URL,
      performance: { now: () => horloge.t },
      setTimeout: () => 0, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
      requestAnimationFrame: () => 0, cancelAnimationFrame() {},
      addEventListener() {}, removeEventListener() {},
      devicePixelRatio: 1, innerWidth: 1000, innerHeight: 800,
      localStorage: {
        _d: {},
        getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
        setItem(k, v) { this._d[k] = String(v); },
        removeItem(k) { delete this._d[k]; },
      },
      location: { href: "http://exemple.test/games/x/index.html", search: "" },
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
        documentElement: fakeEl(),
        currentScript: { src: "http://exemple.test/shared/images.js" },
        getElementById: (id) => (registre[id] = registre[id] || fakeEl()),
        createElement: () => fakeEl(),
        createElementNS: () => fakeEl(),
        querySelector: () => fakeEl(),
        querySelectorAll: () => [],
        addEventListener() {},
        removeEventListener() {},
        hidden: false,
        visibilityState: "visible",
      },
    };
    ctx.window = ctx;
    ctx.window.matchMedia = () => ({ matches: false });
    ctx.window.AudioContext = ctx.AudioContext;
    if (assets) ctx.window.UMA_ASSETS = assets;
    vm.createContext(ctx);

    /* Même ordre que dans les pages : index, résolveur, perso, données, moteur. */
    vm.runInContext(fs.readFileSync(path.join(RACINE, "shared/images.js"), "utf8"), ctx, { filename: "images.js" });
    vm.runInContext(fs.readFileSync(path.join(RACINE, "shared/perso.js"), "utf8"), ctx, { filename: "perso.js" });
    const dir = path.join(RACINE, dossier);
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".js") && f !== "main.js" && !f.startsWith("test-"))) {
      vm.runInContext(fs.readFileSync(path.join(dir, f), "utf8"), ctx, { filename: f });
    }
    vm.runInContext(fs.readFileSync(path.join(dir, "main.js"), "utf8"), ctx, { filename: "main.js" });
    return { ctx, horloge, lit: (e) => vm.runInContext(e, ctx) };
  }

  /* La fabrique de personnages : le point de passage de TOUT le portail. */
  const avecTout = chargeResolveur(indexComplet);
  const persoCtx = (() => {
    const c = { console, Math, JSON, Object, String, Number, URL,
      location: { href: "http://exemple.test/x/" },
      document: { currentScript: { src: "http://exemple.test/shared/images.js" }, createElement: () => ({}) } };
    c.window = c; c.window.UMA_ASSETS = indexComplet;
    vm.createContext(c);
    vm.runInContext(fs.readFileSync(path.join(RACINE, "shared/images.js"), "utf8"), c, { filename: "images.js" });
    vm.runInContext(fs.readFileSync(path.join(RACINE, "shared/perso.js"), "utf8"), c, { filename: "perso.js" });
    return c;
  })();

  verifie("persoSVG rend une image quand `id` est fourni",
    /<img/.test(persoCtx.persoSVG({ id: "drew", peau: "#fff" })));
  verifie("persoSVG rend le SVG quand `id` est absent",
    /<svg/.test(persoCtx.persoSVG({ peau: "#fff" })));
  verifie("persoSVG suit `asset` pour une variante",
    /eoghan-accroupi\.png/.test(persoCtx.persoSVG({ id: "eoghan", asset: "eoghan-accroupi" })));

  /* UMA Memory : les 34 cartes doivent toutes basculer en image. */
  {
    const { lit } = chargeJeu("games/uma-memory", indexComplet);
    const motifs = lit("MOTIFS");
    verifie("Memory : chaque motif déclare son dossier d'assets",
      motifs.every((m) => !!m.dossier), motifs.filter((m) => !m.dossier).map((m) => m.id).join(", "));
    const persos = motifs.filter((m) => m.dossier === "personnages");
    verifie("Memory : les cartes personnages passent en image",
      persos.length > 0 && persos.every((m) => /<img/.test(m.svg)),
      persos.length + " cartes");
  }

  /* Sanity Whack : cibles et pièges. */
  {
    const { lit } = chargeJeu("games/elias-whack", indexComplet);
    const cibles = lit("CIBLES"), pieges = lit("PIEGES");
    verifie("Sanity Whack : chaque cible déclare son dossier",
      cibles.every((c) => !!c.dossier));
    verifie("Sanity Whack : chaque piège déclare son dossier",
      pieges.every((p) => !!p.dossier));
    verifie("Sanity Whack : l'avatar d'Elias passe en image",
      /<img/.test(lit('persoSVG({ id: "elias", asset: "elias-panique" })')));
  }

  /* --- 4 bis. Les pages chargent la plomberie, DANS LE BON ORDRE --------
     L'ordre n'est pas cosmétique : les fichiers de données appellent persoSVG
     au chargement, donc `umaDessin` doit déjà exister. Mal rangé, rien ne
     casse — les images sont juste ignorées en silence, ce qui est le pire des
     deux mondes. D'où cette vérification plutôt qu'une relecture à l'œil. */
  {
    const PAGES = [
      "index.html",
      "games/drew-dress-up/index.html", "games/glinda-cheer/index.html",
      "games/elias-whack/index.html", "games/eoghan-office/index.html",
      "games/uma-bros/index.html", "games/glinda-run/index.html",
      "games/derry-driver/index.html", "games/tomates/index.html",
      "games/uma-memory/index.html", "games/love-tester/index.html",
    ];
    const sans = [], malRange = [];
    for (const p of PAGES) {
      const html = fs.readFileSync(path.join(RACINE, p), "utf8");
      const iIndex = html.indexOf("assets/index.js");
      const iImages = html.indexOf("shared/images.js");
      const iPerso = html.indexOf("shared/perso.js");
      if (iIndex < 0 || iImages < 0) { sans.push(p); continue; }
      /* index avant résolveur, et résolveur avant la fabrique de personnages
         (quand la page en a une — le hub n'en a pas). */
      if (iIndex > iImages || (iPerso >= 0 && iImages > iPerso)) malRange.push(p);
    }
    verifie("les 11 pages chargent l'index et le résolveur", sans.length === 0, sans.join(", "));
    verifie("les scripts sont dans le bon ordre partout", malRange.length === 0, malRange.join(", "));
  }

  /* --- 4 ter. Aucun moteur ne casse au chargement -----------------------
     Les `id` posés dans les fichiers de données traversent du code qui n'était
     pas écrit pour eux. Un chargement à blanc des dix moteurs attrape tout de
     suite une faute de frappe ou une virgule perdue. */
  {
    const JEUX = [
      "games/drew-dress-up", "games/glinda-cheer", "games/elias-whack",
      "games/eoghan-office", "games/uma-bros", "games/glinda-run",
      "games/derry-driver", "games/tomates", "games/uma-memory",
      "games/love-tester",
    ];
    const essaie = (j, assets) => {
      try { chargeJeu(j, assets); return null; }
      catch (e) { return e.message.slice(0, 70); }
    };

    /* Ce qui compte n'est PAS « zéro erreur » : le faux DOM de ce banc reste
       sommaire, et deux moteurs très liés à la mise en page (Run Glinda Run
       mesure ses couches, Derry Driver dessine au canvas) buteront toujours
       sur un bouchon. Reproduire fidèlement leur DOM serait réécrire un
       navigateur pour ne rien apprendre de plus.

       Ce qui compte, c'est que l'activation des images n'introduise AUCUNE
       panne nouvelle : on compare donc les deux chargements. Un moteur qui
       tombe dans les deux cas est une limite du bouchon ; un moteur qui ne
       tombe QU'AVEC les images est une vraie régression. */
    const nouvelles = [], sansImages = [];
    for (const j of JEUX) {
      const nom = j.replace("games/", "");
      const avant = essaie(j, null);
      const apres = essaie(j, indexComplet);
      if (avant) sansImages.push(nom);
      if (apres && !avant) nouvelles.push(nom + " (" + apres + ")");
    }

    verifie("activer les images ne casse AUCUN moteur",
      nouvelles.length === 0, nouvelles.join(" | "));
    verifie("au moins 8 moteurs sur 10 se chargent dans le faux DOM",
      JEUX.length - sansImages.length >= 8,
      "hors d'atteinte du bouchon : " + (sansImages.join(", ") || "aucun"));
  }

  /* --- 4 quater. CHAQUE famille est réellement câblée -------------------
     Le piège de tout ce dispositif : déclarer une famille, générer son
     dossier, valider les fichiers déposés… et n'appeler le résolveur nulle
     part. Le scanner dirait « indexé », l'écran continuerait d'afficher le
     SVG, et rien ne signalerait l'écart. Cette vérification cherche le nom de
     chaque famille dans le code qui tourne : si personne ne le mentionne,
     c'est qu'aucun point d'appel ne la consomme. */
  {
    const { FAMILLES: F } = require("./assets-familles");
    const sources = [];
    const ajoute = (dir) => {
      for (const f of fs.readdirSync(path.join(RACINE, dir), { withFileTypes: true })) {
        const rel = dir + "/" + f.name;
        if (f.isDirectory()) { ajoute(rel); continue; }
        if (!/\.(js|html)$/.test(f.name) || f.name.startsWith("test-")) continue;
        sources.push(fs.readFileSync(path.join(RACINE, rel), "utf8"));
      }
    };
    ajoute("games");
    ajoute("shared");
    sources.push(fs.readFileSync(path.join(RACINE, "index.html"), "utf8"));
    const tout = sources.join("\n");

    /* Les personnages passent par persoSVG (via `id`) et non par un nom de
       famille écrit en clair : on la vérifie autrement, plus haut. */
    const orphelines = Object.keys(F).filter(
      (nom) => nom !== "personnages" && tout.indexOf('"' + nom + '"') === -1
    );
    verifie("chaque famille d'assets est consommée par au moins un point d'appel",
      orphelines.length === 0,
      orphelines.length ? "jamais appelée : " + orphelines.join(", ") : "");

    verifie("la famille des personnages passe par persoSVG",
      fs.readFileSync(path.join(RACINE, "shared/perso.js"), "utf8")
        .indexOf('umaDessin("personnages"') !== -1);
  }

  /* --- 5. La liste et le code sont d'accord ----------------------------- */
  const { FAMILLES, ECHELLE } = require("./assets-familles");
  verifie("l'échelle de référence est 2×", ECHELLE === 2);

  const doublons = [];
  for (const [nom, f] of Object.entries(FAMILLES)) {
    const vus = new Set();
    for (const e of f.ids) {
      if (vus.has(e.id)) doublons.push(nom + "/" + e.id);
      vus.add(e.id);
    }
    verifie("« " + f.titre + " » a un dossier et un cadre",
      !!f.dossier && !!f.cadre && f.cadre.largeur > 0 && f.cadre.hauteur > 0);
    verifie("« " + f.titre + " » : chaque entrée a un id et un nom",
      f.ids.every((e) => e.id && e.nom && /^[a-z0-9-]+$/.test(e.id)));
  }
  verifie("aucun id en double dans une famille", doublons.length === 0, doublons.join(", "));
} finally {
  nettoie();
  /* L'index a été réécrit par le scan de test : on le remet à vide, sinon il
     resterait des chemins vers des fichiers qu'on vient de supprimer. */
  try {
    require("./scan-assets").scanne();
    const { execSync } = require("child_process");
    execSync("node " + JSON.stringify(path.join(__dirname, "scan-assets.js")), { cwd: RACINE, stdio: "ignore" });
  } catch (e) { /* pas grave */ }
}

console.log("");
for (const n of ok) console.log("  OK    " + n);
for (const n of ko) console.log("  ÉCHEC " + n);
console.log("");
console.log(ok.length + " vérifications passées, " + ko.length + " échouées.");
process.exit(ko.length ? 1 : 0);
