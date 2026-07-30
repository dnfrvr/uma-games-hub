/* =========================================================
   Derry Driver — le rendu, les commandes, les écrans
   ---------------------------------------------------------
   Ce fichier ne calcule aucune trajectoire : il lit les touches, appelle
   `physique.js` et dessine ce qu'elle lui rend. Toute la conduite est
   ailleurs, ce qui permet au banc d'essai de la faire tourner sans
   navigateur — et donc de PROUVER qu'un parcours est franchissable.

   Le décor et le camion sont dessinés au canvas et pas en DOM, contrairement
   aux autres jeux du portail : ici le sol est une courbe, la caisse tangue et
   la suspension s'écrase. Ça se dessine en trois chemins ; en DOM, ça
   demanderait une pile de `transform` imbriqués pour un résultat moins bon.
   Le trait reste celui de la maison : gros contour sombre, aplats, rien
   d'importé.
   ========================================================= */

(function () {
  "use strict";

  const P = window.DD_PHYSIQUE;
  const R = DD_REGLAGES;

  const TRAIT = "#2b1a2e";
  const VERT_CAMION = "#4ad66d";
  const VERT_SOMBRE = "#37b24d";
  const ACCENT = "#2f9e44";

  /* Le repère du dessin : le camion est cadré à 36 % de la largeur, ce qui
     laisse voir ce qui arrive sans le coller au bord. */
  const CADRAGE_X = 0.36;
  const CADRAGE_Y = 0.62;

  const CLE_RECORDS = "derry_driver_records";

  /* Drew, sorti de la fabrique commune : le même bonhomme que dans les autres
     jeux du portail. Il n'apparaît qu'à l'écran-titre — au volant, c'est une
     silhouette dessinée au canvas, à la même échelle que le camion. */
  const DREW = {
    peau: "#f8dcc0",
    cheveux: "long",
    couleurCheveux: "#8a5a2b",
    haut: "#2f9e44",
    bas: "#3a2b4e",
    bouche: "sourire",
    regard: "face",
  };

  /* --- Raccourcis DOM --- */
  const $ = (sel) => document.querySelector(sel);
  const toile = $("#dd-toile");
  const pinceau = toile.getContext("2d");
  const ecran = $("#dd-ecran");
  const annonce = $("#dd-annonce");

  /* --- État de la partie --- */
  const jeu = {
    charge: null,
    index: 0,
    ctx: null,
    etat: null,
    enCours: false,
    scoreTotal: 0,
    decor: [],
    sobre: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };

  const cam = { x: 0, y: 0 };
  const touches = { gaz: false, frein: false };
  let reste = 0;
  let dernier = 0;
  let boucle = null;
  let secousse = 0;
  let poussieres = [];
  let largeur = 900;
  let hauteur = 420;

  /* =========================================================
     Les records — la seule chose que le jeu garde d'une visite à l'autre
     ========================================================= */

  function records() {
    try {
      return JSON.parse(localStorage.getItem(CLE_RECORDS) || "{}");
    } catch (e) {
      return {};
    }
  }

  function record(parcoursId) {
    return records()[parcoursId] || 0;
  }

  function noteRecord(parcoursId, score) {
    try {
      const tout = records();
      if (score > (tout[parcoursId] || 0)) {
        tout[parcoursId] = score;
        localStorage.setItem(CLE_RECORDS, JSON.stringify(tout));
        return true;
      }
    } catch (e) {
      /* Navigation privée, quota plein : un record perdu n'empêche pas de
         jouer, on continue sans rien dire. */
    }
    return false;
  }

  /* =========================================================
     Mise à la taille du canvas
     ---------------------------------------------------------
     On dessine dans un repère en pixels CSS et on laisse le facteur d'écran
     au `setTransform` : sans ça, tous les traits sont flous sur un écran à
     forte densité, et un jeu à gros contours ne pardonne pas le flou.
     ========================================================= */

  function redimensionne() {
    const boite = toile.parentElement.getBoundingClientRect();
    const densite = Math.min(window.devicePixelRatio || 1, 2);
    largeur = Math.max(320, Math.round(boite.width));
    hauteur = Math.max(240, Math.round(boite.height));
    toile.width = Math.round(largeur * densite);
    toile.height = Math.round(hauteur * densite);
    toile.style.width = largeur + "px";
    toile.style.height = hauteur + "px";
    pinceau.setTransform(densite, 0, 0, densite, 0, 0);
  }

  /* =========================================================
     Le décor, semé à partir d'une graine
     ---------------------------------------------------------
     Le parcours décrit une ambiance (« des sapins tous les 250 px »), pas
     quarante arbres à la main. Le tirage est déterministe : deux parties du
     même parcours ont exactement le même décor.
     ========================================================= */

  function tirage(graine) {
    let s = graine >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function semeDecor(parcours) {
    const d = parcours.decor;
    const alea = tirage(d.graine);
    const liste = [];
    for (let x = -400; x < parcours.longueur + 600; x += d.espacement) {
      liste.push({
        type: d.motifs[Math.floor(alea() * d.motifs.length)],
        x: x + alea() * d.espacement * 0.7,
        h: 120 + alea() * 130,
        l: 60 + alea() * 90,
      });
    }
    return liste;
  }

  /* =========================================================
     Une course
     ========================================================= */

  function chargeParcours(i) {
    const parcours = DD_PARCOURS[i];
    /* Retirer un parcours de parcours.js ne doit jamais casser la page : s'il
       n'y a rien à cet index, on revient au choix du chargement. */
    if (!parcours) return ecranChoix();
    jeu.index = i;
    jeu.ctx = P.creeContexte(parcours, jeu.charge, R, DD_OBSTACLES, DD_BONUS);
    jeu.etat = P.creeEtat(jeu.ctx);
    jeu.decor = semeDecor(parcours);
    poussieres = [];
    secousse = 0;
    cam.x = jeu.etat.x - largeur * CADRAGE_X;
    cam.y = jeu.etat.yc - hauteur * CADRAGE_Y;
    cacheEcran();
    jeu.enCours = true;
    reste = 0;
    dernier = 0;
    dis(parcours.nom + ". " + parcours.ambiance);
    majDock();
    if (boucle) cancelAnimationFrame(boucle);
    boucle = requestAnimationFrame(tourne);
  }

  function tourne(t) {
    boucle = requestAnimationFrame(tourne);
    if (!dernier) dernier = t;
    /* On plafonne le pas : un onglet revenu au premier plan enverrait sinon
       une seconde d'un coup, et le camion traverserait le décor. */
    const dt = Math.min((t - dernier) / 1000, 0.1);
    dernier = t;

    if (jeu.enCours) {
      reste += dt;
      const sortie = P.avance(jeu.etat, reste, touches, jeu.ctx, 14);
      reste = sortie.reste;
      sortie.evenements.forEach(reagit);
      majCamera(dt);
      majPoussiere(dt);
      majDock();
    }
    dessine();
  }

  function reagit(e) {
    if (e.type === "choc") {
      secousse = Math.min(1, secousse + 0.7);
      dis("Aïe — " + e.obstacle.nom + ". Un carton part.");
    } else if (e.type === "casse") {
      secousse = Math.min(1, secousse + 0.5);
      dis("Atterrissage de travers, un carton de moins.");
    } else if (e.type === "atterrit" && e.choc > 500) {
      secousse = Math.min(1, secousse + e.choc / 2600);
    } else if (e.type === "ramasse") {
      dis(e.bonus.carburant ? "Jerrican ramassé." : "Colis récupéré, 250 points.");
    } else if (e.type === "sec") {
      dis("Panne sèche. Le camion roule sur son élan.");
    } else if (e.type === "fin") {
      termine(e.cause);
    }
  }

  function majCamera(dt) {
    /* La caméra suit, mais mollement : c'est ce qui donne l'impression que le
       camion accélère au lieu de glisser au centre de l'écran. */
    const cibleX = jeu.etat.x - largeur * CADRAGE_X;
    const cibleY = jeu.etat.yc - hauteur * CADRAGE_Y;
    const k = Math.min(1, dt * 7);
    cam.x += (cibleX - cam.x) * k;
    cam.y += (cibleY - cam.y) * Math.min(1, dt * 4);
    secousse = Math.max(0, secousse - dt * 2.2);
  }

  function majPoussiere(dt) {
    const e = jeu.etat;
    if (!jeu.sobre && !e.enVol && Math.abs(e.v) > 150 && Math.random() < 0.5) {
      poussieres.push({
        x: e.x - 34,
        y: e.yc,
        vx: -e.v * 0.12 - 20,
        vy: -20 - Math.random() * 40,
        vie: 0.5 + Math.random() * 0.3,
        t: 0,
      });
    }
    for (const p of poussieres) {
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 40 * dt;
    }
    poussieres = poussieres.filter((p) => p.t < p.vie);
  }

  /* =========================================================
     Le dessin
     ========================================================= */

  function dessine() {
    const parcours = jeu.ctx ? jeu.ctx.parcours : DD_PARCOURS[0];

    /* Le ciel est peint AVANT la secousse : décalé, il laisserait une bande
       vide sur un bord de la scène à chaque choc. C'est aussi lui qui fait
       office d'effacement — le canvas n'est jamais vidé autrement. */
    ciel(parcours);

    pinceau.save();
    if (secousse > 0.02 && !jeu.sobre) {
      pinceau.translate(
        (Math.random() - 0.5) * secousse * 10,
        (Math.random() - 0.5) * secousse * 10
      );
    }

    collines(parcours);
    decor(parcours);
    route(parcours);
    obstacles();
    bonus();
    if (jeu.etat) {
      poussiere();
      camion(jeu.etat);
    }
    arrivee(parcours);

    pinceau.restore();
  }

  function ecranX(x) {
    return x - cam.x;
  }
  function ecranY(y) {
    return y - cam.y;
  }

  function ciel(parcours) {
    /* Le dégradé est peint d'abord, TOUJOURS : si l'image du parcours a de la
       transparence ou ne remplit pas toute la toile, il reste dessous au lieu
       de laisser du noir. */
    const g = pinceau.createLinearGradient(0, 0, 0, hauteur);
    g.addColorStop(0, parcours.ciel[0]);
    g.addColorStop(0.6, parcours.ciel[1]);
    g.addColorStop(1, parcours.ciel[2]);
    pinceau.fillStyle = g;
    pinceau.fillRect(0, 0, largeur, hauteur);

    /* Le fond dessiné du parcours, s'il existe. Il se répète en largeur : la
       route défile, un fond qui s'arrêterait au bord se verrait. */
    const image =
      typeof umaImageCanvas === "function"
        ? umaImageCanvas("decors-derry", parcours.id)
        : null;
    if (!image || !image.naturalWidth) return;

    const h = hauteur;
    const l = image.naturalWidth * (h / image.naturalHeight);
    /* Défilement lent, au même facteur que les collines juste en dessous :
       c'est le plan le plus lointain, il bouge à peine. `cam.x` est la position
       de la caméra, la même que celle qu'emploie `ecranX`. */
    let x = -((cam.x * 0.12) % l);
    for (; x < largeur; x += l) pinceau.drawImage(image, x, 0, l, h);
  }

  /* Une silhouette de collines très lente : c'est elle qui donne la
     profondeur, bien plus que les arbres du premier plan. */
  function collines(parcours) {
    const base = ecranY(320) + 40;
    pinceau.fillStyle = parcours.collines;
    pinceau.beginPath();
    pinceau.moveTo(0, hauteur);
    for (let sx = 0; sx <= largeur; sx += 12) {
      const monde = (cam.x * 0.12 + sx) / 320;
      const y = base - 70 - Math.sin(monde) * 32 - Math.sin(monde * 2.3) * 18;
      pinceau.lineTo(sx, y);
    }
    pinceau.lineTo(largeur, hauteur);
    pinceau.closePath();
    pinceau.fill();
  }

  function decor(parcours) {
    const facteur = 0.45;
    for (const d of jeu.decor) {
      const sx = d.x - cam.x * facteur;
      if (sx < -220 || sx > largeur + 220) continue;
      const sol = ecranY(300) + 26;
      if (d.type === "immeuble") immeuble(sx, sol, d.l, d.h, parcours);
      else if (d.type === "arbre") arbre(sx, sol, d.h);
      else if (d.type === "sapin") sapin(sx, sol, d.h);
      else if (d.type === "pylone") pylone(sx, sol, d.h);
    }
  }

  function immeuble(x, sol, l, h, parcours) {
    pinceau.fillStyle = parcours.id === "derry" ? "#3b3547" : "#b3705e";
    pinceau.strokeStyle = TRAIT;
    pinceau.lineWidth = 3;
    pinceau.beginPath();
    pinceau.rect(x, sol - h, l, h);
    pinceau.fill();
    pinceau.stroke();
    pinceau.fillStyle = parcours.id === "foret" ? "#5b6a52" : "#ffe9a8";
    for (let fy = sol - h + 16; fy < sol - 18; fy += 30) {
      for (let fx = x + 12; fx < x + l - 14; fx += 26) {
        pinceau.fillRect(fx, fy, 11, 14);
      }
    }
  }

  function arbre(x, sol, h) {
    pinceau.fillStyle = "#7a4a1e";
    pinceau.fillRect(x - 6, sol - h * 0.45, 12, h * 0.45);
    pinceau.fillStyle = "#3f8a2c";
    pinceau.strokeStyle = TRAIT;
    pinceau.lineWidth = 3;
    pinceau.beginPath();
    pinceau.arc(x, sol - h * 0.62, h * 0.3, 0, Math.PI * 2);
    pinceau.fill();
    pinceau.stroke();
  }

  function sapin(x, sol, h) {
    pinceau.fillStyle = "#20402a";
    pinceau.fillRect(x - 5, sol - h * 0.2, 10, h * 0.2);
    pinceau.fillStyle = "#1f4a2c";
    pinceau.strokeStyle = TRAIT;
    pinceau.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const base = sol - h * (0.18 + i * 0.24);
      const large = h * (0.3 - i * 0.07);
      pinceau.beginPath();
      pinceau.moveTo(x, base - h * 0.34);
      pinceau.lineTo(x + large, base);
      pinceau.lineTo(x - large, base);
      pinceau.closePath();
      pinceau.fill();
      pinceau.stroke();
    }
  }

  function pylone(x, sol, h) {
    pinceau.strokeStyle = "#6b7280";
    pinceau.lineWidth = 4;
    pinceau.beginPath();
    pinceau.moveTo(x - 16, sol);
    pinceau.lineTo(x, sol - h);
    pinceau.lineTo(x + 16, sol);
    pinceau.moveTo(x - 10, sol - h * 0.4);
    pinceau.lineTo(x + 10, sol - h * 0.4);
    pinceau.moveTo(x - 20, sol - h * 0.86);
    pinceau.lineTo(x + 20, sol - h * 0.86);
    pinceau.stroke();
  }

  /* --- La route ------------------------------------------------------------
     Un seul chemin, tracé de la gauche à la droite de l'écran : rempli pour
     la terre, puis retracé en bande sombre pour le bitume, puis souligné.
     Les pointillés sont posés sur ce même chemin, donc ils épousent le
     relief sans le moindre calcul supplémentaire. */
  function cheminRoute(parcours, pas) {
    const relief = parcours.relief;
    pinceau.beginPath();
    const debut = cam.x - 40;
    pinceau.moveTo(ecranX(debut), ecranY(P.altitude(relief, debut)));
    for (let x = debut; x <= cam.x + largeur + 40; x += pas) {
      pinceau.lineTo(ecranX(x), ecranY(P.altitude(relief, x)));
    }
  }

  function route(parcours) {
    /* Le corps de la route : le chemin, refermé tout en bas de l'écran. */
    cheminRoute(parcours, 8);
    pinceau.lineTo(largeur + 60, hauteur + 60);
    pinceau.lineTo(-60, hauteur + 60);
    pinceau.closePath();
    pinceau.fillStyle = parcours.terre;
    pinceau.fill();

    pinceau.lineCap = "round";
    pinceau.lineJoin = "round";

    cheminRoute(parcours, 8);
    pinceau.strokeStyle = parcours.bitume;
    pinceau.lineWidth = 26;
    pinceau.stroke();

    cheminRoute(parcours, 8);
    pinceau.strokeStyle = parcours.herbe;
    pinceau.lineWidth = 8;
    pinceau.stroke();

    cheminRoute(parcours, 8);
    pinceau.strokeStyle = TRAIT;
    pinceau.lineWidth = 4;
    pinceau.stroke();

    /* La bande jaune, décalée sous la surface. */
    pinceau.save();
    pinceau.translate(0, 15);
    cheminRoute(parcours, 8);
    pinceau.setLineDash([28, 26]);
    pinceau.lineDashOffset = 0;
    pinceau.strokeStyle = "#ffd84d";
    pinceau.lineWidth = 4;
    pinceau.stroke();
    pinceau.setLineDash([]);
    pinceau.restore();
  }

  function arrivee(parcours) {
    const x = ecranX(parcours.arrivee);
    if (x < -120 || x > largeur + 120) return;
    const sol = ecranY(P.altitude(parcours.relief, parcours.arrivee));
    pinceau.strokeStyle = TRAIT;
    pinceau.lineWidth = 5;
    pinceau.fillStyle = "#e9e9e9";
    pinceau.beginPath();
    pinceau.rect(x - 4, sol - 150, 8, 150);
    pinceau.fill();
    pinceau.stroke();
    /* Le damier d'arrivée, deux rangées de cases. */
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 2; j++) {
        pinceau.fillStyle = (i + j) % 2 ? "#ffffff" : TRAIT;
        pinceau.fillRect(x + 4 + i * 12, sol - 150 + j * 14, 12, 14);
      }
    }
    pinceau.strokeRect(x + 4, sol - 150, 72, 28);
  }

  /* --- Ce qu'on trouve sur la route --------------------------------------- */

  function obstacles() {
    if (!jeu.ctx || !jeu.ctx.obstacles) return;
    const relief = jeu.ctx.parcours.relief;
    jeu.ctx.obstacles.forEach((o, i) => {
      const sx = ecranX(o.x);
      if (sx < -140 || sx > largeur + 140) return;
      const sol = ecranY(P.altitude(relief, o.x));
      const touche = jeu.etat && jeu.etat.touches[i];
      pinceau.save();
      pinceau.translate(sx, sol);
      pinceau.rotate(Math.atan(P.pente(relief, o.x)));
      pinceau.strokeStyle = TRAIT;
      pinceau.lineWidth = 3.5;
      pinceau.lineJoin = "round";
      /* L'image de l'obstacle si elle est chargée, sinon le tracé d'origine.
         Un seul aiguillage ici plutôt qu'un dans chacune des trois fonctions
         de dessin : elles restent le repli, intactes.
         Les noms de famille suivent la liste (`nid-de-poule`, `plot`,
         `barriere`), pas les types courts du moteur. */
      const NOM_ASSET = { nid: "nid-de-poule", plot: "plot", barriere: "barriere" };
      const image =
        typeof umaImageCanvas === "function"
          ? umaImageCanvas("obstacles-derry", NOM_ASSET[o.type] || o.type)
          : null;

      if (image) {
        /* Posé AU SOL et centré : l'origine du pinceau est déjà au point de
           contact, donc l'image monte de toute sa hauteur au-dessus. */
        const l = o.largeur;
        const h = l * (image.naturalHeight / image.naturalWidth || 1);
        pinceau.drawImage(image, -l / 2, -h, l, h);
      } else if (o.type === "nid") dessineNid(o);
      else if (o.type === "plot") dessinePlot(o, touche);
      else dessineBarriere(o, touche);
      pinceau.restore();
    });
  }

  function dessineNid(o) {
    const l = o.largeur / 2;
    pinceau.fillStyle = "#1b1420";
    pinceau.beginPath();
    pinceau.moveTo(-l, -2);
    pinceau.lineTo(-l + 8, 16);
    pinceau.lineTo(0, 21);
    pinceau.lineTo(l - 8, 15);
    pinceau.lineTo(l, -2);
    pinceau.closePath();
    pinceau.fill();
    pinceau.stroke();
    /* Deux éclats de bitume au bord, pour que le trou ait l'air creusé. */
    pinceau.fillStyle = "#6d6a74";
    pinceau.fillRect(-l - 6, -6, 10, 5);
    pinceau.fillRect(l - 4, -6, 10, 5);
  }

  function dessinePlot(o, touche) {
    if (touche) return;
    const h = o.franchir + 4;
    pinceau.fillStyle = "#ff8a3d";
    pinceau.beginPath();
    pinceau.moveTo(0, -h);
    pinceau.lineTo(13, 0);
    pinceau.lineTo(-13, 0);
    pinceau.closePath();
    pinceau.fill();
    pinceau.stroke();
    pinceau.fillStyle = "#ffffff";
    pinceau.fillRect(-8, -h * 0.6, 16, 6);
    pinceau.strokeRect(-8, -h * 0.6, 16, 6);
  }

  function dessineBarriere(o, touche) {
    if (touche) return;
    const h = o.franchir + 6;
    pinceau.strokeStyle = TRAIT;
    pinceau.fillStyle = "#d9d9d9";
    pinceau.beginPath();
    pinceau.rect(-4, -h, 8, h);
    pinceau.fill();
    pinceau.stroke();
    pinceau.fillStyle = "#f03e3e";
    pinceau.beginPath();
    pinceau.rect(-22, -h, 44, 14);
    pinceau.fill();
    pinceau.stroke();
    pinceau.fillStyle = "#ffffff";
    for (let i = 0; i < 2; i++) pinceau.fillRect(-14 + i * 18, -h, 8, 14);
    pinceau.strokeRect(-22, -h, 44, 14);
  }

  function bonus() {
    if (!jeu.ctx || !jeu.ctx.bonus) return;
    const relief = jeu.ctx.parcours.relief;
    jeu.ctx.bonus.forEach((b, i) => {
      if (jeu.etat && jeu.etat.pris[i]) return;
      const sx = ecranX(b.x);
      if (sx < -80 || sx > largeur + 80) return;
      const sol = ecranY(P.altitude(relief, b.x)) - b.haut;
      /* Un léger flottement : sans lui, un bonus en l'air se lit comme un
         obstacle posé sur rien. */
      const flotte = jeu.sobre ? 0 : Math.sin(performance.now() / 400 + b.x) * 4;
      pinceau.save();
      pinceau.translate(sx, sol + flotte);
      pinceau.strokeStyle = TRAIT;
      pinceau.lineWidth = 3.5;
      pinceau.lineJoin = "round";
      if (b.carburant) dessineBidon();
      else dessineColis();
      pinceau.restore();
    });
  }

  function dessineBidon() {
    pinceau.fillStyle = "#e03131";
    pinceau.beginPath();
    pinceau.rect(-15, -34, 30, 34);
    pinceau.fill();
    pinceau.stroke();
    pinceau.fillStyle = "#f8f0d0";
    pinceau.beginPath();
    pinceau.rect(-7, -26, 14, 14);
    pinceau.fill();
    pinceau.stroke();
    pinceau.beginPath();
    pinceau.moveTo(-10, -34);
    pinceau.lineTo(-10, -41);
    pinceau.lineTo(6, -41);
    pinceau.stroke();
  }

  function dessineColis() {
    pinceau.fillStyle = "#d9a066";
    pinceau.beginPath();
    pinceau.rect(-17, -34, 34, 34);
    pinceau.fill();
    pinceau.stroke();
    pinceau.strokeStyle = "#b07a3e";
    pinceau.lineWidth = 5;
    pinceau.beginPath();
    pinceau.moveTo(0, -34);
    pinceau.lineTo(0, 0);
    pinceau.moveTo(-17, -19);
    pinceau.lineTo(17, -19);
    pinceau.stroke();
  }

  function poussiere() {
    pinceau.fillStyle = "rgba(210, 200, 185, 0.55)";
    for (const p of poussieres) {
      const r = 3 + (p.t / p.vie) * 9;
      pinceau.globalAlpha = 0.55 * (1 - p.t / p.vie);
      pinceau.beginPath();
      pinceau.arc(ecranX(p.x), ecranY(p.y), r, 0, Math.PI * 2);
      pinceau.fill();
    }
    pinceau.globalAlpha = 1;
  }

  /* --- Le camion vert de Drew ---------------------------------------------
     Repère local : l'origine est le point de contact des roues, x vers
     l'avant, y vers le haut négatif. La caisse et la cabine sont décalées par
     la suspension ; les roues, non — c'est ce décalage qui se lit comme un
     amortisseur qui travaille. */
  function camion(e) {
    const sx = ecranX(e.x);
    const sy = ecranY(e.yc);
    const enfonce = Math.max(-8, Math.min(14, e.suspension * 16));

    pinceau.save();
    pinceau.translate(sx, sy);
    pinceau.rotate(e.tangage);
    pinceau.strokeStyle = TRAIT;
    pinceau.lineWidth = 4;
    pinceau.lineJoin = "round";

    roue(-32, -16, 16);
    roue(34, -16, 16);

    pinceau.save();
    pinceau.translate(0, enfonce);

    /* Châssis */
    pinceau.fillStyle = "#2f3550";
    pinceau.beginPath();
    pinceau.rect(-56, -30, 108, 10);
    pinceau.fill();
    pinceau.stroke();

    /* La remorque, avec les cartons qui restent posés dessus */
    pinceau.fillStyle = VERT_CAMION;
    pinceau.beginPath();
    pinceau.rect(-58, -74, 66, 46);
    pinceau.fill();
    pinceau.stroke();
    cartons(e);

    /* La cabine et son pare-brise */
    pinceau.fillStyle = VERT_SOMBRE;
    pinceau.beginPath();
    pinceau.moveTo(8, -28);
    pinceau.lineTo(8, -64);
    pinceau.lineTo(38, -64);
    pinceau.lineTo(52, -44);
    pinceau.lineTo(52, -28);
    pinceau.closePath();
    pinceau.fill();
    pinceau.stroke();

    pinceau.fillStyle = "#dff3ff";
    pinceau.beginPath();
    pinceau.moveTo(16, -58);
    pinceau.lineTo(36, -58);
    pinceau.lineTo(46, -44);
    pinceau.lineTo(16, -44);
    pinceau.closePath();
    pinceau.fill();
    pinceau.lineWidth = 3;
    pinceau.stroke();

    conducteur();

    /* Phare et pot d'échappement */
    pinceau.fillStyle = "#ffd84d";
    pinceau.beginPath();
    pinceau.arc(49, -34, 5, 0, Math.PI * 2);
    pinceau.fill();
    pinceau.lineWidth = 3;
    pinceau.stroke();

    pinceau.fillStyle = "#6b7280";
    pinceau.beginPath();
    pinceau.rect(-62, -50, 8, 22);
    pinceau.fill();
    pinceau.stroke();

    pinceau.restore();
    pinceau.restore();
  }

  function roue(cx, cy, r) {
    pinceau.fillStyle = "#22222a";
    pinceau.beginPath();
    pinceau.arc(cx, cy, r, 0, Math.PI * 2);
    pinceau.fill();
    pinceau.stroke();
    pinceau.fillStyle = "#c9a3ff";
    pinceau.beginPath();
    pinceau.arc(cx, cy, r * 0.42, 0, Math.PI * 2);
    pinceau.fill();
    pinceau.lineWidth = 3;
    pinceau.stroke();
    pinceau.lineWidth = 4;
  }

  /* Les cartons restants, empilés sur la remorque : la jauge de cargaison la
     plus lisible du jeu est la remorque elle-même. */
  function cartons(e) {
    const combien = Math.min(6, Math.max(0, e.cargaison));
    pinceau.lineWidth = 3;
    for (let i = 0; i < combien; i++) {
      const cx = -54 + (i % 3) * 20;
      const cy = -84 - Math.floor(i / 3) * 16;
      pinceau.fillStyle = i % 2 ? "#d9a066" : "#c98a3a";
      pinceau.beginPath();
      pinceau.rect(cx, cy, 18, 14);
      pinceau.fill();
      pinceau.stroke();
    }
    pinceau.lineWidth = 4;
  }

  /* Drew au volant : une tête et une épaule, au trait de la maison. Le reste
     de sa personne est à l'écran-titre, sorti de shared/perso.js. */
  function conducteur() {
    pinceau.lineWidth = 3;
    pinceau.fillStyle = "#3a2b4e";
    pinceau.beginPath();
    pinceau.rect(20, -50, 16, 12);
    pinceau.fill();
    pinceau.stroke();
    pinceau.fillStyle = "#f8dcc0";
    pinceau.beginPath();
    pinceau.arc(28, -55, 7, 0, Math.PI * 2);
    pinceau.fill();
    pinceau.stroke();
    pinceau.fillStyle = "#8a5a2b";
    pinceau.beginPath();
    pinceau.arc(28, -57, 7, Math.PI, Math.PI * 2);
    pinceau.fill();
    pinceau.stroke();
    pinceau.lineWidth = 4;
  }

  /* =========================================================
     Le tableau de bord
     ========================================================= */

  function majDock() {
    const e = jeu.etat;
    const parcours = jeu.ctx.parcours;
    $("#dd-parcours").textContent =
      parcours.nom + " (" + (jeu.index + 1) + "/" + DD_PARCOURS.length + ")";
    $("#dd-vitesse").textContent =
      Math.round((Math.max(0, e.v) / R.pixelsParMetre) * 3.6) + " km/h";
    $("#dd-distance").textContent =
      Math.round(e.distanceMax / R.pixelsParMetre) + " / " +
      Math.round(parcours.arrivee / R.pixelsParMetre) + " m";
    $("#dd-cargaison").textContent = e.cargaison + " / " + jeu.charge.cartons;
    $("#dd-chrono").textContent = e.temps.toFixed(1) + " s";
    $("#dd-record").textContent = record(parcours.id) || "—";

    const jauge = $("#dd-jauge-plein");
    jauge.style.width = e.carburant + "%";
    jauge.classList.toggle("dd-reserve", e.carburant < 25);
    $("#dd-carburant").textContent = Math.round(e.carburant) + " %";

    const barre = $("#dd-avancement-plein");
    barre.style.width =
      Math.min(100, (e.distanceMax / parcours.arrivee) * 100) + "%";
  }

  let derniereAnnonce = "";
  function dis(texte) {
    if (texte === derniereAnnonce) return;
    derniereAnnonce = texte;
    annonce.textContent = texte;
  }

  /* =========================================================
     Les écrans
     ========================================================= */

  function cacheEcran() {
    ecran.className = "dd-ecran";
    ecran.innerHTML = "";
  }

  function montreEcran(html, mince) {
    jeu.enCours = false;
    ecran.className = "dd-ecran dd-visible" + (mince ? " dd-mince" : "");
    ecran.innerHTML = '<div class="dd-boite">' + html + "</div>";
    const premier = ecran.querySelector("button");
    if (premier) premier.focus();
  }

  function ecranChoix() {
    if (boucle) cancelAnimationFrame(boucle);
    boucle = null;
    jeu.enCours = false;
    jeu.scoreTotal = 0;

    montreEcran(
      '<h2 class="dd-titre">Qu\'est-ce qu\'on charge ?</h2>' +
        '<div class="dd-drew">' + persoSVG(DREW) + "</div>" +
        '<p class="dd-texte">Drew a trois tournées possibles et un seul camion. ' +
        "Plus il charge, plus la livraison rapporte — et moins ça grimpe. " +
        "Chaque choc jette un carton par la portière.</p>" +
        '<div class="dd-choix" id="dd-choix"></div>' +
        '<p class="dd-aide-ecran"><b>→</b> accélère, <b>←</b> freine puis recule, ' +
        "<b>Espace</b> donne un coup de suspension. En l'air, <b>←</b> et <b>→</b> " +
        "redressent la caisse : on atterrit à plat ou on perd la marchandise.</p>"
    );

    const grille = $("#dd-choix");
    DD_CHARGES.forEach((ch) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "dd-carte";
      b.innerHTML =
        '<span class="dd-carte-nom">' + ch.nom + "</span>" +
        '<span class="dd-carte-cartons">' + ch.cartons + " cartons</span>" +
        '<span class="dd-carte-resume">' + ch.resume + "</span>" +
        '<span class="dd-carte-detail">' + ch.detail + "</span>";
      b.addEventListener("click", () => {
        jeu.charge = ch;
        chargeParcours(0);
      });
      grille.appendChild(b);
    });
    dessine();
  }

  function termine(cause) {
    const e = jeu.etat;
    const parcours = jeu.ctx.parcours;
    const gagne = cause === "arrive";
    const points = P.score(e, jeu.ctx);
    jeu.scoreTotal += points;
    const nouveau = gagne && noteRecord(parcours.id, points);
    const suivant = gagne ? DD_PARCOURS[jeu.index + 1] : null;

    let titre;
    let texte;
    if (gagne) {
      titre = "Livré !";
      texte =
        "Drew pose <b>" + e.cargaison + "</b> carton" + (e.cargaison > 1 ? "s" : "") +
        " sur " + jeu.charge.cartons + " en " + e.temps.toFixed(1) +
        " s, avec " + Math.round(e.carburant) + " % de carburant." +
        (e.colis ? " Plus <b>" + e.colis + "</b> colis ramassé" + (e.colis > 1 ? "s" : "") + " en route." : "");
    } else if (cause === "panne") {
      titre = "Panne sèche";
      texte =
        "Le camion s'arrête à <b>" + Math.round(e.distanceMax / R.pixelsParMetre) +
        " m</b> sur " + Math.round(parcours.arrivee / R.pixelsParMetre) +
        ". Il fallait ramasser les jerricans.";
    } else {
      titre = "Plus rien à livrer";
      texte =
        "Le dernier carton a sauté à <b>" +
        Math.round(e.distanceMax / R.pixelsParMetre) + " m</b>. " +
        "Une tournée sans marchandise, ça s'appelle une promenade.";
    }

    let html =
      '<h2 class="dd-titre">' + titre + "</h2>" +
      '<p class="dd-texte">' + texte + "</p>" +
      '<p class="dd-score">Score du parcours : <b>' + points + "</b>" +
      (nouveau ? ' <span class="dd-record-neuf">nouveau record !</span>' : "") +
      "<br />Total de la tournée : <b>" + jeu.scoreTotal + "</b></p>";

    if (suivant) {
      html +=
        '<p class="dd-texte">Prochaine étape : <b>' + suivant.nom + "</b> — " +
        suivant.difficulte.toLowerCase() + ".<br />" +
        '<span class="dd-suite">' + suivant.ambiance + "</span></p>" +
        '<button type="button" class="fun-btn primary" id="dd-suite">Parcours suivant</button> ' +
        '<button type="button" class="fun-btn" id="dd-changer">Changer de chargement</button>';
    } else {
      html +=
        '<button type="button" class="fun-btn primary" id="dd-rejouer">' +
        (gagne ? "Refaire la tournée" : "Recommencer ce parcours") + "</button> " +
        '<button type="button" class="fun-btn" id="dd-changer">Changer de chargement</button>';
    }

    montreEcran(html, !gagne);
    dis(titre + " — " + texte.replace(/<[^>]+>/g, ""));

    const suite = $("#dd-suite");
    if (suite) suite.addEventListener("click", () => chargeParcours(jeu.index + 1));
    const rejouer = $("#dd-rejouer");
    if (rejouer) {
      rejouer.addEventListener("click", () => {
        if (gagne) {
          jeu.scoreTotal = 0;
          chargeParcours(0);
        } else {
          jeu.scoreTotal = 0;
          chargeParcours(jeu.index);
        }
      });
    }
    $("#dd-changer").addEventListener("click", ecranChoix);
  }

  /* =========================================================
     Commandes
     ========================================================= */

  const GAZ = ["ArrowRight", "KeyD"];
  const FREIN = ["ArrowLeft", "KeyA", "KeyQ"];
  const SAUT = ["Space", "ArrowUp", "KeyW", "KeyZ"];

  /* Une page de portail a une barre de recherche : si le jeu avale l'espace
     et les flèches quoi qu'il arrive, on ne peut plus y taper un mot. */
  function enTrainDEcrire(e) {
    const c = e.target;
    if (!c || !c.tagName) return false;
    const t = c.tagName.toLowerCase();
    return t === "input" || t === "textarea" || t === "select" || c.isContentEditable;
  }

  document.addEventListener("keydown", (e) => {
    if (enTrainDEcrire(e)) return;
    if (e.repeat && !SAUT.includes(e.code)) return;
    if (GAZ.includes(e.code)) {
      touches.gaz = true;
      e.preventDefault();
    }
    if (FREIN.includes(e.code)) {
      touches.frein = true;
      e.preventDefault();
    }
    if (SAUT.includes(e.code)) {
      if (jeu.etat && !e.repeat) jeu.etat.sautDemande = R.memoireSaut;
      e.preventDefault();
    }
  });

  document.addEventListener("keyup", (e) => {
    if (GAZ.includes(e.code)) touches.gaz = false;
    if (FREIN.includes(e.code)) touches.frein = false;
  });

  /* Au doigt : trois pavés sous la scène, comme sur les autres jeux du
     portail. Ils ne s'affichent que là où il n'y a pas de clavier. */
  function brancheTactile() {
    [
      ["#dd-tact-frein", "frein"],
      ["#dd-tact-gaz", "gaz"],
      ["#dd-tact-saut", "saut"],
    ].forEach(([sel, nom]) => {
      const el = $(sel);
      if (!el) return;
      const on = (ev) => {
        ev.preventDefault();
        if (nom === "saut") {
          if (jeu.etat) jeu.etat.sautDemande = R.memoireSaut;
        } else {
          touches[nom] = true;
        }
        el.classList.add("dd-appuye");
      };
      const off = () => {
        if (nom !== "saut") touches[nom] = false;
        el.classList.remove("dd-appuye");
      };
      el.addEventListener("pointerdown", on);
      el.addEventListener("pointerup", off);
      el.addEventListener("pointerleave", off);
      el.addEventListener("pointercancel", off);
    });
  }

  /* Onglet quitté : on repart d'un chrono neuf, sinon le premier pas de temps
     au retour vaudrait plusieurs secondes. */
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) dernier = 0;
  });

  window.addEventListener("resize", () => {
    redimensionne();
    dessine();
  });

  /* =========================================================
     Démarrage
     ========================================================= */

  document.body.style.setProperty("--accent", ACCENT);
  redimensionne();
  brancheTactile();
  /* Un décor derrière l'écran-titre : un canvas vide se lit comme une page
     cassée. On prend celui du premier parcours. */
  jeu.decor = semeDecor(DD_PARCOURS[0]);
  jeu.ctx = { parcours: DD_PARCOURS[0] };
  cam.x = 0;
  cam.y = 300 - hauteur * CADRAGE_Y;
  ecranChoix();
})();
