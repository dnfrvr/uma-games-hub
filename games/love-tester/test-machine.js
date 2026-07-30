/* =========================================================
   Banc d'essai du moteur — la machine sans navigateur
   ---------------------------------------------------------
   test-hachage.js prouve que le calcul est juste. Il ne dit rien de la
   plomberie : un `id` mal recopié entre index.html et main.js, un bouton
   branché sur un élément absent, un verdict qui ne se remplit pas. Ces
   fautes-là ne font pas planter la page bruyamment, elles laissent
   simplement un morceau du jeu mort — et une capture d'écran d'un onglet en
   arrière-plan ne les voit pas.

   D'où ce faux DOM, volontairement minuscule : il ne sait pas afficher, il
   sait juste répondre aux quelques opérations que main.js utilise. Son
   registre d'éléments est construit EN LISANT index.html, donc demander un
   `id` absent de la page fait tomber le test.

   La machine est montée deux fois : une fois en mode « moins d'animation »
   (le verdict tombe d'un coup), une fois avec toute la mise en scène et une
   horloge qu'on avance à la main — c'est le seul moyen de vérifier qu'il se
   passe vraiment quelque chose entre le clic et le résultat.

     node games/love-tester/test-machine.js
   ========================================================= */

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ICI = __dirname;
const RACINE = path.join(ICI, "..", "..");

let echecs = 0;
let verifications = 0;

function verifie(titre, condition, detail) {
  verifications++;
  if (condition) console.log("  ok    " + titre);
  else {
    echecs++;
    console.log("  ÉCHEC " + titre + (detail ? "\n          " + detail : ""));
  }
}

function titre(texte) {
  console.log("\n" + texte + "\n" + "-".repeat(texte.length));
}

function echappe(t) {
  return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* =========================================================
   Un DOM de poche
   ========================================================= */

function creeElement(tag) {
  const el = {
    tagName: tag,
    children: [],
    dataset: {},
    style: {},
    attributs: {},
    ecouteurs: {},
    value: "",
    disabled: false,
    title: "",
    type: "",
    offsetWidth: 0,
    _classe: "",
    _html: null,
    _texte: "",
  };

  Object.defineProperty(el, "className", {
    get: () => el._classe,
    set: (v) => {
      el._classe = String(v);
    },
  });

  Object.defineProperty(el, "textContent", {
    get: () => el._texte,
    set: (v) => {
      el._texte = String(v);
      el._html = null;
      el.children = [];
    },
  });

  Object.defineProperty(el, "innerHTML", {
    get: () => (el._html === null ? echappe(el._texte) : el._html),
    set: (v) => {
      el._html = String(v);
      el._texte = "";
      el.children = [];
    },
  });

  const liste = () => el._classe.split(/\s+/).filter(Boolean);
  el.classList = {
    add: (c) => {
      if (liste().indexOf(c) === -1) el._classe = (el._classe + " " + c).trim();
    },
    remove: (c) => {
      el._classe = liste().filter((x) => x !== c).join(" ");
    },
    contains: (c) => liste().indexOf(c) !== -1,
    toggle: (c, force) => {
      if (force) el.classList.add(c);
      else el.classList.remove(c);
    },
  };

  el.focus = () => {};
  el.appendChild = (enfant) => {
    el.children.push(enfant);
    return enfant;
  };
  el.setAttribute = (nom, valeur) => {
    el.attributs[nom] = String(valeur);
  };
  el.removeAttribute = (nom) => {
    delete el.attributs[nom];
  };
  el.getAttribute = (nom) => (nom in el.attributs ? el.attributs[nom] : null);
  el.addEventListener = (type, fn) => {
    (el.ecouteurs[type] = el.ecouteurs[type] || []).push(fn);
  };
  el.querySelectorAll = (selecteur) => {
    const classe = selecteur.replace(/^\./, "");
    const trouves = [];
    (function descend(noeud) {
      noeud.children.forEach((c) => {
        if (c.classList.contains(classe)) trouves.push(c);
        descend(c);
      });
    })(el);
    return trouves;
  };
  el.declenche = (type, evenement) => {
    (el.ecouteurs[type] || []).forEach((fn) =>
      fn(Object.assign({ preventDefault: () => {} }, evenement || {}))
    );
  };

  return el;
}

/* Le registre vient de la page elle-même : c'est ce qui fait de ce faux DOM
   un test et pas une simulation complaisante. */
const HTML = fs.readFileSync(path.join(ICI, "index.html"), "utf8");

/**
 * Monte une machine complète dans son propre bac à sable.
 * @param {boolean} sobre  vrai = « moins d'animation », le verdict tombe net
 */
function monte(sobre) {
  const registre = {};
  for (const m of HTML.matchAll(/\bid="([^"]+)"/g)) registre[m[1]] = creeElement("div");

  const stockage = {};
  const horloge = { t: 0, images: [] };

  const bac = {
    console: console,
    Math: Math,
    Date: Date,
    Set: Set,
    Number: Number,
    String: String,
    JSON: JSON,
    setTimeout: () => 0,
    performance: { now: () => horloge.t },
    requestAnimationFrame: (fn) => horloge.images.push(fn),
    localStorage: {
      getItem: (c) => (c in stockage ? stockage[c] : null),
      setItem: (c, v) => {
        stockage[c] = String(v);
      },
    },
    document: {
      getElementById: (id) => registre[id] || null,
      createElement: creeElement,
      addEventListener: () => {},
    },
  };
  bac.window = bac;
  bac.globalThis = bac;
  bac.window.matchMedia = () => ({ matches: sobre });

  const contexte = vm.createContext(bac);
  [
    path.join(ICI, "hachage.js"),
    path.join(ICI, "verdicts.js"),
    path.join(ICI, "main.js"),
  ].forEach((f) => vm.runInContext(fs.readFileSync(f, "utf8"), contexte, { filename: f }));

  return {
    registre: registre,
    el: (id) => registre[id],
    H: vm.runInContext("loveHachage", contexte),
    D: vm.runInContext("DONNEES_LOVE", contexte),
    /** Avance l'horloge et laisse la boucle d'animation dessiner ses images. */
    avance: function (ms, pas) {
      const cible = horloge.t + ms;
      while (horloge.t < cible) {
        horloge.t = Math.min(cible, horloge.t + (pas || 16));
        const aJouer = horloge.images;
        horloge.images = [];
        aJouer.forEach((fn) => fn(horloge.t));
      }
    },
    teste: function (a, b) {
      registre["lt-nom-a"].value = a;
      registre["lt-nom-b"].value = b;
      registre["lt-nom-a"].declenche("input");
      registre["lt-nom-b"].declenche("input");
      registre["lt-machine"].declenche("submit");
    },
  };
}

/* =========================================================
   1. La page se charge
   ========================================================= */

titre("1. La page se charge sans rien casser");

let M;
try {
  M = monte(true);
  verifie("les quatre scripts s'exécutent dans l'ordre de la page", true);
} catch (e) {
  verifie("les quatre scripts s'exécutent dans l'ordre de la page", false, e.message);
  console.log("\n  Impossible de continuer.\n");
  process.exit(1);
}

const { el, H, D, teste } = M;

verifie(
  "les voyants sont construits depuis verdicts.js",
  el("lt-echelle").children.length === D.TRANCHES.length,
  el("lt-echelle").children.length + " voyants"
);
verifie(
  "les deux légendes annoncent l'attente au départ",
  el("lt-identite-a").textContent === "en attente" &&
    el("lt-identite-b").textContent === "en attente"
);
verifie("le carnet vide affiche sa ligne d'attente", el("lt-carnet").children.length === 1);

/* =========================================================
   2. Un test complet
   ========================================================= */

titre("2. Un test complet, de la saisie au verdict");

teste("Drew", "Glinda");
const attendu = H.score("Drew", "Glinda");

verifie(
  "un prénom du casting affiche sa mention",
  el("lt-identite-a").textContent === "Dress my Drew"
);
verifie(
  "le cadran affiche le score sur trois chiffres (" + el("lt-chiffres").textContent + ")",
  el("lt-chiffres").textContent === String(attendu).padStart(3, "0")
);
verifie(
  "la jauge du cœur est posée à la bonne hauteur",
  Math.abs(Number(el("lt-remplissage").attributs.y) - (112 - (attendu / 100) * 112)) < 0.2,
  "y = " + el("lt-remplissage").attributs.y
);
verifie(
  "le verdict est affiché et cite le pourcentage",
  el("lt-verdict").classList.contains("lt-verdict-visible") &&
    el("lt-verdict").innerHTML.indexOf(attendu + " %") !== -1
);

function rangDe(score) {
  let rang = 0;
  D.TRANCHES.forEach((t, i) => {
    if (score >= t.min) rang = i;
  });
  return rang;
}

(function () {
  const rang = rangDe(attendu);
  verifie(
    "le titre affiché est celui de la bonne tranche (« " + D.TRANCHES[rang].titre + " »)",
    el("lt-verdict").innerHTML.indexOf(echappe(D.TRANCHES[rang].titre)) !== -1
  );
  const actifs = el("lt-echelle").querySelectorAll(".lt-cran-actif");
  verifie(
    "un seul voyant reste allumé, celui de la tranche atteinte",
    actifs.length === 1 && Number(actifs[0].dataset.rang) === rang
  );
  verifie(
    "les voyants inférieurs sont allumés eux aussi",
    el("lt-echelle").querySelectorAll(".lt-cran-atteint").length === rang + 1
  );
})();

verifie(
  "les trois relevés annexes sont affichés",
  D.AXES.every((a) => el("lt-verdict").innerHTML.indexOf(echappe(a.nom)) !== -1)
);
verifie(
  "le carnet a enregistré le relevé",
  el("lt-carnet").children.length === 1 &&
    el("lt-carnet").children[0].children[0].innerHTML.indexOf(attendu + " %") !== -1
);

/* =========================================================
   3. Ce que le joueur va essayer de faire
   ========================================================= */

titre("3. Les gestes que le joueur fera de toute façon");

teste("glinda", "DREW");
verifie(
  "prénoms inversés et casse changée : le verdict ne bouge pas",
  el("lt-chiffres").textContent === String(attendu).padStart(3, "0")
);
verifie("le carnet ne garde pas deux fois le même couple", el("lt-carnet").children.length === 1);

teste("Élias", "eoghan");
verifie(
  "un prénom accentué tombe sur le même score que sa version nue",
  el("lt-chiffres").textContent === String(H.score("Elias", "Eoghan")).padStart(3, "0")
);
verifie("le carnet compte maintenant deux couples", el("lt-carnet").children.length === 2);

teste("Drew", "   ");
verifie(
  "un champ vide arrête tout et le dit",
  el("lt-console").textContent.indexOf("DEUX prénoms") !== -1,
  "lu : " + el("lt-console").textContent
);
verifie("le champ fautif est signalé", el("lt-nom-b").classList.contains("lt-secoue"));

teste("Camille", "Camille");
verifie(
  "se tester avec soi-même déclenche la remarque prévue",
  el("lt-verdict").innerHTML.indexOf("lt-solo") !== -1
);
verifie(
  "un prénom hors casting est annoncé comme inconnu",
  el("lt-identite-a").textContent === "inconnu au bataillon"
);

/* La machine est un appareil à TEXTE. Elle affichait un portrait dessiné de
   chaque côté, et pour un prénom inconnu elle en inventait un depuis le
   hachage — la seule famille de dessins du portail qu'aucune illustration ne
   pouvait remplacer, l'ensemble des prénoms étant infini. Ce contrôle empêche
   qu'un dessin revienne par distraction. */
(function () {
  const zones = ["lt-machine", "lt-verdict", "lt-carnet"];
  const dessins = zones.filter((z) => {
    const html = el(z).innerHTML || "";
    return html.indexOf("<svg") !== -1 || html.indexOf("<img") !== -1;
  });
  verifie("la machine n'affiche aucun dessin ni aucune image",
    dessins.length === 0, dessins.join(", "));
  verifie("le générateur de visages a disparu des données",
    !D.PALETTE && D.CASTING.every((c) => !c.look));
})();

titre("4. Les boutons annexes");

el("lt-nom-a").value = "Drew";
el("lt-nom-b").value = "Glinda";
el("lt-inverser").declenche("click");
verifie(
  "« Inverser » échange bien les deux champs",
  el("lt-nom-a").value === "Glinda" && el("lt-nom-b").value === "Drew"
);

/* Il faut une ligne au carnet avant de pouvoir le vider. Depuis que les
   couples préréglés ont disparu, on la fabrique comme le ferait la visiteuse :
   on saisit deux prénoms et on lance la machine. */
teste("Drew", "Glinda");
M.avance(1200 + 1800 + 400);
verifie("une mesure ajoute bien une ligne au carnet",
  el("lt-carnet").children.length >= 1 &&
    !el("lt-carnet").children[0].classList.contains("lt-carnet-vide"));
el("lt-vider").declenche("click");
verifie(
  "« Effacer le carnet » le vide",
  el("lt-carnet").children.length === 1 &&
    el("lt-carnet").children[0].classList.contains("lt-carnet-vide")
);

el("lt-son").declenche("click");
verifie(
  "le bouton de son bascule et l'annonce aux lecteurs d'écran",
  el("lt-son").textContent === "♪ Muet" && el("lt-son").attributs["aria-pressed"] === "false"
);

/* =========================================================
   5. La mise en scène — le jeu, en fait
   ========================================================= */

titre("5. La machine prend son temps (mode normal, horloge pilotée)");

(function () {
  const A = monte(false);
  const score = A.H.score("Eoghan", "Glinda");

  A.teste("Eoghan", "Glinda");
  A.avance(300);

  verifie(
    "au clic, le bouton se verrouille et la machine s'annonce occupée",
    A.el("lt-tester").disabled === true &&
      A.el("lt-machine").attributs["aria-busy"] === "true" &&
      A.el("lt-machine").classList.contains("lt-chauffe")
  );
  verifie(
    "elle marmonne une étape d'analyse au lieu de répondre (« " +
      A.el("lt-console").textContent +
      " »)",
    A.D.ETAPES.some((e) => A.el("lt-console").textContent.indexOf(e) !== -1)
  );
  verifie(
    "le verdict n'est pas encore tombé",
    !A.el("lt-verdict").classList.contains("lt-verdict-visible")
  );
  verifie(
    "le cadran frémit en bas du cadran, loin du résultat",
    Number(A.el("lt-chiffres").textContent) < 15
  );

  /* On avance jusqu'au milieu de la montée : la jauge doit avoir bougé,
     sans avoir atteint la valeur finale. */
  A.avance(1200 + 900);
  const aMiParcours = Number(A.el("lt-chiffres").textContent);
  verifie(
    "à mi-montée la jauge grimpe (" + aMiParcours + " %) sans avoir tout dit",
    aMiParcours > 0 && aMiParcours !== score
  );

  A.avance(1200);
  verifie(
    "après la montée, le cadran affiche exactement le score (" + score + " %)",
    A.el("lt-chiffres").textContent === String(score).padStart(3, "0")
  );
  verifie(
    "le verdict est tombé et le bouton est rendu au joueur",
    A.el("lt-verdict").classList.contains("lt-verdict-visible") &&
      A.el("lt-tester").disabled === false &&
      !("aria-busy" in A.el("lt-machine").attributs)
  );
  verifie(
    "le même score qu'en mode sobre : la mise en scène ne change pas le résultat",
    score === monte(true).H.score("Eoghan", "Glinda")
  );
})();

console.log(
  "\n" +
    (echecs === 0
      ? "  OK    " + verifications + " vérifications, aucun échec\n"
      : "  " + echecs + " échec(s) sur " + verifications + " vérifications\n")
);
process.exitCode = echecs ? 1 : 0;
