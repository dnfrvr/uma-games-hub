/* =========================================================
   Derry Driver — la conduite, sans une ligne de DOM
   ---------------------------------------------------------
   Ce fichier ne dessine rien et ne lit aucune touche : il fait avancer un
   camion sur une route. C'est volontaire. `main.js` s'en sert pour jouer,
   `test-parcours.js` s'en sert pour PROUVER qu'un parcours est franchissable
   — et comme c'est le même code des deux côtés, une preuve reste une preuve
   après une retouche du moteur.

   Le pas de temps est FIXE (1/120 s) et jamais interpolé. Un ressort de
   suspension raide devient instable si on lui donne le pas d'affichage tel
   quel, et surtout : à pas variable, deux parties identiques divergent, donc
   le banc d'essai ne prouverait plus rien.

   Repère : x le long de la route, y vers le bas. `yc` est l'altitude du point
   de contact des roues ; `air = altitude(x) - yc` vaut donc 0 au sol et
   monte quand le camion vole.
   ========================================================= */

(function (racine) {
  "use strict";

  const PAS = 1 / 120;

  /* =========================================================
     La route
     ---------------------------------------------------------
     Entre deux points, l'altitude suit une demi-cosinusoïde : la pente est
     donc continue d'un segment à l'autre (elle vaut zéro à chaque point).
     Sans ça, chaque sommet serait un angle vif et le camion décollerait à
     tout bout de champ — un relief lisse est ce qui rend l'élan lisible.
     ========================================================= */

  function segment(relief, x) {
    /* Les parcours ont peu de points (une trentaine) : une recherche
       linéaire coûte moins que la mémoire d'un index. */
    for (let i = 0; i < relief.length - 1; i++) {
      if (x >= relief[i].x && x <= relief[i + 1].x) return i;
    }
    return x < relief[0].x ? -1 : relief.length - 1;
  }

  function altitude(relief, x) {
    const i = segment(relief, x);
    if (i < 0) return relief[0].y;
    if (i >= relief.length - 1) return relief[relief.length - 1].y;
    const a = relief[i];
    const b = relief[i + 1];
    const t = (x - a.x) / (b.x - a.x);
    return a.y + (b.y - a.y) * (1 - Math.cos(Math.PI * t)) / 2;
  }

  function pente(relief, x) {
    const i = segment(relief, x);
    if (i < 0 || i >= relief.length - 1) return 0;
    const a = relief[i];
    const b = relief[i + 1];
    const l = b.x - a.x;
    const t = (x - a.x) / l;
    return ((b.y - a.y) * Math.PI * Math.sin(Math.PI * t)) / (2 * l);
  }

  /* =========================================================
     Mise en place
     ========================================================= */

  /* Les obstacles et les bonus sont écrits par type dans parcours.js ; on les
     aplatit une fois pour toutes, triés, pour que la boucle n'ait plus qu'à
     lire des rectangles. */
  function prepare(parcours, catalogueObstacles, catalogueBonus) {
    const obstacles = (parcours.obstacles || [])
      .map((o) => Object.assign({}, catalogueObstacles[o.type], o))
      .sort((a, b) => a.x - b.x);
    const bonus = (parcours.bonus || [])
      .map((b) => Object.assign({ haut: 0 }, catalogueBonus[b.type], b))
      .sort((a, b) => a.x - b.x);
    return { obstacles, bonus };
  }

  function creeContexte(parcours, charge, reglages, catalogueObstacles, catalogueBonus) {
    const listes = prepare(parcours, catalogueObstacles, catalogueBonus);
    return {
      parcours: parcours,
      charge: charge,
      R: reglages,
      obstacles: listes.obstacles,
      bonus: listes.bonus,
    };
  }

  function creeEtat(ctx) {
    const depart = 40;
    return {
      x: depart,
      v: 0,
      yc: altitude(ctx.parcours.relief, depart),
      vy: 0,
      enVol: false,
      tangage: Math.atan(pente(ctx.parcours.relief, depart)),
      vTangage: 0,
      suspension: 0,
      vSuspension: 0,
      sautDemande: 0,
      carburant: ctx.R.carburantMax,
      cargaison: ctx.charge.cartons,
      colis: 0,
      temps: 0,
      distanceMax: depart,
      touches: ctx.obstacles.map(() => false),
      pris: ctx.bonus.map(() => false),
      fini: null, // "arrive" | "panne" | "vide"
    };
  }

  /* =========================================================
     Un pas de simulation
     ---------------------------------------------------------
     `cmd` : { gaz, frein }. Le saut passe par `etat.sautDemande`, une petite
     mémoire (comme le saut d'UMA Bros) : appuyer un dixième de seconde trop
     tôt ne doit pas être puni.
     Renvoie la liste des évènements du pas, que l'appelant traduit en son,
     en secousse ou en compteur — la physique, elle, n'en sait rien.
     ========================================================= */

  function pas(etat, cmd, ctx) {
    const R = ctx.R;
    const ch = ctx.charge;
    const relief = ctx.parcours.relief;
    const ev = [];

    if (etat.fini) return ev;

    const p0 = pente(relief, etat.x);
    const auSol = !etat.enVol;

    /* --- Le long de la route ---------------------------------------------
       La pente entre dans l'équation par sa composante de gravité : c'est
       elle, et rien d'autre, qui fait qu'on lance le camion dans la descente
       pour avoir de quoi grimper la côte d'après. */
    let a = 0;
    const sinTheta = p0 / Math.sqrt(1 + p0 * p0);

    if (auSol) {
      if (cmd.gaz && etat.carburant > 0) a += R.moteur * ch.puissance;
      if (cmd.frein) {
        a -= etat.v > 4 ? R.frein : R.marcheArriere * ch.puissance;
      }
      a += R.gravite * sinTheta;
      a -= etat.v * R.roulement * ch.roulement;
    } else {
      /* En l'air, plus de traction : on garde l'élan qu'on avait. */
      a -= etat.v * R.traineeAir;
    }

    etat.v += a * PAS;
    const vmax = R.vMax * ch.vmax;
    if (etat.v > vmax) etat.v = vmax;
    if (etat.v < -R.vArriere) etat.v = -R.vArriere;

    etat.x += etat.v * PAS;
    if (etat.x < 0) {
      etat.x = 0;
      if (etat.v < 0) etat.v = 0;
    }
    if (etat.x > etat.distanceMax) etat.distanceMax = etat.x;

    const yRoute = altitude(relief, etat.x);
    const p1 = pente(relief, etat.x);

    /* --- Vertical ---------------------------------------------------------
       Deux régimes seulement : collé à la route, ou balistique. */
    if (etat.enVol) {
      etat.vy += R.gravite * PAS;
      etat.yc += etat.vy * PAS;
      if (etat.yc >= yRoute) {
        const choc = etat.vy;
        etat.yc = yRoute;
        etat.vy = 0;
        etat.enVol = false;
        etat.vSuspension = Math.min(2.5, choc / R.chocRef) * 8;
        /* On compare le tangage à la PENTE, pas à l'horizontale : atterrir
           nez en bas dans une descente, c'est bien atterrir. */
        const ecart = Math.abs(etat.tangage - Math.atan(p1));
        ev.push({ type: "atterrit", choc: choc, ecart: ecart });
        if (ecart > R.tangageCasse) {
          etat.v *= 0.55;
          etat.cargaison -= 1;
          ev.push({ type: "casse", raison: "atterrissage de travers" });
        }
      }
    } else {
      etat.yc = yRoute;
      /* Décollage de crête : si la route se dérobe plus vite que la gravité
         ne peut faire tomber le camion, il ne la touche plus. C'est le
         critère physique exact, et c'est ce qui donne le petit envol au
         sommet d'une bosse — gratuit, et impossible à écrire « à la main ». */
      const acc = (etat.v * p1 - etat.v * p0) / PAS;
      if (acc > R.gravite) {
        etat.enVol = true;
        etat.vy = etat.v * p0;
        ev.push({ type: "decolle", crete: true });
      }
    }

    /* --- Le saut ---------------------------------------------------------- */
    etat.sautDemande = Math.max(0, etat.sautDemande - PAS);
    if (etat.sautDemande > 0 && !etat.enVol) {
      etat.sautDemande = 0;
      etat.enVol = true;
      /* On ajoute la vitesse verticale que la route donnait déjà : sauter en
         haut d'une bosse envoie plus haut que sauter à plat. */
      etat.vy = -R.saut * ch.detente + etat.v * p1;
      etat.vSuspension = -6;
      ev.push({ type: "saute" });
    }

    /* --- La suspension et le tangage --------------------------------------
       Deux ressorts amortis. Ils ne changent rien au trajet : ils ne servent
       qu'à ce que la caisse ait l'air lourde. C'est tout l'intérêt. */
    etat.vSuspension += (-R.ressort * etat.suspension - R.amorti * etat.vSuspension) * PAS;
    etat.suspension += etat.vSuspension * PAS;

    const cible = Math.atan(p1);
    const couple = etat.enVol
      ? (cmd.gaz ? -R.couple : 0) + (cmd.frein ? R.couple : 0)
      : 0;
    const k = etat.enVol ? R.tangageKAir : R.tangageKSol;
    const c = etat.enVol ? R.tangageCAir : R.tangageCSol;
    etat.vTangage += ((cible - etat.tangage) * k - c * etat.vTangage + couple) * PAS;
    etat.tangage += etat.vTangage * PAS;

    /* --- Carburant -------------------------------------------------------- */
    if (etat.carburant > 0) {
      const conso = (R.consoBase + (cmd.gaz && auSol ? R.consoGaz : 0)) * ch.conso;
      etat.carburant -= conso * PAS;
      if (etat.carburant <= 0) {
        etat.carburant = 0;
        ev.push({ type: "sec" });
      }
    }

    /* --- Chocs et ramassages ---------------------------------------------- */
    const air = yRoute - etat.yc;
    const avant = etat.x + R.longueur / 2;
    const arriere = etat.x - R.longueur / 2;

    for (let i = 0; i < ctx.obstacles.length; i++) {
      if (etat.touches[i]) continue;
      const o = ctx.obstacles[i];
      if (avant < o.x - o.largeur / 2) break; // triés : le reste est plus loin
      if (arriere > o.x + o.largeur / 2) continue;
      if (air >= o.franchir) continue;
      etat.touches[i] = true;
      etat.v *= 1 - o.freinage;
      etat.cargaison -= o.degats;
      ev.push({ type: "choc", obstacle: o });
    }

    for (let i = 0; i < ctx.bonus.length; i++) {
      if (etat.pris[i]) continue;
      const b = ctx.bonus[i];
      if (etat.x + R.longueur / 2 < b.x - b.rayon) break;
      if (etat.x - R.longueur / 2 > b.x + b.rayon) continue;
      if (Math.abs(air - b.haut) > 46) continue;
      etat.pris[i] = true;
      if (b.carburant) {
        etat.carburant = Math.min(R.carburantMax, etat.carburant + b.carburant);
      }
      if (b.points) etat.colis += 1;
      ev.push({ type: "ramasse", bonus: b });
    }

    etat.temps += PAS;

    /* --- Fin de course ----------------------------------------------------- */
    if (etat.cargaison <= 0) {
      etat.cargaison = 0;
      etat.fini = "vide";
      ev.push({ type: "fin", cause: "vide" });
    } else if (etat.x >= ctx.parcours.arrivee) {
      etat.fini = "arrive";
      ev.push({ type: "fin", cause: "arrive" });
    } else if (etat.carburant <= 0 && Math.abs(etat.v) < 8 && !etat.enVol) {
      etat.fini = "panne";
      ev.push({ type: "fin", cause: "panne" });
    }

    return ev;
  }

  /* Avance d'une durée quelconque, par pas fixes. `reste` est l'accumulateur
     que l'appelant conserve entre deux images. */
  function avance(etat, duree, cmd, ctx, maxPas) {
    let evenements = [];
    let n = 0;
    const limite = maxPas || 10;
    while (duree >= PAS && n < limite) {
      const ev = pas(etat, cmd, ctx);
      if (ev.length) evenements = evenements.concat(ev);
      duree -= PAS;
      n++;
      if (etat.fini) break;
    }
    return { reste: etat.fini ? 0 : duree, evenements: evenements };
  }

  /* Le score : la cargaison d'abord, parce que c'est le métier ; les colis
     retrouvés ensuite ; le temps en dernier, pour départager. */
  function score(etat, ctx) {
    if (etat.fini !== "arrive") return 0;
    const cartons = etat.cargaison * ctx.charge.pointsCarton;
    const colis = etat.colis * 250;
    const vitesse = Math.max(0, Math.round(4000 - etat.temps * 40));
    const jus = Math.round(etat.carburant * 4);
    return cartons + colis + vitesse + jus;
  }

  const api = {
    PAS: PAS,
    altitude: altitude,
    pente: pente,
    prepare: prepare,
    creeContexte: creeContexte,
    creeEtat: creeEtat,
    pas: pas,
    avance: avance,
    score: score,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else racine.DD_PHYSIQUE = api;
})(typeof self !== "undefined" ? self : this);
