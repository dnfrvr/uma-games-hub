#!/usr/bin/env node
/* =========================================================
   scan-assets.js — indexe les images déposées, et dit ce qui manque
   ---------------------------------------------------------
   Usage :

     node outils/scan-assets.js            indexe et rapporte
     node outils/scan-assets.js --liste    imprime la liste à produire
     node outils/scan-assets.js --manque   n'imprime que ce qui manque

   Il lit `outils/assets-familles.js` (la liste de référence), parcourt les
   dossiers, vérifie chaque fichier, puis écrit `assets/index.js`. Les pages
   chargent cet index et affichent l'image partout où elle existe.

   Aucune dépendance : les dimensions sont lues directement dans l'en-tête du
   fichier (PNG, JPEG, WebP). Installer une bibliothèque pour lire quatre
   octets aurait été le premier `npm install` d'un dépôt qui n'en a aucun.
   ========================================================= */

"use strict";

const fs = require("fs");
const path = require("path");
const { ECHELLE, FAMILLES, RESTE_EN_SVG } = require("./assets-familles");

const RACINE = path.resolve(__dirname, "..");
const EXTENSIONS = [".png", ".webp", ".jpg", ".jpeg"];

/* =========================================================
   Lire les dimensions sans dépendance
   ========================================================= */

function dimensionsPNG(buf) {
  /* Signature 8 octets, puis le chunk IHDR : longueur (4), type (4),
     largeur (4), hauteur (4), en gros-boutien. */
  if (buf.length < 24) return null;
  if (buf.toString("ascii", 12, 16) !== "IHDR") return null;
  return { largeur: buf.readUInt32BE(16), hauteur: buf.readUInt32BE(20) };
}

function dimensionsJPEG(buf) {
  /* On saute de marqueur en marqueur jusqu'à un SOFn, qui porte la taille. */
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marqueur = buf[i + 1];
    /* SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15 portent la taille ;
       SOF4 (0xc4), SOF8 (0xc8) et SOF12 (0xcc) sont autre chose. */
    const estSOF =
      marqueur >= 0xc0 && marqueur <= 0xcf &&
      marqueur !== 0xc4 && marqueur !== 0xc8 && marqueur !== 0xcc;
    if (estSOF) {
      return { hauteur: buf.readUInt16BE(i + 5), largeur: buf.readUInt16BE(i + 7) };
    }
    const taille = buf.readUInt16BE(i + 2);
    if (taille < 2) return null;
    i += 2 + taille;
  }
  return null;
}

function dimensionsWebP(buf) {
  if (buf.length < 30) return null;
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const type = buf.toString("ascii", 12, 16);

  if (type === "VP8 ") {
    /* Lossy : après la balise de départ 0x9d012a, largeur et hauteur sur
       14 bits chacune, en petit-boutien. */
    return {
      largeur: buf.readUInt16LE(26) & 0x3fff,
      hauteur: buf.readUInt16LE(28) & 0x3fff,
    };
  }
  if (type === "VP8L") {
    /* Sans perte : 14 bits de largeur puis 14 de hauteur, moins un. */
    const bits = buf.readUInt32LE(21);
    return {
      largeur: (bits & 0x3fff) + 1,
      hauteur: ((bits >> 14) & 0x3fff) + 1,
    };
  }
  if (type === "VP8X") {
    /* Étendu (transparence, animation) : tailles sur 24 bits, moins un. */
    return {
      largeur: (buf.readUIntLE(24, 3) & 0xffffff) + 1,
      hauteur: (buf.readUIntLE(27, 3) & 0xffffff) + 1,
    };
  }
  return null;
}

function dimensions(chemin) {
  let buf;
  try {
    buf = fs.readFileSync(chemin);
  } catch (e) {
    return null;
  }
  const ext = path.extname(chemin).toLowerCase();
  if (ext === ".png") return dimensionsPNG(buf);
  if (ext === ".webp") return dimensionsWebP(buf);
  if (ext === ".jpg" || ext === ".jpeg") return dimensionsJPEG(buf);
  return null;
}

/* =========================================================
   Contrôle d'un fichier contre son cadre de référence
   ========================================================= */

function controle(famille, entree, chemin) {
  const dim = dimensions(chemin);
  if (!dim || !dim.largeur || !dim.hauteur) {
    return { ok: false, raison: "illisible (format non reconnu ou fichier corrompu)" };
  }

  const cadre = famille.cadre;
  const echelleLargeur = dim.largeur / cadre.largeur;

  if (famille.ratioLibre) {
    /* Le ratio vient de la donnée du jeu, pas d'ici : on prend l'échelle sur
       la largeur et on ne juge pas la hauteur. */
    return { ok: true, dim, echelle: arrondiEchelle(echelleLargeur), ratioLibre: true };
  }

  const ratioAttendu = cadre.largeur / cadre.hauteur;
  const ratioReel = dim.largeur / dim.hauteur;
  /* 2 % de tolérance : de quoi absorber un arrondi d'export, pas une erreur
     de cadrage. À 48 × 72 ça laisse passer un pixel, pas trois. */
  if (Math.abs(ratioReel - ratioAttendu) / ratioAttendu > 0.02) {
    return {
      ok: false,
      raison:
        "mauvais ratio — " + dim.largeur + "×" + dim.hauteur + " au lieu d'un " +
        "multiple de " + cadre.largeur + "×" + cadre.hauteur +
        " (attendu " + (cadre.largeur * ECHELLE) + "×" + (cadre.hauteur * ECHELLE) + ")",
    };
  }

  return { ok: true, dim, echelle: arrondiEchelle(echelleLargeur) };
}

/* Une échelle très proche d'un entier est prise pour cet entier : un export à
   96 × 144 donne pile 2, mais 97 × 145 donnerait 2,02 et afficherait l'image
   à une taille légèrement fausse. */
function arrondiEchelle(e) {
  const proche = Math.round(e);
  return proche > 0 && Math.abs(e - proche) < 0.02 ? proche : e;
}

/* =========================================================
   Parcours
   ========================================================= */

function trouveFichier(dossier, id) {
  for (const ext of EXTENSIONS) {
    const chemin = path.join(RACINE, dossier, id + ext);
    if (fs.existsSync(chemin)) return chemin;
  }
  return null;
}

function scanne() {
  const index = {};
  const rapport = { ok: [], rejets: [], manquants: [], inattendus: [] };

  for (const [nomFamille, famille] of Object.entries(FAMILLES)) {
    const attendus = new Set();

    for (const entree of famille.ids) {
      attendus.add(entree.id);
      const chemin = trouveFichier(famille.dossier, entree.id);

      if (!chemin) {
        rapport.manquants.push({ famille: nomFamille, entree });
        continue;
      }

      const res = controle(famille, entree, chemin);
      const relatif = path.relative(RACINE, chemin).split(path.sep).join("/");

      if (!res.ok) {
        rapport.rejets.push({ famille: nomFamille, entree, relatif, raison: res.raison });
        continue;
      }

      index[nomFamille + "/" + entree.id] = {
        src: relatif,
        largeur: res.dim.largeur,
        hauteur: res.dim.hauteur,
        echelle: res.echelle,
      };
      rapport.ok.push({ famille: nomFamille, entree, relatif, res });
    }

    /* Un fichier déposé dont personne ne veut : presque toujours une faute de
       frappe dans le nom, donc à signaler plutôt qu'à ignorer. */
    const dossierAbs = path.join(RACINE, famille.dossier);
    if (fs.existsSync(dossierAbs)) {
      for (const f of fs.readdirSync(dossierAbs)) {
        const ext = path.extname(f).toLowerCase();
        if (!EXTENSIONS.includes(ext)) continue;
        const base = path.basename(f, ext);
        if (!attendus.has(base)) {
          rapport.inattendus.push({ famille: nomFamille, fichier: famille.dossier + "/" + f });
        }
      }
    }
  }

  return { index, rapport };
}

/* =========================================================
   Écriture de l'index
   ========================================================= */

function ecritIndex(index) {
  const dossier = path.join(RACINE, "assets");
  fs.mkdirSync(dossier, { recursive: true });

  const cles = Object.keys(index).sort();
  const lignes = cles.map(
    (c) =>
      "  " + JSON.stringify(c) + ": " +
      JSON.stringify(index[c]).replace(/","/g, '", "') + ","
  );

  const contenu =
    "/* =========================================================\n" +
    "   FICHIER GÉNÉRÉ — ne pas modifier à la main.\n" +
    "   Écrit par `node outils/scan-assets.js`.\n" +
    "   ---------------------------------------------------------\n" +
    "   L'index des images disponibles. shared/images.js le lit pour savoir\n" +
    "   quand afficher une image plutôt que le SVG d'origine. Le supprimer ou\n" +
    "   le vider ne casse rien : tout retombe sur les SVG.\n" +
    "\n" +
    "   " + cles.length + " image(s) indexée(s).\n" +
    "   ========================================================= */\n" +
    "window.UMA_ASSETS = {\n" +
    lignes.join("\n") +
    (lignes.length ? "\n" : "") +
    "};\n";

  fs.writeFileSync(path.join(dossier, "index.js"), contenu, "utf8");
  return cles.length;
}

/* =========================================================
   Impression
   ========================================================= */

const gras = (s) => "[1m" + s + "[0m";
const vert = (s) => "[32m" + s + "[0m";
const rouge = (s) => "[31m" + s + "[0m";
const jaune = (s) => "[33m" + s + "[0m";
const gris = (s) => "[90m" + s + "[0m";

function taille(famille) {
  const c = famille.cadre;
  if (famille.ratioLibre) {
    return "largeur " + c.largeur * ECHELLE + " px, hauteur au ratio de la donnée";
  }
  return c.largeur * ECHELLE + " × " + c.hauteur * ECHELLE;
}

function imprimeListe(seulementManquants, rapport) {
  const manquantsPar = new Map();
  if (rapport) {
    for (const m of rapport.manquants) {
      if (!manquantsPar.has(m.famille)) manquantsPar.set(m.famille, new Set());
      manquantsPar.get(m.famille).add(m.entree.id);
    }
  }

  let total = 0;
  for (const [nomFamille, famille] of Object.entries(FAMILLES)) {
    const manquants = manquantsPar.get(nomFamille);
    const ids = seulementManquants
      ? famille.ids.filter((e) => manquants && manquants.has(e.id))
      : famille.ids;
    if (!ids.length) continue;

    console.log("");
    console.log(gras("── " + famille.titre + " ") + gris("(" + ids.length + " fichier(s))"));
    console.log(gris("   dossier : " + famille.dossier + "/"));
    console.log(gris("   taille  : " + taille(famille)));
    if (famille.note) {
      console.log(gris("   " + famille.note.replace(/\s+/g, " ").match(/.{1,68}(\s|$)/g).join("\n   ")));
    }
    console.log("");
    for (const e of ids) {
      total++;
      const nomFichier = (e.id + ".png").padEnd(26);
      console.log("   " + nomFichier + e.nom + gris(e.ou ? "  [" + e.ou + "]" : ""));
    }
  }
  return total;
}

/* =========================================================
   --init : crée les dossiers et y écrit une notice
   ---------------------------------------------------------
   Les notices sont GÉNÉRÉES depuis assets-familles.js et non écrites à la
   main : une notice recopiée aurait menti dès qu'un cadre ou un identifiant
   change. Chaque dossier explique donc toujours la vérité du moment.
   ========================================================= */

function init() {
  let dossiers = 0;
  for (const [nomFamille, famille] of Object.entries(FAMILLES)) {
    const abs = path.join(RACINE, famille.dossier);
    fs.mkdirSync(abs, { recursive: true });
    dossiers++;

    const lignes = [];
    lignes.push("# " + famille.titre);
    lignes.push("");
    lignes.push("Dépose ici tes images, **nommées exactement** comme la liste plus bas,");
    lignes.push("puis lance :");
    lignes.push("");
    lignes.push("```bash");
    lignes.push("node outils/scan-assets.js");
    lignes.push("```");
    lignes.push("");
    lignes.push("Tant qu'un fichier est absent, c'est le dessin SVG d'origine qui");
    lignes.push("s'affiche. Rien ne casse à moitié converti.");
    lignes.push("");
    lignes.push("## Format");
    lignes.push("");
    if (famille.ratioLibre) {
      lignes.push("- Largeur attendue : **" + famille.cadre.largeur * ECHELLE + " px** (export " + ECHELLE + "×).");
      lignes.push("- La hauteur suit le ratio propre à chaque élément, donné dans le");
      lignes.push("  fichier de données du jeu. Le scanner ne vérifie donc que la largeur.");
    } else {
      lignes.push("- Taille attendue : **" + famille.cadre.largeur * ECHELLE + " × " +
        famille.cadre.hauteur * ECHELLE + " px** (le cadre de référence est " +
        famille.cadre.largeur + " × " + famille.cadre.hauteur + ", export " + ECHELLE + "×).");
      lignes.push("- Le **ratio** est vérifié, la taille exacte non : un export en 1× ou 3×");
      lignes.push("  passe aussi, l'échelle est détectée et l'image s'affiche à la bonne");
      lignes.push("  taille. Un ratio faux est refusé, avec le détail à l'écran.");
    }
    lignes.push("- Formats acceptés : `.png`, `.webp`, `.jpg`.");
    lignes.push("");
    if (famille.note) {
      lignes.push("## À savoir");
      lignes.push("");
      lignes.push(famille.note);
      lignes.push("");
    }
    lignes.push("## Les fichiers attendus");
    lignes.push("");
    for (const e of famille.ids) {
      lignes.push("- `" + e.id + ".png` — " + e.nom + (e.ou ? "  _(" + e.ou + ")_" : ""));
    }
    lignes.push("");
    lignes.push("---");
    lignes.push("");
    lignes.push("_Notice générée par `node outils/scan-assets.js --init`. Ne pas la");
    lignes.push("modifier à la main : la source est `outils/assets-familles.js`._");
    lignes.push("");

    fs.writeFileSync(path.join(abs, "LISEZMOI.md"), lignes.join("\n"), "utf8");
  }
  console.log("");
  console.log(gras(String(dossiers)) + " dossier(s) prêt(s), chacun avec sa notice.");
  console.log(gris("Dépose les images puis lance `node outils/scan-assets.js`."));
  console.log("");
}

function principal() {
  const args = process.argv.slice(2);
  const modeListe = args.includes("--liste");
  const modeManque = args.includes("--manque");

  if (args.includes("--init")) {
    init();
    return;
  }

  const { index, rapport } = scanne();

  if (modeListe || modeManque) {
    console.log("");
    console.log(gras("LES IMAGES À PRODUIRE") + gris("  (export " + ECHELLE + "×, fond transparent sauf décors)"));
    const total = imprimeListe(modeManque, rapport);
    console.log("");
    console.log(gras(String(total)) + (modeManque ? " image(s) encore à produire." : " image(s) au total."));
    console.log("");
    console.log(gris("Les deux familles qui restent volontairement en SVG :"));
    for (const r of RESTE_EN_SVG) console.log(gris("  · " + r.quoi + " — " + r.ou));
    console.log("");
    console.log(gris("Dépose tes fichiers, puis relance sans option pour les indexer."));
    console.log("");
    return;
  }

  const combien = ecritIndex(index);

  console.log("");
  if (rapport.ok.length) {
    console.log(gras("Indexé") + " " + vert(String(rapport.ok.length)) + " image(s) :");
    for (const o of rapport.ok) {
      const ech = o.res.echelle;
      const notice = ech === ECHELLE ? "" : jaune("  (échelle " + (Math.round(ech * 100) / 100) + "×)");
      console.log("  " + vert("✓") + " " + o.relatif +
        gris("  " + o.res.dim.largeur + "×" + o.res.dim.hauteur) + notice);
    }
    console.log("");
  }

  if (rapport.rejets.length) {
    console.log(gras("Rejeté") + " " + rouge(String(rapport.rejets.length)) + " fichier(s) :");
    for (const r of rapport.rejets) {
      console.log("  " + rouge("✗") + " " + r.relatif);
      console.log("      " + r.raison);
    }
    console.log("");
  }

  if (rapport.inattendus.length) {
    console.log(jaune("Ignoré") + " — nom inconnu, probablement une faute de frappe :");
    for (const i of rapport.inattendus) console.log("  " + jaune("?") + " " + i.fichier);
    console.log(gris("      `node outils/scan-assets.js --liste` donne les noms attendus."));
    console.log("");
  }

  const total = Object.values(FAMILLES).reduce((n, f) => n + f.ids.length, 0);
  const pourcent = Math.round((combien / total) * 100);
  console.log(
    gras("assets/index.js écrit") + " — " + combien + " / " + total +
    " image(s) en ligne (" + pourcent + " %), " +
    (total - combien) + " encore dessinée(s) en SVG."
  );
  if (rapport.manquants.length) {
    console.log(gris("`node outils/scan-assets.js --manque` liste ce qui reste."));
  }
  console.log("");
}

if (require.main === module) principal();

module.exports = { scanne, dimensions, controle };
