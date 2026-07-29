/* =========================================================
   Collisions de noms de classe entre la coque et les jeux
   ---------------------------------------------------------
   Le CSS n'a qu'un seul espace de noms. Les feuilles partagées (la coque du
   portail) sont chargées AVANT le style de chaque jeu, donc dès qu'un jeu
   emploie le même nom de classe, c'est lui qui gagne — et l'élément du
   portail hérite silencieusement de règles qui ne lui étaient pas destinées.

   Vécu : le jeu de Glinda a une classe `.note` pour les notes qui tombent
   (position absolue, grande taille). La note sur 10 du lecteur, qui portait
   aussi `.note`, s'est retrouvée projetée en haut de la page en énorme.
   Renommée `.notation`.

   À lancer depuis la racine du dépôt :  node outils/test-collisions.js
   ========================================================= */

"use strict";

const fs = require("fs");
const path = require("path");

const RACINE = path.join(__dirname, "..");

/* Les feuilles communes, chargées sur toutes les pages. */
const COQUE = [
  "shared/components.css",
  "shared/navbar.css",
  "shared/sidebar.css",
  "shared/portail.css",
  "shared/skins.css",
  "style-hub.css",
];

/* Les feuilles propres à un jeu, chargées en dernier — donc prioritaires. */
const JEUX = fs
  .readdirSync(path.join(RACINE, "games"))
  .map((d) => "games/" + d + "/style.css")
  .filter((f) => fs.existsSync(path.join(RACINE, f)))
  .sort();

/* `.css` dans une URL ou un commentaire n'est pas un sélecteur. */
const FAUX_AMIS = new Set(["css"]);

/* Points d'extension assumés : `components.css` les pose comme mobilier
   commun, et chaque jeu les redéfinit exprès pour son décor. Ce ne sont pas
   des collisions, c'est le mécanisme. Tout AUTRE nom partagé en est une. */
const PARTAGEES_VOLONTAIREMENT = new Set([
  "fun-btn",   // le bouton d'époque, réhabillé par chaque jeu
  "tab-btn",   // les onglets de la garde-robe de Drew
  "active",    // état générique
  "primary",   // variante générique de bouton
]);

function classes(fichier) {
  const source = fs.readFileSync(path.join(RACINE, fichier), "utf8");
  /* On ne lit que les blocs de sélecteurs (avant chaque `{`) : un `.png` cité
     dans un commentaire ou une url() n'est pas un nom de classe. */
  const trouvees = new Set();
  source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/([^{}]*)\{/g, (_, selecteur) => {
    for (const m of selecteur.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) {
      if (!FAUX_AMIS.has(m[1])) trouvees.add(m[1]);
    }
    return "";
  });
  return trouvees;
}

const deLaCoque = new Map();
for (const f of COQUE) {
  for (const c of classes(f)) {
    if (!deLaCoque.has(c)) deLaCoque.set(c, f);
  }
}

let collisions = 0;
for (const f of JEUX) {
  const communes = [...classes(f)]
    .filter((c) => deLaCoque.has(c) && !PARTAGEES_VOLONTAIREMENT.has(c))
    .sort();
  if (!communes.length) continue;
  collisions += communes.length;
  console.log("\n  ÉCHEC  " + f);
  for (const c of communes) {
    console.log("         ." + c + "  —  déjà défini par " + deLaCoque.get(c));
  }
}

if (collisions) {
  console.log(
    "\n" +
      collisions +
      " collision(s). Renomme le côté PORTAIL (les jeux sont chez eux) " +
      "et relance.\n"
  );
  process.exitCode = 1;
} else {
  console.log(
    "  OK    aucune collision entre la coque du portail et les " +
      JEUX.length +
      " jeux\n"
  );
}
