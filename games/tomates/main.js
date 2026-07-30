/* =========================================================
   Balance ta tomate — le moteur
   ---------------------------------------------------------
   Une baraque de foire : Mads Prout se pavane sur une estrade, on a un
   cageot, on règle un ANGLE et une PUISSANCE, et la tomate suit sa parabole.

   Pourquoi un tir à trajectoire et pas un clic sur la cible. Un clic mesure
   le temps de réaction : on voit, on tape. Ici on ne peut pas « voir » la
   solution, il faut la construire — anticiper où Mads sera au bout du vol,
   corriger le vent, passer par-dessus le tonneau. C'est un jeu d'adresse,
   ce qui est exactement ce que promet une baraque à tomates ; et ça se
   rejoue, parce qu'on progresse au lieu de cliquer plus vite.

   Ce fichier ne contient AUCUN chiffre d'équilibrage et AUCUN nom propre :
     - les réglages et les répliques sont dans `reglages.js` ;
     - la physique et les déplacements de Mads dans `cinematique.js`, que
       partage le banc d'essai `test-tomates.js`.
   Ici, il n'y a que du DOM, des écrans et le fil de la partie.

   Le tir n'est simulé qu'UNE FOIS, au moment du lancer : le moteur garde la
   liste de points renvoyée par `simuleTir` et se contente de l'animer. Ce
   qu'on voit à l'écran EST donc le calcul vérifié par le banc d'essai.
   ========================================================= */

(function () {
  "use strict";

  const TRAIT = "#2b1a2e";
  const $ = (id) => document.getElementById(id);

  const scene = $("tom-scene");
  const svgFond = $("tom-fond");
  const svgAvant = $("tom-avant");
  const elMads = $("tom-mads");
  const elLanceur = $("tom-lanceur");
  const elActeurs = $("tom-acteurs");
  const bulle = $("tom-bulle");
  const rideau = $("tom-rideau");
  const journal = $("tom-journal");

  const CLE_RECORD = "uma_tomates_record";

  /* --- L'état de la partie ------------------------------------------- */
  const partie = {
    index: 0,
    manche: null,
    score: 0,
    serie: 0,
    munitions: 0,
    touches: 0,
    t: 0, // temps écoulé DANS la manche : c'est lui qui pilote Mads
    enJeu: false,
    angle: TIR.angleDepart,
    puissance: TIR.puissanceDepart,
    vent: 0,
    charge: null, // instant (ms) où le maintien a commencé
    vol: null, // { t0, resultat }
    repos: 0, // petite pause après un impact, pour qu'on le voie
    sonne: 0, // temps restant où Mads fait la tête de celui qui a pris une tomate
    record: 0,
  };

  let poseCle = "";
  let bulleFin = 0;
  let etatPrecedent = "";
  let boucle = null;
  let dernier = 0;

  /* =========================================================
     Le décor, dessiné une fois par manche
     ========================================================= */

  /* Le repère de la scène fait 160 × 90 unités et le cadre 16/9 : une unité
     vaut donc la même chose en largeur et en hauteur. Tout ce qui suit est
     en unités de monde, jamais en pixels. */
  function pourcent(el, x, y, largeur, hauteur) {
    el.style.left = ((x - largeur / 2) / MONDE.largeur) * 100 + "%";
    el.style.top = ((y - hauteur) / MONDE.hauteur) * 100 + "%";
    el.style.width = (largeur / MONDE.largeur) * 100 + "%";
    el.style.height = (hauteur / MONDE.hauteur) * 100 + "%";
  }

  /* Une tente de fête foraine : toit rayé, mât, fanion. */
  function tente(x, largeur, hauteur, couleur) {
    const y = MONDE.sol;
    const haut = y - hauteur;
    let bandes = "";
    const pas = largeur / 6;
    for (let i = 0; i < 6; i += 2) {
      bandes +=
        '<path d="M' + (x + largeur / 2) + " " + haut + "L" + (x + i * pas) + " " + y +
        "H" + (x + (i + 1) * pas) + 'Z" fill="' + couleur + '" opacity=".85"/>';
    }
    return (
      '<path d="M' + (x + largeur / 2) + " " + haut + "L" + x + " " + y + "H" + (x + largeur) +
        'Z" fill="#f6e3cf" stroke="' + TRAIT + '" stroke-width="0.9" stroke-linejoin="round"/>' +
      bandes +
      '<path d="M' + (x + largeur / 2) + " " + haut + "v-5" + '" stroke="' + TRAIT + '" stroke-width="0.7"/>' +
      '<path d="M' + (x + largeur / 2) + " " + (haut - 5) + "l5 1.6-5 1.6z" + '" fill="' + couleur + '"/>'
    );
  }

  /* La guirlande de fanions : une corde qui pend en deux festons. */
  function guirlande() {
    let sortie =
      '<path d="M0 6q40 12 80 4t80 6" fill="none" stroke="' + TRAIT + '" stroke-width="0.6"/>';
    const couleurs = ["#ffd84d", "#4de0ff", "#ff3d9a", "#c6ff4d", "#ff8a3d"];
    for (let i = 0; i <= 20; i++) {
      const u = i / 20;
      const x = u * 160;
      /* Approximation du feston, à la louche : on veut des fanions qui
         suivent la corde, pas une courbe exacte. */
      const y = 6 + Math.sin(u * Math.PI * 2) * -4 + Math.sin(u * Math.PI) * 5;
      sortie +=
        '<path class="tom-fanion" d="M' + (x - 2) + " " + y + "h4l-2 5z" + '" fill="' +
        couleurs[i % couleurs.length] + '" stroke="' + TRAIT + '" stroke-width="0.4"/>';
    }
    return sortie;
  }

  function construitDecor() {
    const p = MONDE.podium;
    svgFond.innerHTML =
      "<defs>" +
        '<linearGradient id="tomBois" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#b5793d"/><stop offset="1" stop-color="#7a4a1e"/>' +
        "</linearGradient>" +
        '<linearGradient id="tomVelours" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#8f1024"/><stop offset="1" stop-color="#4c0714"/>' +
        "</linearGradient>" +
      "</defs>" +

      /* Deux tentes au loin, derrière le lanceur : on est bien à la fête. */
      tente(2, 34, 26, "#c92a2a") +
      tente(44, 28, 20, "#2f6fb5") +

      /* Le rideau de scène, derrière Mads. */
      '<rect x="' + (p.x - 2) + '" y="14" width="' + (p.largeur + 2) + '" height="' + (p.dessus - 14) +
        '" fill="url(#tomVelours)" stroke="' + TRAIT + '" stroke-width="1"/>' +
      plis(p.x - 2, 14, p.largeur + 2, p.dessus - 14) +

      /* La banderole du stand : c'est SON nom sur l'affiche, c'est bien le
         problème de tout le monde. */
      '<rect x="' + (p.x + 6) + '" y="16" width="' + (p.largeur - 12) + '" height="9" rx="1.5"' +
        ' fill="#ffd84d" stroke="' + TRAIT + '" stroke-width="1"/>' +
      '<text x="' + (p.x + p.largeur / 2) + '" y="22.9" text-anchor="middle"' +
        ' font-family="Palatino Linotype, Palatino, serif" font-size="6" font-weight="bold"' +
        ' letter-spacing="0.3" fill="#5e0a0a">' + MADS.nom.toUpperCase() + "</text>" +

      /* L'herbe piétinée. */
      '<rect x="0" y="' + MONDE.sol + '" width="160" height="' + (MONDE.hauteur - MONDE.sol) +
        '" fill="#4f7a2a"/>' +
      '<path d="M0 ' + MONDE.sol + 'h160" stroke="' + TRAIT + '" stroke-width="0.9"/>' +
      touffes() +

      /* L'estrade. */
      '<rect x="' + p.x + '" y="' + p.dessus + '" width="' + p.largeur + '" height="' +
        (MONDE.sol - p.dessus) + '" fill="url(#tomBois)" stroke="' + TRAIT + '" stroke-width="1"/>' +
      planches(p.x, p.dessus, p.largeur, MONDE.sol - p.dessus) +

      /* Le cageot, aux pieds du lanceur. */
      cageot(MONDE.lanceur.x + 6, MONDE.sol) +

      guirlande();
  }

  function plis(x, y, l, h) {
    let s = "";
    for (let i = 1; i < 9; i++) {
      const px = x + (l * i) / 9;
      s += '<path d="M' + px + " " + y + "V" + (y + h) + '" stroke="#000" stroke-width="0.8" opacity=".18"/>';
    }
    return s;
  }

  function planches(x, y, l, h) {
    let s = '<path d="M' + x + " " + (y + 2) + "h" + l + '" stroke="' + TRAIT + '" stroke-width="0.7" opacity=".6"/>';
    for (let i = 1; i < 8; i++) {
      const px = x + (l * i) / 8;
      s += '<path d="M' + px + " " + (y + 2) + "V" + (y + h) + '" stroke="' + TRAIT + '" stroke-width="0.6" opacity=".45"/>';
    }
    return s;
  }

  function touffes() {
    let s = "";
    for (let i = 0; i < 26; i++) {
      const x = (i * 6.4) % 160;
      s += '<path d="M' + x + " " + (MONDE.sol + 1.5) + "l1.4-3 1.4 3z" + '" fill="#3f6420"/>';
    }
    return s;
  }

  function cageot(x, y) {
    let s =
      '<rect x="' + (x - 7) + '" y="' + (y - 6) + '" width="14" height="6" fill="#c08a4a"' +
      ' stroke="' + TRAIT + '" stroke-width="0.9"/>' +
      '<path d="M' + (x - 7) + " " + (y - 3.5) + "h14" + '" stroke="' + TRAIT + '" stroke-width="0.6" opacity=".6"/>';
    for (let i = 0; i < 4; i++) {
      s += '<circle cx="' + (x - 5 + i * 3.4) + '" cy="' + (y - 7.2) + '" r="1.9" fill="#c92a2a" stroke="' +
        TRAIT + '" stroke-width="0.7"/>';
    }
    return s;
  }

  /* --- La couche de devant : abris, taches, vent, aperçu, tomate ------- */

  function construitAvant(manche) {
    const abris = manche.abris
      .map((a) => dessineAbri(a))
      .join("");
    svgAvant.innerHTML =
      '<g id="tom-g-abris">' + abris + "</g>" +
      '<g id="tom-g-taches"></g>' +
      '<g id="tom-g-vent"></g>' +
      '<polyline id="tom-g-apercu" fill="none" stroke="#fff8ee" stroke-width="1.1"' +
        ' stroke-linecap="round" stroke-dasharray="0.4 3" opacity=".85"/>' +
      '<g id="tom-g-viseur"></g>' +
      '<g id="tom-g-tomate"></g>';
  }

  function dessineAbri(abri) {
    const t = ABRIS[abri.type];
    const b = boiteAbri(abri);

    /* La scène est un SVG à viewBox fixe : une image s'y pose avec `<image>`,
       aux mêmes coordonnées de monde que le rectangle qu'elle remplace. Pas de
       conversion de pixels à faire, le viewBox s'en charge. */
    if (typeof umaAsset === "function") {
      const img = umaAsset("decors-tomates", abri.type);
      if (img) {
        return (
          '<image href="' + img.src + '" x="' + b.x + '" y="' + b.y +
          '" width="' + b.l + '" height="' + b.h +
          '" preserveAspectRatio="none"/>'
        );
      }
    }

    let s =
      '<rect x="' + b.x + '" y="' + b.y + '" width="' + b.l + '" height="' + b.h +
      '" rx="1" fill="' + t.couleur + '" stroke="' + TRAIT + '" stroke-width="1"/>';
    if (t.cercles) {
      /* Les cercles de fer d'un tonneau, c'est ce qui le rend lisible d'un
         coup d'œil comme « chose derrière laquelle on se cache ». */
      s +=
        '<path d="M' + b.x + " " + (b.y + 3) + "h" + b.l + "M" + b.x + " " + (b.y + b.h - 3) + "h" + b.l +
        '" stroke="' + TRAIT + '" stroke-width="1.2" opacity=".75"/>';
    } else if (t.largeur < 6) {
      /* La pancarte : un panneau sur un piquet. */
      s +=
        '<rect x="' + (b.x - 4) + '" y="' + b.y + '" width="' + (b.l + 8) + '" height="7" rx="1"' +
        ' fill="#ffd84d" stroke="' + TRAIT + '" stroke-width="1"/>';
    } else {
      s += '<path d="M' + b.x + " " + b.y + "l" + b.l + " " + b.h + "M" + (b.x + b.l) + " " + b.y +
        "l" + -b.l + " " + b.h + '" stroke="' + TRAIT + '" stroke-width="0.8" opacity=".5"/>';
    }
    return s;
  }

  /* =========================================================
     Les acteurs
     ========================================================= */

  function poseMads(etat, expression) {
    const h = etat.accroupi ? MADS.accroupi : MADS.debout;
    pourcent(elMads, etat.x, MONDE.podium.dessus, MADS.largeur, h);
    const pose = etat.etat === "nargue" ? "bras-leves" : etat.accroupi ? "accroupi" : "debout";
    const cle = pose + "/" + (expression || "");
    if (cle === poseCle) return;
    poseCle = cle;
    const look = Object.assign({}, MADS.look, { pose: pose });
    if (expression === "sonne") {
      look.bouche = "o";
      look.regard = "ferme";
    }
    elMads.innerHTML = persoSVG(look);
  }

  function construitPublic() {
    /* Trois badauds au pied de l'estrade : une baraque de foire sans public,
       ce n'est plus une baraque, c'est un terrain vague. */
    const maillots = ["#2f6fb5", "#c6ff4d", "#ff8a3d"];
    maillots.forEach((couleur, i) => {
      const el = document.createElement("div");
      el.className = "tom-perso";
      el.innerHTML = spectateurSVG(couleur, null, i === 1 ? "echarpe" : null);
      elActeurs.appendChild(el);
      pourcent(el, 68 + i * 6, MONDE.sol + 4, 7, 9.6);
    });
  }

  /* =========================================================
     Le fil de la partie
     ========================================================= */

  function ouvre(html, apres) {
    rideau.className = "tom-rideau tom-visible";
    rideau.innerHTML = '<div class="tom-boite">' + html + "</div>";
    partie.enJeu = false;
    const b = rideau.querySelector("button");
    if (b) {
      b.addEventListener("click", apres);
      b.focus();
    }
  }

  function ferme() {
    rideau.className = "tom-rideau";
    rideau.innerHTML = "";
    partie.enJeu = true;
    dernier = 0;
    scene.focus();
  }

  function ecranTitre() {
    partie.record = litRecord();
    majComptoir(); // pour que le record s'affiche avant même la première partie
    ouvre(
      '<h2 class="tom-titre">Balance ta tomate</h2>' +
        '<p class="tom-texte">Mads Prout monte sur scène tous les soirs pour se faire' +
        " applaudir. Il y a un cageot à tes pieds. Règle l'<b>angle</b> et la" +
        " <b>puissance</b>, corrige le <b>vent</b>, et souviens-toi qu'il faut viser" +
        " là où il <b>sera</b>." +
        '<span class="tom-boniment">Cinq manches. Il bouge de plus en plus,' +
        " il se planque de plus en plus, et l'aperçu de trajectoire se raccourcit." +
        (partie.record ? " Ton record : " + partie.record + " points." : "") +
        "</span></p>" +
        '<button type="button" class="fun-btn primary">Ouvrir le rideau</button>',
      () => chargeManche(0)
    );
  }

  function chargeManche(index) {
    partie.index = index;
    const m = MANCHES[index];
    partie.manche = m;
    partie.munitions = m.munitions;
    partie.touches = 0;
    partie.serie = 0;
    partie.t = 0;
    partie.vol = null;
    partie.repos = 0;
    partie.charge = null;
    poseCle = "";
    etatPrecedent = "";
    construitAvant(m);
    tireLeVent();
    majComptoir();

    const vitesse = m.periode ? (4 * m.amplitude) / m.periode : 0;
    ouvre(
      '<h2 class="tom-titre">Manche ' + (index + 1) + " — " + m.nom + "</h2>" +
        '<p class="tom-texte"><span class="tom-boniment">« ' + m.boniment + " »</span></p>" +
        '<dl class="tom-fiche">' +
        fiche("Cible", allure(vitesse)) +
        fiche("Abris", m.abris.length || "aucun") +
        fiche("Vent", meteo(m.vent)) +
        fiche("Aperçu", Math.round(m.apercu * 100) + " %") +
        fiche("Cageot", m.munitions + " tomates") +
        fiche("Objectif", m.objectif + " touches") +
        "</dl>" +
        '<p class="tom-texte tom-boniment">Objectif atteint, il quitte la scène : chaque tomate ' +
        "qui reste dans le cageot vaut " + BAREME.munitionRestante + " points.</p>" +
        '<button type="button" class="fun-btn primary">Balance !</button>',
      ferme
    );
  }

  const fiche = (cle, valeur) => "<div><dt>" + cle + "</dt><dd>" + valeur + "</dd></div>";

  /* La fiche d'une manche s'adresse au joueur, pas à l'équilibreur : « 19
     unités par seconde » ne veut rien dire quand on a une tomate en main.
     Les chiffres exacts vivent dans `reglages.js`, et le banc d'essai les
     mesure ; ici on dit ce que ça fait. */
  const echelle = (v, paliers) => paliers.find((p) => v <= p[0])[1];

  const allure = (v) =>
    echelle(v, [[0.1, "immobile"], [9, "il flâne"], [13, "il marche"], [17, "il trotte"], [Infinity, "il court"]]);

  const meteo = (v) =>
    echelle(v, [[0.1, "nul"], [8, "léger"], [14, "gênant"], [18, "fort"], [Infinity, "sale temps"]]);

  function finManche() {
    const gagne = partie.touches >= partie.manche.objectif;
    const bonus = gagne ? partie.munitions * BAREME.munitionRestante : 0;
    partie.score += bonus;
    majComptoir();

    if (!gagne) {
      dis("mancheRatee");
      return ecranFin(false);
    }
    dis("mancheGagnee");

    const suivante = MANCHES[partie.index + 1];
    if (!suivante) return ecranFin(true);

    ouvre(
      '<h2 class="tom-titre">Manche remportée !</h2>' +
        '<p class="tom-texte">' + partie.touches + " touches sur " + partie.manche.objectif +
        " demandées." +
        (bonus ? " Il te restait des munitions : <b>+" + bonus + "</b> points." : "") +
        "<br />Score : <b>" + partie.score + "</b>." +
        '<span class="tom-boniment">Il remonte sur scène. Il a l\'air moins sûr de lui.</span></p>' +
        '<button type="button" class="fun-btn primary">Manche suivante</button>',
      () => chargeManche(partie.index + 1)
    );
  }

  function ecranFin(victoire) {
    const record = partie.score > partie.record;
    if (record) {
      partie.record = partie.score;
      ecritRecord(partie.score);
    }
    ouvre(
      '<h2 class="tom-titre">' + (victoire ? "Le rideau tombe" : "Cageot vide") + "</h2>" +
        '<p class="tom-texte">' +
        (victoire
          ? "Cinq manches, et il n'a plus un centimètre de costume propre."
          : "Il te fallait " + partie.manche.objectif + " touches, tu en as fait " +
            partie.touches + ". Il salue et il rentre.") +
        "<br />Score final : <b>" + partie.score + "</b>" +
        (record
          ? ' — <b class="tom-record">nouveau record !</b>'
          : partie.record
          ? " (record : " + partie.record + ")"
          : "") +
        '<span class="tom-boniment">« ' + tire(REPLIQUES[victoire ? "victoire" : "mancheRatee"]) +
        " »</span></p>" +
        '<button type="button" class="fun-btn primary">Rejouer</button> ' +
        '<button type="button" class="fun-btn" id="tom-btn-titre">Retour au rideau</button>',
      () => {
        partie.score = 0;
        chargeManche(0);
      }
    );
    const retour = $("tom-btn-titre");
    if (retour) {
      retour.addEventListener("click", () => {
        partie.score = 0;
        ecranTitre();
      });
    }
  }

  /* =========================================================
     Le tir
     ========================================================= */

  /* Le vent est tiré avant CHAQUE lancer et affiché : ce n'est pas un piège,
     c'est une donnée du problème. */
  function tireLeVent() {
    const v = partie.manche.vent;
    partie.vent = v === 0 ? 0 : (Math.random() * 2 - 1) * v;
    majVent();
  }

  function lance() {
    if (!partie.enJeu || partie.vol || partie.repos > 0 || partie.munitions <= 0) return;
    partie.charge = null;
    scene.classList.remove("tom-charge");
    partie.munitions -= 1;

    const r = simuleTir(partie.manche, partie.t, partie.angle, partie.puissance, partie.vent);
    partie.vol = { t0: partie.t, r: r };
    majComptoir();
  }

  function resout(r) {
    partie.vol = null;
    partie.repos = 0.45;
    tache(r.impact, r.issue === "tete" || r.issue === "corps");

    if (r.issue === "tete" || r.issue === "corps") {
      partie.serie += 1;
      partie.touches += 1;
      const multi = multiplicateur(partie.serie);
      const base = r.issue === "tete" ? BAREME.tete : BAREME.corps;
      partie.score += base * multi;
      elMads.classList.add("tom-encaisse");
      setTimeout(() => elMads.classList.remove("tom-encaisse"), 460);
      partie.sonne = 1.1;
      dis(r.issue === "tete" ? "tete" : "touche");
      note(
        (r.issue === "tete" ? "<b>EN PLEINE POIRE !</b> " : "Touché ! ") +
          "+" + base * multi + (multi > 1 ? " (série ×" + multi + ")" : "")
      );
    } else {
      partie.serie = 0;
      if (r.issue === "abri") {
        partie.score += BAREME.abri;
        dis("abri");
        note("Dans le mobilier. +" + BAREME.abri + " et la série repart de zéro.");
      } else {
        dis("rate");
        note("À côté. La série repart de zéro.");
      }
    }

    majComptoir();
    tireLeVent();
  }

  /* =========================================================
     La boucle
     ========================================================= */

  function tourne(t) {
    boucle = requestAnimationFrame(tourne);
    if (!partie.enJeu) return;

    if (!dernier) dernier = t;
    /* On plafonne le pas : un onglet revenu au premier plan enverrait sinon
       une seconde d'un coup, et Mads se téléporterait. */
    const dt = Math.min((t - dernier) / 1000, 0.05);
    dernier = t;
    partie.t += dt;

    if (partie.charge !== null) {
      /* La jauge monte puis s'arrête en haut : tenir trop longtemps ne fait
         pas perdre le tir, mais envoyer à fond envoie derrière le chapiteau. */
      partie.puissance = Math.min(100, ((t - partie.charge) / TIR.chargeMs) * 100);
      majVisee();
    }

    if (partie.sonne > 0) partie.sonne -= dt;
    const etat = positionMads(partie.manche, partie.t);
    poseMads(etat, partie.sonne > 0 ? "sonne" : "");
    annonce(etat);
    placeBulle(etat);

    if (partie.vol) {
      const tv = partie.t - partie.vol.t0;
      if (tv >= partie.vol.r.tVol) {
        resout(partie.vol.r);
      } else {
        const pts = partie.vol.r.points;
        dessineTomate(pts[Math.min(pts.length - 1, Math.floor(tv / TIR.pas))]);
      }
    } else if (partie.repos > 0) {
      partie.repos -= dt;
      /* La manche s'arrête à l'objectif atteint, pas au cageot vide : c'est
         ce qui donne sa valeur au bonus de munitions restantes, et donc une
         raison de viser juste plutôt que d'arroser. */
      if (partie.repos <= 0 && (partie.munitions <= 0 || partie.touches >= partie.manche.objectif)) {
        return finManche();
      }
    }

    dessineApercu();

    if (t > bulleFin) bulle.classList.remove("tom-visible");
  }

  /* --- Dessin per-frame ------------------------------------------------ */

  function dessineTomate(p) {
    if (!p) return;
    $("tom-g-tomate").innerHTML =
      '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + TIR.rayon + '" fill="#e03131" stroke="' +
        TRAIT + '" stroke-width="0.9"/>' +
      '<path d="M' + p.x + " " + (p.y - TIR.rayon) + "q-1.6-1.8 0.4-1.6q0.6-1.4 1.8-0.2" +
        '" fill="#4ad66d" stroke="' + TRAIT + '" stroke-width="0.6"/>';
  }

  function dessineApercu() {
    const g = $("tom-g-tomate");
    const apercu = $("tom-g-apercu");
    const viseur = $("tom-g-viseur");
    if (partie.vol) {
      apercu.setAttribute("points", "");
      viseur.innerHTML = "";
      return;
    }
    g.innerHTML = "";

    const pts = apercuTir(partie.manche, partie.angle, partie.puissance, partie.vent);
    apercu.setAttribute("points", pts.map((p) => p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" "));

    /* La flèche de visée : sa longueur dit la puissance, sa direction
       l'angle. C'est la lecture immédiate, l'aperçu est la lecture fine. */
    const rad = (partie.angle * Math.PI) / 180;
    const d = 7 + (partie.puissance / 100) * 11;
    const x = MONDE.lanceur.x + Math.cos(rad) * d;
    const y = MONDE.lanceur.y - Math.sin(rad) * d;
    viseur.innerHTML =
      '<path d="M' + MONDE.lanceur.x + " " + MONDE.lanceur.y + "L" + x + " " + y +
      '" stroke="#ffd84d" stroke-width="1.4" stroke-linecap="round" opacity=".9"/>' +
      '<circle cx="' + x + '" cy="' + y + '" r="1.6" fill="#ffd84d" stroke="' + TRAIT +
      '" stroke-width="0.6"/>';
  }

  /* Une éclaboussure, comme sur l'affiche : une flaque et trois gouttes. */
  function tache(p, surMads) {
    if (!p) return;
    const g = $("tom-g-taches");
    const e = document.createElementNS("http://www.w3.org/2000/svg", "g");
    e.innerHTML =
      '<path d="M' + p.x + " " + (p.y - 3) + "c3.2-3.6 7.6-1.4 7.2 2.2-0.4 3.4-4.4 3.6-5.4 5.8" +
      "-1.4-2-5-2-5.4-4.9-0.4-3.2 1.8-5 3.6-3.1z" +
      '" fill="#ff4d4d" opacity="' + (surMads ? ".9" : ".8") + '"/>' +
      '<circle cx="' + (p.x + 6) + '" cy="' + (p.y - 5) + '" r="1.4" fill="#c92a2a"/>' +
      '<circle cx="' + (p.x - 5) + '" cy="' + (p.y - 4) + '" r="1.2" fill="#c92a2a"/>' +
      '<circle cx="' + (p.x + 2) + '" cy="' + (p.y + 6) + '" r="1.1" fill="#c92a2a"/>';
    g.appendChild(e);
    /* On plafonne : une manche de treize tirs ne doit pas laisser un mur de
       taches devant la cible. */
    while (g.childNodes.length > 14) g.removeChild(g.firstChild);
  }

  /* =========================================================
     La parole de Mads
     ========================================================= */

  const tire = (liste) => liste[Math.floor(Math.random() * liste.length)];

  function dis(famille) {
    bulle.textContent = "« " + tire(REPLIQUES[famille]) + " »";
    bulle.classList.add("tom-visible");
    bulleFin = performance.now() + 2400;
  }

  /* Il commente ses propres poses : quand il monte fanfaronner, quand il
     part se planquer. Sans ça, la moitié de son cycle est muette. */
  function annonce(etat) {
    if (etat.etat === etatPrecedent) return;
    etatPrecedent = etat.etat;
    if (etat.etat === "nargue") dis("nargue");
    else if (etat.etat === "planque") dis("planque");
  }

  function placeBulle(etat) {
    const h = etat.accroupi ? MADS.accroupi : MADS.debout;
    bulle.style.left = (etat.x / MONDE.largeur) * 100 + "%";
    bulle.style.top = ((MONDE.podium.dessus - h - 2) / MONDE.hauteur) * 100 + "%";
  }

  /* =========================================================
     Le comptoir
     ========================================================= */

  function majComptoir() {
    $("tom-manche").textContent = partie.manche
      ? partie.manche.nom + " (" + (partie.index + 1) + "/" + MANCHES.length + ")"
      : "—";
    $("tom-score").textContent = partie.score;
    $("tom-record").textContent = partie.record ? "record : " + partie.record : "";
    $("tom-touches").textContent =
      partie.touches + " / " + (partie.manche ? partie.manche.objectif : 0);
    const multi = multiplicateur(partie.serie);
    $("tom-serie").textContent = "Série : " + partie.serie + (multi > 1 ? " (×" + multi + ")" : "");

    const cageot = $("tom-cageot");
    cageot.innerHTML = "";
    const total = partie.manche ? partie.manche.munitions : 0;
    for (let i = 0; i < total; i++) {
      const t = document.createElement("i");
      t.className = "tom-munition" + (i < partie.munitions ? "" : " tom-vide");
      cageot.appendChild(t);
    }
  }

  function majVent() {
    const v = partie.vent;
    const el = $("tom-vent");
    const force = Math.abs(v);
    el.textContent =
      force < 1 ? "calme" : (v < 0 ? "⟵ " : "⟶ ") + force.toFixed(0) + (v < 0 ? " (de face)" : " (dans le dos)");

    /* La manche à air : elle penche du côté où souffle le vent, d'autant
       plus qu'il est fort. C'est la lecture qu'on a sans quitter la scène
       des yeux. */
    const g = $("tom-g-vent");
    if (!g) return;
    const x = 74;
    const base = MONDE.sol;
    const haut = base - 18;
    const l = 3 + (force / 22) * 9;
    const sens = v < 0 ? -1 : 1;
    g.innerHTML =
      '<path d="M' + x + " " + base + "V" + haut + '" stroke="' + TRAIT + '" stroke-width="1"/>' +
      '<path d="M' + x + " " + haut + "l" + sens * l + " 2.4L" + x + " " + (haut + 4.8) +
      'z" fill="' + (force < 1 ? "#cfcfcf" : "#ffd84d") + '" stroke="' + TRAIT + '" stroke-width="0.7"/>';
  }

  function majVisee() {
    $("tom-angle").textContent = Math.round(partie.angle) + "°";
    $("tom-puissance").textContent = Math.round(partie.puissance) + " %";
    $("tom-jauge-barre").style.width = partie.puissance + "%";
  }

  function note(html) {
    journal.innerHTML = html;
  }

  /* =========================================================
     Le record, en local
     ========================================================= */

  function litRecord() {
    try {
      return Number(localStorage.getItem(CLE_RECORD)) || 0;
    } catch (e) {
      /* Navigation privée, stockage refusé : on joue sans record, c'est tout. */
      return 0;
    }
  }

  function ecritRecord(v) {
    try {
      localStorage.setItem(CLE_RECORD, String(v));
    } catch (e) {
      /* Idem : ne jamais empêcher de jouer pour un compteur de vanité. */
    }
  }

  /* =========================================================
     Les commandes
     ---------------------------------------------------------
     Trois entrées pour le même geste, parce qu'un jeu de visée qui ne se
     joue qu'à la souris n'est pas jouable du tout pour une partie des gens :
       - clavier  : ↑↓ l'angle, ←→ la puissance au point près, Espace pour
                    charger, Entrée pour lancer sans charger ;
       - souris   : la position vise, le maintien charge ;
       - doigt    : deux pavés d'angle et un gros pavé de lancer.
     ========================================================= */

  const HAUT = ["ArrowUp", "KeyW", "KeyZ"];
  const BAS = ["ArrowDown", "KeyS"];
  const MOINS = ["ArrowLeft", "KeyA", "KeyQ"];
  const PLUS = ["ArrowRight", "KeyD"];

  const borne = (v, min, max) => Math.max(min, Math.min(max, v));

  function bougeAngle(d) {
    partie.angle = borne(partie.angle + d, TIR.angleMin, TIR.angleMax);
    majVisee();
  }

  function bougePuissance(d) {
    partie.puissance = borne(partie.puissance + d, 0, 100);
    majVisee();
  }

  function commenceCharge(t) {
    if (partie.charge !== null || partie.vol || partie.repos > 0) return;
    partie.charge = t;
    partie.puissance = 0;
    scene.classList.add("tom-charge");
    majVisee();
  }

  /* La recherche du portail vit sur la même page : lui voler ses flèches et
     sa barre d'espace rendrait le champ inutilisable. */
  const dansUnChamp = (cible) =>
    cible && /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName || "");

  document.addEventListener("keydown", (e) => {
    if (!partie.enJeu || e.ctrlKey || e.altKey || e.metaKey) return;
    if (dansUnChamp(e.target)) return;
    if (HAUT.includes(e.code)) { bougeAngle(TIR.pasAngle); e.preventDefault(); }
    else if (BAS.includes(e.code)) { bougeAngle(-TIR.pasAngle); e.preventDefault(); }
    else if (MOINS.includes(e.code)) { bougePuissance(-TIR.pasPuissance); e.preventDefault(); }
    else if (PLUS.includes(e.code)) { bougePuissance(TIR.pasPuissance); e.preventDefault(); }
    else if (e.code === "Space") {
      /* `repeat` : sans ce garde-fou, la répétition du clavier relancerait
         la charge à zéro cinquante fois par seconde. */
      if (!e.repeat) commenceCharge(performance.now());
      e.preventDefault();
    } else if (e.code === "Enter" || e.code === "NumpadEnter") {
      lance();
      e.preventDefault();
    }
  });

  document.addEventListener("keyup", (e) => {
    if (!partie.enJeu || dansUnChamp(e.target)) return;
    if (e.code === "Space" && partie.charge !== null) {
      lance();
      e.preventDefault();
    }
  });

  /* --- Souris et stylet : la position vise, le maintien charge --------- */

  /* Au doigt, un appui sur la scène VISE seulement : la charge appartient au
     pavé « LANCER ». Sans cette distinction, effleurer la scène pour viser
     partirait aussitôt à puissance nulle — une tomate perdue par tape. */
  let doigt = false;

  scene.addEventListener("pointermove", (e) => {
    if (!partie.enJeu) return;
    if (e.pointerType === "touch" && !doigt) return;
    viseVers(e);
  });

  scene.addEventListener("pointerdown", (e) => {
    if (!partie.enJeu) return;
    scene.focus();
    viseVers(e);
    if (e.pointerType === "touch") doigt = true;
    else commenceCharge(performance.now());
    e.preventDefault();
  });

  /* Relâché n'importe où : un curseur sorti du cadre ne doit pas garder la
     tomate en main indéfiniment. */
  window.addEventListener("pointerup", () => {
    doigt = false;
    if (partie.charge !== null) lance();
  });
  window.addEventListener("pointercancel", () => {
    doigt = false;
    partie.charge = null;
    scene.classList.remove("tom-charge");
  });

  function viseVers(e) {
    const r = scene.getBoundingClientRect();
    if (!r.width) return;
    const x = ((e.clientX - r.left) / r.width) * MONDE.largeur;
    const y = ((e.clientY - r.top) / r.height) * MONDE.hauteur;
    const a = (Math.atan2(MONDE.lanceur.y - y, x - MONDE.lanceur.x) * 180) / Math.PI;
    partie.angle = borne(a, TIR.angleMin, TIR.angleMax);
    majVisee();
  }

  /* --- Au doigt -------------------------------------------------------- */

  function pave(id, action, maintien) {
    const el = $(id);
    if (!el) return;
    let repete = null;
    const on = (e) => {
      e.preventDefault();
      el.classList.add("tom-appuye");
      if (maintien) return action(true);
      action();
      /* Un appui long doit continuer à régler : sinon viser à 1° près au
         doigt demande soixante tapes. */
      repete = setInterval(action, 90);
    };
    const off = () => {
      el.classList.remove("tom-appuye");
      if (repete) { clearInterval(repete); repete = null; }
      if (maintien) action(false);
    };
    el.addEventListener("pointerdown", on);
    el.addEventListener("pointerup", off);
    el.addEventListener("pointerleave", off);
    el.addEventListener("pointercancel", off);
  }

  pave("tom-tact-haut", () => bougeAngle(TIR.pasAngle));
  pave("tom-tact-bas", () => bougeAngle(-TIR.pasAngle));
  pave("tom-tact-tir", (appuye) => {
    if (appuye) commenceCharge(performance.now());
    else lance();
  }, true);

  /* Onglet quitté : on repart d'un pas de temps neuf, sinon Mads fait un
     bond de plusieurs secondes au retour. */
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) dernier = 0;
  });

  /* =========================================================
     Départ
     ========================================================= */

  construitDecor();
  construitPublic();
  construitAvant(MANCHES[0]);
  elLanceur.innerHTML = persoSVG(LANCEUR.look);
  /* Calé pour que la main levée tombe sur `MONDE.lanceur` : dans la fabrique
     commune, le bout du bras en pose « bras-leves » est à 74 % de la largeur
     et 58 % de la hauteur du cadre. */
  pourcent(elLanceur, MONDE.lanceur.x - 3, MONDE.sol, 11, 16);
  partie.manche = MANCHES[0];
  /* Mads est posé tout de suite, avant même la première image : sinon la
     scène derrière le rideau d'accueil est vide, et elle le reste tant que
     l'onglet est en arrière-plan (le navigateur y gèle les images). */
  poseMads(positionMads(MANCHES[0], 0), "");
  majVisee();
  majVent();
  majComptoir();
  ecranTitre();
  boucle = requestAnimationFrame(tourne);
})();
