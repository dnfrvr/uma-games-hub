/* =========================================================
   Run, Glinda, Run — le générateur de parcours
   ---------------------------------------------------------
   Le piège du genre : engendrer au hasard une suite d'obstacles dont l'une
   des combinaisons est INFRANCHISSABLE. Le joueur meurt alors sans avoir
   mal joué, et rien dans le code ne signale l'erreur — elle n'arrive qu'une
   fois sur mille parcours.

   Ce fichier existe pour que ça n'arrive jamais, et pour que ça se PROUVE :
   il ne contient aucune ligne de DOM, donc `test-course.js` le fait tourner
   tel quel dans Node, engendre des dizaines de kilomètres et vérifie que
   tout se franchit — d'abord par le calcul, puis en simulant vraiment la
   physique du moteur.

   Les trois garanties, dans l'ordre où elles sont posées :

   1. ADMISSIBILITÉ — un obstacle n'est proposé que si on peut le passer à
      la vitesse qu'on aura en l'atteignant. Un obstacle au sol se franchit
      en restant au-dessus de sa hauteur pendant toute la traversée : le
      saut n'offre pour ça qu'une fenêtre de temps, `fenetreDeSaut(h)`, qui
      se REFERME quand l'obstacle est haut. Donc large + haut + lent = non.
   2. ÉCART — deux obstacles consécutifs sont toujours séparés d'au moins un
      saut complet (v·airDeSaut) plus une marge. On peut donc toujours
      retomber du premier avant d'appeler pour le second.
   3. MARGE — au-delà de ce plancher physique, on ajoute un temps de
      réaction qui, lui, se réduit à mesure que la course avance. C'est là
      que vit la difficulté : le jeu ne devient jamais impossible, il devient
      seulement de moins en moins indulgent.
   ========================================================= */

/* Temps passé en l'air pendant un saut complet, et hauteur atteinte. */
const AIR_DE_SAUT = (2 * PHYSIQUE.saut) / PHYSIQUE.gravite;
const HAUTEUR_DE_SAUT = (PHYSIQUE.saut * PHYSIQUE.saut) / (2 * PHYSIQUE.gravite);

/* Où en est la course, entre 0 (le départ) et 1 (jamais tout à fait). */
function progressionA(x) {
  const metres = Math.max(0, x) / PHYSIQUE.pxParMetre;
  return 1 - Math.exp(-metres / PHYSIQUE.echelle);
}

/* La vitesse du monde à cette abscisse. */
function vitesseA(x) {
  return PHYSIQUE.vMin + (PHYSIQUE.vMax - PHYSIQUE.vMin) * progressionA(x);
}

/* Le temps de réaction offert entre deux obstacles : c'est lui qui se
   referme, pas la physique. */
function reactionA(p) {
  return PHYSIQUE.reactionDepart + (PHYSIQUE.reactionFinale - PHYSIQUE.reactionDepart) * p;
}

/* Combien de temps un saut complet garde-t-il les pieds au-dessus de `h` ?
   C'est la racine de v0·t − g·t²/2 = h : deux instants, et l'écart entre
   eux. Plus l'obstacle est haut, plus la fenêtre est courte — c'est ce qui
   interdit « haut ET large ». */
function fenetreDeSaut(h) {
  const carre = PHYSIQUE.saut * PHYSIQUE.saut - 2 * PHYSIQUE.gravite * h;
  if (carre <= 0) return 0; // plus haut que le saut : rien à faire
  return (2 * Math.sqrt(carre)) / PHYSIQUE.gravite;
}

/* La largeur maximale franchissable, à cette vitesse, pour cette hauteur.
   Le facteur 0,7 est la part de la fenêtre qu'on s'autorise : on ne demande
   jamais au joueur de sauter à l'image près. */
function largeurFranchissable(v, hauteur) {
  return v * fenetreDeSaut(hauteur) * 0.7 - PHYSIQUE.joueurL;
}

/* Idem pour ce qui se passe accroupi : la contrainte n'est plus le saut mais
   le temps qu'on tient la glissade. */
function largeurGlissable(v) {
  return v * PHYSIQUE.glisseMax * 0.7 - PHYSIQUE.joueurL;
}

/* Peut-on poser cet obstacle-là à cette vitesse-là ? */
function estAdmissible(def, v) {
  if (def.genre === "haut") {
    /* Il faut passer dessous accroupi, et pas debout : sinon ce n'est pas un
       obstacle, c'est une décoration ou un mur. */
    if (def.bas < PHYSIQUE.joueurHGlisse + 4) return false;
    if (def.bas >= PHYSIQUE.joueurH) return false;
    return def.largeur <= largeurGlissable(v);
  }
  if (def.hauteur > HAUTEUR_DE_SAUT - 40) return false;
  return def.largeur <= largeurFranchissable(v, def.hauteur);
}

/* L'écart minimal ABSOLU entre le bord droit d'un obstacle et le bord gauche
   du suivant : un saut complet, plus une marge. En dessous, on demanderait
   au joueur d'être encore en l'air pour le second alors qu'il retombe du
   premier — c'est exactement la configuration impossible qu'on refuse. */
function ecartPlancher(v) {
  return v * AIR_DE_SAUT + PHYSIQUE.margeEcart;
}

/* L'écart confortable : le plancher, plus le temps de réaction du moment. */
function ecartConfort(v, p) {
  return ecartPlancher(v) + v * reactionA(p);
}

/* Probabilité qu'une grappe s'enclenche : deux ou trois obstacles collés à
   la distance plancher. Rien avant 30 % de progression — une grappe au
   premier virage, c'est un jeu qui punit avant d'avoir expliqué. */
function probaGrappe(p) {
  return p < 0.3 ? 0 : Math.min(0.42, (p - 0.3) * 0.9);
}

/* --- Boîtes de collision --------------------------------------------------
   Le moteur ET le banc d'essai passent par ces trois fonctions : c'est ce
   qui fait que ce que Node prouve est bien ce que le navigateur joue. */

function boiteJoueur(x, y, accroupi) {
  return {
    x: x,
    y: y,
    l: PHYSIQUE.joueurL,
    h: accroupi ? PHYSIQUE.joueurHGlisse : PHYSIQUE.joueurH,
  };
}

function boiteObjet(o) {
  const haut =
    o.genre === "haut"
      ? PHYSIQUE.ySol - o.bas - o.hauteur
      : o.genre === "pompon"
      ? o.y
      : PHYSIQUE.ySol - o.hauteur;
  return { x: o.x, y: haut, l: o.largeur, h: o.hauteur };
}

function chevauche(a, b) {
  return a.x < b.x + b.l && a.x + a.l > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/* --- Le tirage ------------------------------------------------------------
   Un générateur pseudo-aléatoire à graine, pour que le banc d'essai rejoue
   exactement le même parcours et sache dire LEQUEL a cassé. */
function melangeur(graine) {
  let a = (graine >>> 0) || 1;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Tire un obstacle parmi ceux qui sont à la fois DÉBLOQUÉS (progression) et
   ADMISSIBLES (vitesse). En grappe, on s'en tient aux petits gabarits. */
function tireType(p, v, alea, enGrappe) {
  const possibles = OBSTACLES.filter(function (def) {
    if (def.des > p) return false;
    if (enGrappe && def.largeur > 60) return false;
    return estAdmissible(def, v);
  });
  if (!possibles.length) return null;

  let total = 0;
  for (const def of possibles) total += def.poids;
  let tirage = alea() * total;
  for (const def of possibles) {
    tirage -= def.poids;
    if (tirage <= 0) return def;
  }
  return possibles[possibles.length - 1];
}

/* =========================================================
   Le générateur
   ---------------------------------------------------------
   Il ne connaît que son curseur : l'abscisse du monde jusqu'à laquelle le
   parcours est écrit. `produireJusqua(x)` rallonge le parcours jusqu'à x et
   ne rend QUE les nouveautés — on ne repasse jamais sur ce qui est déjà posé.
   ========================================================= */
function creeGenerateur(graine) {
  const alea = melangeur(graine === undefined ? (Date.now() & 0x7fffffff) : graine);
  let curseur = PHYSIQUE.xJoueur + PHYSIQUE.departLibre;
  let resteGrappe = 0;

  function produireJusqua(xMax) {
    const sortie = [];
    /* Garde-fou : même avec des données absurdes, on ne boucle pas à l'infini. */
    let tours = 0;
    while (curseur < xMax && tours++ < 500) {
      const depart = curseur;
      const p = progressionA(depart);
      const v = vitesseA(depart);
      const enGrappe = resteGrappe > 0;

      const def = tireType(p, v, alea, enGrappe);
      if (!def) {
        /* Aucun obstacle n'est franchissable ici : on laisse la ligne droite
           plutôt que d'en poser un quand même. Ne devrait jamais arriver — le
           plus petit obstacle est admissible dès la vitesse minimale. */
        curseur = depart + 400;
        continue;
      }

      const plancher = ecartPlancher(v);
      let ecart;
      if (enGrappe) {
        ecart = plancher * 1.1;
        resteGrappe -= 1;
      } else {
        /* Hors grappe : le confort, plus du mou qui se resserre avec p.
           À 0 % de progression l'écart peut valoir 1,8 fois le confort ; à
           100 % il colle au confort. */
        ecart = ecartConfort(v, p) * (1 + alea() * 0.8 * (1 - p));
        if (alea() < probaGrappe(p)) resteGrappe = 1 + Math.floor(alea() * 2);
      }

      const x = depart + ecart;

      /* Un pompon ne se pose que dans un intervalle franchement large : il
         faut la place d'un saut ENTIER qui ne serve à rien d'autre, et de
         quoi retomber avant d'appeler pour l'obstacle suivant. */
      if (!enGrappe && ecart >= plancher * 1.9) {
        sortie.push({
          genre: "pompon",
          type: "pompon",
          x: depart + ecart * 0.36,
          y: PHYSIQUE.ySol - PHYSIQUE.pomponHauteur,
          largeur: PHYSIQUE.pomponTaille,
          hauteur: PHYSIQUE.pomponTaille,
        });
      }

      sortie.push({
        genre: def.genre,
        type: def.id,
        def: def,
        x: x,
        largeur: def.largeur,
        hauteur: def.hauteur,
        bas: def.bas || 0,
      });

      curseur = x + def.largeur;
    }
    return sortie;
  }

  return {
    produireJusqua: produireJusqua,
    /* Pour le banc d'essai : savoir où on en est sans toucher au curseur. */
    ou: function () {
      return curseur;
    },
  };
}
