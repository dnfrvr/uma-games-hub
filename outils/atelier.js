#!/usr/bin/env node
/* =========================================================
   atelier.js — le serveur de l'atelier des illustrations
   ---------------------------------------------------------
     node outils/atelier.js          puis ouvrir l'adresse affichée

   POURQUOI UN SERVEUR
   ---------------------------------------------------------
   La première version de l'atelier écrivait directement sur le disque depuis
   la page, avec la File System Access API de Chrome. C'était élégant : aucun
   serveur, aucune dépendance. Mais `showDirectoryPicker` s'est révélée
   absente du Chrome de cette machine — contexte sécurisé, page de premier
   niveau, et pourtant `undefined` : une politique d'entreprise suffit à la
   désactiver, et rien dans la page ne peut la contourner.

   Un outil dont l'unique voie peut ne pas exister n'est pas un outil. D'où ce
   serveur : il marche dans tous les navigateurs, sans exception et sans
   permission à accorder. Le coût est une commande à lancer — largement moins
   que ranger 128 fichiers à la main.

   Ce n'est PAS une étape de compilation : le site reste servable tel quel par
   n'importe quel serveur statique. C'est un outil de développement, au même
   titre que les bancs d'essai d'à côté. Aucune dépendance : `http` et `fs`.

   Il ne sert que sur la boucle locale (127.0.0.1) : rien n'est joignable
   depuis le réseau.
   ========================================================= */

"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { FAMILLES, controleDimensions } = require("./assets-familles");
const { dimensions, scanne, ecritIndex, EXTENSIONS } = require("./scan-assets");

const RACINE = path.resolve(__dirname, "..");
const HOTE = "127.0.0.1";
const PORT = Number(process.env.PORT || 8770);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

/* =========================================================
   Utilitaires
   ========================================================= */

function repond(res, code, corps, type) {
  res.writeHead(code, {
    "Content-Type": type || "application/json; charset=utf-8",
    /* L'atelier réécrit des fichiers qu'il vient de lire : sans ça le
       navigateur montrerait la version d'avant. */
    "Cache-Control": "no-store",
  });
  res.end(corps);
}

const enJSON = (res, code, obj) => repond(res, code, JSON.stringify(obj));

/* Un chemin de requête ne doit jamais sortir du dépôt. */
function cheminSur(url) {
  const rel = decodeURIComponent(url.split("?")[0]).replace(/^\/+/, "");
  const abs = path.resolve(RACINE, rel);
  return abs.startsWith(RACINE) ? abs : null;
}

function litCorps(req, max) {
  return new Promise((res, rej) => {
    const bouts = [];
    let taille = 0;
    req.on("data", (c) => {
      taille += c.length;
      if (taille > max) { rej(new Error("fichier trop gros (max " + Math.round(max / 1e6) + " Mo)")); req.destroy(); return; }
      bouts.push(c);
    });
    req.on("end", () => res(Buffer.concat(bouts)));
    req.on("error", rej);
  });
}

/* =========================================================
   L'état : ce qui est déjà en place
   ========================================================= */

function etat() {
  const { rapport } = scanne();
  const place = {};
  rapport.ok.forEach((o) => {
    place[o.famille + "/" + o.entree.id] = {
      src: o.relatif,
      largeur: o.res.dim.largeur,
      hauteur: o.res.dim.hauteur,
      echelle: o.res.echelle,
    };
  });
  const rejets = {};
  rapport.rejets.forEach((r) => {
    rejets[r.famille + "/" + r.entree.id] = { src: r.relatif, raison: r.raison };
  });
  return { place, rejets, inattendus: rapport.inattendus.map((i) => i.fichier) };
}

/* =========================================================
   Déposer un fichier
   ========================================================= */

async function depose(req, res, params) {
  const nomFamille = params.get("famille");
  const id = params.get("id");
  const nomOrigine = params.get("nom") || "";

  const famille = FAMILLES[nomFamille];
  if (!famille) return enJSON(res, 400, { ok: false, raison: "famille inconnue : " + nomFamille });
  if (!famille.ids.some((e) => e.id === id)) {
    return enJSON(res, 400, { ok: false, raison: "id inconnu dans « " + famille.titre + " » : " + id });
  }

  let corps;
  try {
    corps = await litCorps(req, 40e6);
  } catch (e) {
    return enJSON(res, 413, { ok: false, raison: e.message });
  }

  /* L'extension vient du nom d'origine, jamais de l'id : c'est la seule chose
     qu'on garde du fichier déposé. */
  let ext = (nomOrigine.split(".").pop() || "").toLowerCase();
  if (EXTENSIONS.indexOf("." + ext) === -1) ext = "png";

  /* On écrit d'abord dans un fichier temporaire pour le mesurer : les lecteurs
     de dimensions travaillent sur un chemin, et on ne veut pas laisser un
     fichier au mauvais ratio derrière soi. */
  const dossierAbs = path.join(RACINE, famille.dossier);
  fs.mkdirSync(dossierAbs, { recursive: true });
  const tmp = path.join(dossierAbs, "." + id + ".atelier-tmp");
  fs.writeFileSync(tmp, corps);

  const dim = dimensions(tmp) || {};
  const verdict = controleDimensions(famille, dim.largeur, dim.hauteur);

  if (!verdict.ok) {
    fs.unlinkSync(tmp);
    return enJSON(res, 422, { ok: false, raison: verdict.raison });
  }

  /* Le même id dans une autre extension ferait deux fichiers pour un seul
     dessin, et le scanner prendrait le premier de sa liste — pas forcément
     celui qu'on vient de déposer. */
  const garde = id + "." + ext;
  EXTENSIONS.forEach((e) => {
    const autre = path.join(dossierAbs, id + e);
    if (path.basename(autre) !== garde && fs.existsSync(autre)) fs.unlinkSync(autre);
  });

  const cible = path.join(dossierAbs, garde);
  fs.renameSync(tmp, cible);

  enJSON(res, 200, {
    ok: true,
    src: famille.dossier + "/" + garde,
    largeur: dim.largeur,
    hauteur: dim.hauteur,
    echelle: verdict.echelle,
  });
}

function retire(res, params) {
  const famille = FAMILLES[params.get("famille")];
  const id = params.get("id");
  if (!famille) return enJSON(res, 400, { ok: false, raison: "famille inconnue" });

  let retires = 0;
  EXTENSIONS.forEach((e) => {
    const p = path.join(RACINE, famille.dossier, id + e);
    if (fs.existsSync(p)) { fs.unlinkSync(p); retires++; }
  });
  enJSON(res, 200, { ok: true, retires: retires });
}

/* =========================================================
   Le serveur
   ========================================================= */

const serveur = http.createServer(async (req, res) => {
  const [chemin, requete] = req.url.split("?");
  const params = new URLSearchParams(requete || "");

  if (chemin === "/") {
    res.writeHead(302, { Location: "/outils/atelier.html" });
    return res.end();
  }

  /* --- L'API de l'atelier --- */
  if (chemin === "/_atelier/etat") {
    try { return enJSON(res, 200, { ok: true, ...etat() }); }
    catch (e) { return enJSON(res, 500, { ok: false, raison: e.message }); }
  }
  if (chemin === "/_atelier/depose" && req.method === "POST") {
    try { return await depose(req, res, params); }
    catch (e) { return enJSON(res, 500, { ok: false, raison: e.message }); }
  }
  if (chemin === "/_atelier/retire" && req.method === "POST") {
    try { return retire(res, params); }
    catch (e) { return enJSON(res, 500, { ok: false, raison: e.message }); }
  }
  if (chemin === "/_atelier/index" && req.method === "POST") {
    try {
      const { index } = scanne();
      const n = ecritIndex(index);
      return enJSON(res, 200, { ok: true, indexees: n });
    } catch (e) { return enJSON(res, 500, { ok: false, raison: e.message }); }
  }

  /* --- Le reste : les fichiers du dépôt, pour que le site soit jouable
         depuis le même serveur et qu'on voie tout de suite le résultat --- */
  const abs = cheminSur(chemin);
  if (!abs) return repond(res, 403, "Interdit", "text/plain; charset=utf-8");

  let cible = abs;
  try {
    if (fs.statSync(cible).isDirectory()) cible = path.join(cible, "index.html");
  } catch (e) {
    return repond(res, 404, "Introuvable : " + chemin, "text/plain; charset=utf-8");
  }

  fs.readFile(cible, (err, donnees) => {
    if (err) return repond(res, 404, "Introuvable : " + chemin, "text/plain; charset=utf-8");
    repond(res, 200, donnees, TYPES[path.extname(cible).toLowerCase()] || "application/octet-stream");
  });
});

serveur.listen(PORT, HOTE, () => {
  const total = Object.values(FAMILLES).reduce((n, f) => n + f.ids.length, 0);
  let place = 0;
  try { place = Object.keys(etat().place).length; } catch (e) { /* tant pis */ }

  console.log("");
  console.log("  [1mAtelier des illustrations[0m");
  console.log("  [90mDépose tes images, elles sont vérifiées, renommées et rangées.[0m");
  console.log("");
  console.log("    [1mhttp://" + HOTE + ":" + PORT + "/outils/atelier.html[0m");
  console.log("");
  console.log("  " + place + " / " + total + " image(s) déjà en place.");
  console.log("  [90mLe site est jouable depuis ce même serveur (http://" + HOTE + ":" + PORT + "/).[0m");
  console.log("  [90mCtrl+C pour arrêter.[0m");
  console.log("");
});

serveur.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.error("\n  Le port " + PORT + " est déjà pris.");
    console.error("  Relance avec un autre port :  PORT=8771 node outils/atelier.js\n");
  } else {
    console.error(e);
  }
  process.exit(1);
});
