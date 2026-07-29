/* =========================================================
   Balance ta tomate — la cinématique
   ---------------------------------------------------------
   Où est Mads à l'instant t, et où passe une tomate lancée à tel angle avec
   telle puissance. Rien d'autre : aucun DOM, aucun état de partie, aucune
   couleur.

   Pourquoi un fichier à part. Le moteur (`main.js`) et le banc d'essai
   (`test-tomates.js`) doivent faire EXACTEMENT le même calcul, sinon
   l'équilibrage mesuré ne dit rien de la partie réellement jouée. En
   partageant ces fonctions, on ne peut pas dériver : ce que le banc d'essai
   déclare atteignable est atteignable à l'écran, au pixel de calcul près.

   Bonus : le tir affiché n'est pas simulé deux fois. `main.js` appelle
   `simuleTir` au moment du lancer, garde la liste de points et se contente
   de l'animer — donc ce qu'on voit EST le résultat calculé.
   ========================================================= */

/* --- Petites conversions ------------------------------------------------- */

/** Puissance 0–100 → vitesse initiale, en unités de monde par seconde. */
function vitesseDe(puissance) {
  return TIR.vMin + (Math.max(0, Math.min(100, puissance)) / 100) * (TIR.vMax - TIR.vMin);
}

/** Onde triangulaire dans [-1, 1] : un va-et-vient à vitesse constante,
    contrairement au sinus qui traîne aux extrémités. */
function triangle(u, periode) {
  const f = (((u % periode) + periode) % periode) / periode;
  return f < 0.5 ? -1 + 4 * f : 3 - 4 * f;
}

/** Durée d'un cycle complet de Mads, déduite de ses parties. */
function cycleDe(manche) {
  return (
    manche.tNargue + manche.tParade + (manche.refuge === null ? 0 : 2 * manche.tGo + manche.tPlanque)
  );
}

/** Le rectangle d'un abri, en coordonnées de monde. */
function boiteAbri(abri) {
  const type = ABRIS[abri.type];
  return {
    x: abri.x,
    y: MONDE.podium.dessus - type.hauteur,
    l: type.largeur,
    h: type.hauteur,
  };
}

/* =========================================================
   Mads Prout à l'instant t
   ---------------------------------------------------------
   Une fonction pure du temps, volontairement : c'est ce qui rend sa
   difficulté mesurable hors navigateur. Il fanfaronne, il fait les cent
   pas, il court se planquer, il revient. Toujours dans cet ordre.
   ========================================================= */

function positionMads(manche, t) {
  const cycle = cycleDe(manche);
  const u = ((t % cycle) + cycle) % cycle;
  const centre = manche.centre;

  /* 1. Il fanfaronne, immobile, bras levés. C'est la fenêtre de tir
        offerte : elle rétrécit de manche en manche. */
  if (u < manche.tNargue) {
    return { x: centre, etat: "nargue", accroupi: false };
  }

  /* 2. La parade : va-et-vient régulier autour du centre. Le quart de
        période d'avance fait démarrer le trajet AU centre, sinon il
        téléporterait d'une amplitude en sortant de sa pose. */
  const uParade = u - manche.tNargue;
  if (uParade < manche.tParade) {
    return {
      x: centre + manche.amplitude * triangle(uParade + manche.periode / 4, manche.periode),
      etat: "parade",
      accroupi: false,
    };
  }

  /* Sans refuge, la parade occupe tout le reste du cycle. */
  if (manche.refuge === null) {
    return { x: centre, etat: "parade", accroupi: false };
  }

  const xFin =
    centre + manche.amplitude * triangle(manche.tParade + manche.periode / 4, manche.periode);
  const abri = manche.abris[manche.refuge];
  const xRefuge = abri.x + ABRIS[abri.type].largeur / 2;

  /* 3. Il court vers son tonneau. Encore debout : c'est le dernier moment
        pour le cueillir. */
  const uSuite = uParade - manche.tParade;
  if (uSuite < manche.tGo) {
    const p = uSuite / manche.tGo;
    return { x: xFin + (xRefuge - xFin) * p, etat: "course", accroupi: false };
  }

  /* 4. Accroupi derrière l'abri : selon la hauteur du meuble, il ne dépasse
        plus du tout, ou juste assez pour qu'on ait envie d'essayer. */
  const uPlanque = uSuite - manche.tGo;
  if (uPlanque < manche.tPlanque) {
    return { x: xRefuge, etat: "planque", accroupi: true };
  }

  /* 5. Retour au centre, debout, pour repartir en fanfaronnade. */
  const p = (uPlanque - manche.tPlanque) / manche.tGo;
  return { x: xRefuge + (centre - xRefuge) * p, etat: "retour", accroupi: false };
}

/** La boîte de collision de Mads, pieds posés sur l'estrade. */
function boiteMads(etat) {
  const h = etat.accroupi ? MADS.accroupi : MADS.debout;
  return {
    x: etat.x - MADS.largeur / 2,
    y: MONDE.podium.dessus - h,
    l: MADS.largeur,
    h: h,
  };
}

/* =========================================================
   La tomate
   ========================================================= */

/** Le sol à cette abscisse : l'herbe devant, le plancher de l'estrade
    au-delà. La face avant de l'estrade arrête donc les tirs trop tendus. */
function solEn(x) {
  return x >= MONDE.podium.x ? MONDE.podium.dessus : MONDE.sol;
}

/** Position de la tomate `t` secondes après le lancer. Le vent est une
    accélération : il courbe la trajectoire au lieu de la translater. */
function pointTomate(angle, puissance, vent, t) {
  const v = vitesseDe(puissance);
  const rad = (angle * Math.PI) / 180;
  return {
    x: MONDE.lanceur.x + v * Math.cos(rad) * t + 0.5 * vent * t * t,
    y: MONDE.lanceur.y - v * Math.sin(rad) * t + 0.5 * TIR.gravite * t * t,
  };
}

/** Un point est-il dans une boîte, à la grosseur de la tomate près ? */
function dansBoite(p, b, marge) {
  return (
    p.x >= b.x - marge && p.x <= b.x + b.l + marge && p.y >= b.y - marge && p.y <= b.y + b.h + marge
  );
}

/* ---------------------------------------------------------
   Le tir, simulé d'un bout à l'autre
   ---------------------------------------------------------
   `t0` est l'instant de la manche où part la tomate : c'est ce qui oblige à
   viser où Mads SERA au bout du vol, et pas où il est au moment du lancer.

   Ordre des tests à chaque pas, et il compte : l'abri d'abord, Mads
   ensuite. Une tomate qui arrive sur un Mads accroupi derrière un tonneau
   touche donc le tonneau — c'est exactement ce qu'on veut dire par « il se
   cache derrière quelque chose ».

   Renvoie { issue, points, tVol, impact } où `issue` vaut :
     "tete" | "corps"  touché ;
     "abri"            la tomate s'est écrasée sur un meuble ;
     "estrade" | "sol" par terre ;
     "perdu"           sortie du décor.
   --------------------------------------------------------- */

function simuleTir(manche, t0, angle, puissance, vent, options) {
  const opts = options || {};
  const pas = opts.pas || TIR.pas;
  const r = TIR.rayon;
  const abris = manche.abris.map(boiteAbri);
  /* Le banc d'essai n'a que faire du tracé : ne pas l'accumuler économise
     l'essentiel du temps de calcul sur des centaines de milliers de tirs. */
  const garderPoints = opts.points !== false;
  const points = [];

  for (let t = 0; t <= TIR.volMax; t += pas) {
    const p = pointTomate(angle, puissance, vent, t);
    if (garderPoints) points.push(p);

    if (p.x > MONDE.largeur + 6 || p.x < -6) {
      return { issue: "perdu", points: points, tVol: t, impact: p };
    }

    for (let i = 0; i < abris.length; i++) {
      if (dansBoite(p, abris[i], r)) {
        return { issue: "abri", abri: i, points: points, tVol: t, impact: p };
      }
    }

    const etat = positionMads(manche, t0 + t);
    const boite = boiteMads(etat);
    if (dansBoite(p, boite, r)) {
      /* La « pleine poire » : le haut de la silhouette. Sur un Mads
         accroupi la zone descend avec lui, donc elle reste atteignable. */
      const tete = p.y <= boite.y + MADS.tete + r;
      return {
        issue: tete ? "tete" : "corps",
        points: points,
        tVol: t,
        impact: p,
        mads: etat,
      };
    }

    if (p.y >= solEn(p.x)) {
      return {
        issue: p.x >= MONDE.podium.x ? "estrade" : "sol",
        points: points,
        tVol: t,
        impact: { x: p.x, y: solEn(p.x) },
      };
    }
  }

  return { issue: "perdu", points: points, tVol: TIR.volMax, impact: null };
}

/* Aperçu de trajectoire : le début de la parabole, en pointillés, comme sur
   l'affiche. On n'en montre qu'une fraction (`manche.apercu`) — assez pour
   lire son geste, pas assez pour lire la réponse. */
function apercuTir(manche, angle, puissance, vent) {
  /* On cherche d'abord la durée de vol libre (sans cible ni abri) : l'aperçu
     ne doit pas révéler où Mads se trouve. */
  let duree = TIR.volMax;
  for (let t = 0; t <= TIR.volMax; t += TIR.pas) {
    const p = pointTomate(angle, puissance, vent, t);
    if (p.y >= solEn(p.x) || p.x > MONDE.largeur) {
      duree = t;
      break;
    }
  }
  const fin = duree * manche.apercu;
  const points = [];
  const pas = Math.max(TIR.pas, fin / 60);
  for (let t = 0; t <= fin; t += pas) points.push(pointTomate(angle, puissance, vent, t));
  return points;
}

/* Le multiplicateur courant, d'après la série de bons coups. */
function multiplicateur(serie) {
  let m = 1;
  for (const [seuil, valeur] of BAREME.series) if (serie >= seuil) m = valeur;
  return m;
}

/* Node lit ce fichier avec `vm` ; le navigateur, avec une balise <script>.
   Dans les deux cas les fonctions ci-dessus sont déjà globales, ce bloc ne
   sert qu'à les nommer explicitement pour le banc d'essai. */
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    vitesseDe,
    triangle,
    cycleDe,
    boiteAbri,
    positionMads,
    boiteMads,
    solEn,
    pointTomate,
    simuleTir,
    apercuTir,
    multiplicateur,
  };
}
