/* =========================================================
   UMA Bros — le moteur
   ---------------------------------------------------------
   Un jeu de plateforme à défilement horizontal. Le moteur ne connaît aucun
   nom propre : personnages, bestiaire et niveaux viennent tous de
   `niveaux.js`. Ajouter un niveau ou un ennemi ne demande pas d'y toucher.

   Ce qu'il fait :
     - déplacement, saut, gravité, collisions contre des rectangles ;
     - ennemis en patrouille, qu'on écrase en leur retombant dessus ;
     - caméra qui suit, décor de fond en parallaxe ;
     - vies, chrono, score, écrans de choix / défaite / victoire.

   Rendu en DOM plutôt qu'en canvas, comme les autres jeux du portail : les
   personnages sont des SVG produits par shared/perso.js, autant les poser
   tels quels.
   ========================================================= */

(function () {
  "use strict";

  /* Les réglages viennent de niveaux.js : c'est du réglage de difficulté,
     donc du contenu, et le banc d'essai s'en sert pour vérifier qu'un trou
     reste franchissable. */
  const GRAVITE = PHYSIQUE.gravite;
  const VITESSE = PHYSIQUE.vitesse;
  const SAUT = PHYSIQUE.saut;
  const CHUTE_MAX = PHYSIQUE.chuteMax;
  const JOUEUR_L = PHYSIQUE.joueurL;
  const JOUEUR_H = PHYSIQUE.joueurH;
  const COYOTE = PHYSIQUE.coyote;
  const MEMOIRE_SAUT = PHYSIQUE.memoireSaut;
  const VIES_DEPART = PHYSIQUE.vies;

  /* --- État --- */
  const jeu = {
    perso: null,
    niveau: null,
    vies: VIES_DEPART,
    score: 0,
    reste: 0,
    index: 0,
    enCours: false,
    fini: false,
  };

  const joueur = {
    x: 0, y: 0, vx: 0, vy: 0,
    sol: false, regarde: 1,
    depuisSol: 0, sautDemande: 0,
    invincible: 0,
  };

  let ennemis = [];
  let solides = [];
  let camera = 0;
  let dernier = 0;
  let boucle = null;

  const touches = { gauche: false, droite: false, saut: false };

  /* --- Raccourcis DOM --- */
  const $ = (sel) => document.querySelector(sel);
  const scene = $("#scene");
  const monde = $("#monde");
  const fond = $("#fond");
  const ecran = $("#ecran");
  const elJoueur = $("#joueur");

  /* =========================================================
     Choix du personnage
     ========================================================= */

  function ecranChoix() {
    jeu.enCours = false;
    ecran.className = "ecran visible";
    /* La consigne nommait le cafard, du temps où il était le seul ennemi.
       On déduit maintenant les inécrasables du bestiaire : le moteur ne
       connaît toujours aucun nom propre, et la phrase reste vraie si on
       ajoute ou retire un ennemi dans niveaux.js. */
    const inecrasables = Object.keys(ENNEMIS)
      .filter((cle) => ENNEMIS[cle].ecrasable === false)
      .map((cle) => ENNEMIS[cle].nom);
    const exception = inecrasables.length
      ? " Tout ne s'écrase pas : <b>" +
        inecrasables.join("</b> et <b>") +
        "</b>, on ne peut que les éviter."
      : "";

    ecran.innerHTML =
      '<div class="ecran-boite">' +
      '<h2 class="ecran-titre">Qui prend la route ?</h2>' +
      '<p class="ecran-texte">Flèches ou <b>Q</b>/<b>D</b> pour courir, ' +
      "<b>Espace</b> pour sauter. Retombe sur un ennemi pour l'écraser ; " +
      "le toucher autrement coûte une vie." + exception + "</p>" +
      '<div class="choix" id="choix"></div>' +
      "</div>";

    const grille = $("#choix");
    PERSOS.forEach((p) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "choix-carte";
      b.style.setProperty("--accent", p.couleur);
      b.innerHTML =
        '<span class="choix-perso">' + persoSVG(p.look) + "</span>" +
        '<span class="choix-nom">' + p.nom + "</span>" +
        '<span class="choix-talent">' + p.talent + "</span>" +
        '<span class="choix-detail">' + p.detail + "</span>";
      b.addEventListener("click", () => commence(p));
      grille.appendChild(b);
    });
  }

  function commence(perso) {
    jeu.perso = perso;
    jeu.vies = VIES_DEPART;
    jeu.score = 0;
    jeu.index = 0;
    document.body.style.setProperty("--accent", perso.couleur);
    elJoueur.innerHTML = persoSVG(perso.look);
    chargeNiveau(NIVEAUX[0]);
  }

  /* =========================================================
     Construction d'un niveau
     ========================================================= */

  function chargeNiveau(niveau) {
    jeu.niveau = niveau;
    jeu.reste = niveau.chrono;
    jeu.fini = false;

    scene.style.background = niveau.ciel;
    scene.dataset.niveau = niveau.id;
    scene.style.setProperty("--sol-herbe", niveau.herbe);
    scene.style.setProperty("--sol-terre", niveau.terre);
    construitFond(niveau);
    construitMonde(niveau);
    placeAuDepart();

    ecran.className = "ecran";
    ecran.innerHTML = "";
    jeu.enCours = true;
    dernier = 0;
    if (boucle) cancelAnimationFrame(boucle);
    boucle = requestAnimationFrame(tourne);
    majDock();
  }

  function construitFond(niveau) {
    fond.innerHTML = "";
    niveau.fond.forEach((d) => {
      const el = document.createElement("div");
      el.className = "decor decor-" + d.type;
      el.style.left = d.x + "px";
      el.style.height = d.h + "px";
      if (d.l) el.style.width = d.l + "px";
      el.style.top = Y_SOL - d.h + "px";
      fond.appendChild(el);
    });
  }

  function construitMonde(niveau) {
    monde.innerHTML = "";
    monde.style.width = niveau.longueur + 400 + "px";
    solides = [];

    niveau.sols.forEach((s) => {
      const el = document.createElement("div");
      el.className = "sol";
      el.style.left = s.x + "px";
      el.style.top = Y_SOL + "px";
      el.style.width = s.l + "px";
      monde.appendChild(el);
      solides.push({ x: s.x, y: Y_SOL, l: s.l, h: 240 });
    });

    niveau.blocs.forEach((b) => {
      const el = document.createElement("div");
      el.className = "plateforme";
      el.style.left = b.x + "px";
      el.style.top = b.y + "px";
      el.style.width = b.l + "px";
      monde.appendChild(el);
      solides.push({ x: b.x, y: b.y, l: b.l, h: 20 });
    });

    const drapeau = document.createElement("div");
    drapeau.className = "drapeau";
    drapeau.style.left = niveau.arrivee + "px";
    drapeau.style.top = Y_SOL - 150 + "px";
    monde.appendChild(drapeau);

    construitEnnemis(niveau);
    monde.appendChild(elJoueur);
  }

  function construitEnnemis(niveau) {
    ennemis.forEach((e) => e.el.remove());
    ennemis = niveau.ennemis.map((def) => {
      const type = ENNEMIS[def.type];
      const el = document.createElement("div");
      el.className =
        "ennemi ennemi-" + def.type + (type.ecrasable === false ? " inecrasable" : "");
      el.style.width = type.largeur + "px";
      el.style.height = type.hauteur + "px";
      /* Une silhouette humaine sort de la fabrique commune, comme partout
         ailleurs dans le portail ; le reste est dessiné dans niveaux.js. */
      el.innerHTML = type.perso ? persoSVG(type.perso) : type.svg;
      monde.appendChild(el);

      /* L'altitude de repos : ceux qui volent ondulent autour, ceux qui
         sautent y retombent, les autres s'y tiennent. */
      const base = type.vol
        ? def.y !== undefined
          ? def.y
          : Y_SOL - type.hauteur - 90
        : (def.y !== undefined ? def.y : Y_SOL) - type.hauteur;

      return {
        el,
        type,
        base,
        x: def.x,
        y: base,
        vy: 0,
        /* Déphasage tiré de la position : stable d'une partie à l'autre, mais
           les voisins n'ondulent pas en choeur. */
        phase: ((def.x * 7919) % 628) / 100,
        de: def.de,
        a: def.a,
        sens: -1,
        mort: false,
      };
    });
  }

  function placeAuDepart() {
    joueur.x = 60;
    joueur.y = Y_SOL - JOUEUR_H;
    joueur.vx = 0;
    joueur.vy = 0;
    joueur.sol = true;
    joueur.regarde = 1;
    joueur.invincible = 0;
    camera = 0;
    ennemis.forEach((e) => {
      e.mort = false;
      e.sens = -1;
      e.x = (e.de + e.a) / 2;
      e.y = e.base;
      e.vy = 0;
      e.el.classList.remove("ecrase");
    });
  }

  /* =========================================================
     La boucle
     ========================================================= */

  function tourne(t) {
    boucle = requestAnimationFrame(tourne);
    if (!jeu.enCours) return;

    if (!dernier) dernier = t;
    /* On plafonne le pas : un onglet revenu au premier plan enverrait sinon
       un delta d'une seconde, et le joueur traverserait les murs. */
    const dt = Math.min((t - dernier) / 1000, 0.05);
    dernier = t;

    majJoueur(dt);
    majEnnemis(dt);
    majChrono(dt);
    majCamera();
    dessine();
  }

  function majJoueur(dt) {
    /* Horizontal */
    const dir = (touches.droite ? 1 : 0) - (touches.gauche ? 1 : 0);
    joueur.vx = dir * VITESSE * jeu.perso.vitesse;
    if (dir) joueur.regarde = dir;

    joueur.x += joueur.vx * dt;
    resoudre("x");

    /* Saut : coyote + mémoire, pour que la commande réponde toujours. */
    joueur.depuisSol = joueur.sol ? 0 : joueur.depuisSol + dt;
    joueur.sautDemande = Math.max(0, joueur.sautDemande - dt);
    if (joueur.sautDemande > 0 && joueur.depuisSol < COYOTE) {
      joueur.vy = -SAUT * jeu.perso.saut;
      joueur.sol = false;
      joueur.depuisSol = COYOTE;
      joueur.sautDemande = 0;
      elJoueur.classList.add("saute");
    }

    /* Vertical */
    joueur.vy = Math.min(joueur.vy + GRAVITE * dt, CHUTE_MAX);
    joueur.y += joueur.vy * dt;
    joueur.sol = false;
    resoudre("y");
    if (joueur.sol) elJoueur.classList.remove("saute");

    /* Bornes du monde */
    if (joueur.x < 0) joueur.x = 0;
    const fin = jeu.niveau.longueur + 200;
    if (joueur.x + JOUEUR_L > fin) joueur.x = fin - JOUEUR_L;

    if (joueur.invincible > 0) joueur.invincible -= dt;

    if (joueur.y > Y_CHUTE) return perdVie("Tombé dans le vide.");
    if (joueur.x + JOUEUR_L >= jeu.niveau.arrivee) return gagne();

    elJoueur.classList.toggle("court", joueur.sol && Math.abs(joueur.vx) > 5);
  }

  /* Résolution axe par axe : on bouge sur un axe, on repousse hors de tout
     rectangle traversé, puis on passe à l'autre. C'est ce qui évite de rester
     coincé dans un angle. */
  function resoudre(axe) {
    const b = { x: joueur.x, y: joueur.y, l: JOUEUR_L, h: JOUEUR_H };
    for (const s of solides) {
      if (!chevauche(b, s)) continue;
      if (axe === "x") {
        if (joueur.vx > 0) joueur.x = s.x - JOUEUR_L;
        else if (joueur.vx < 0) joueur.x = s.x + s.l;
        b.x = joueur.x;
      } else {
        if (joueur.vy > 0) {
          joueur.y = s.y - JOUEUR_H;
          joueur.sol = true;
        } else if (joueur.vy < 0) {
          joueur.y = s.y + s.h;
        }
        joueur.vy = 0;
        b.y = joueur.y;
      }
    }
  }

  const chevauche = (a, b) =>
    a.x < b.x + b.l && a.x + a.l > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  function majEnnemis(dt) {
    const bJoueur = { x: joueur.x, y: joueur.y, l: JOUEUR_L, h: JOUEUR_H };

    for (const e of ennemis) {
      if (e.mort) continue;

      e.x += e.sens * e.type.vitesse * dt;
      if (e.x <= e.de) { e.x = e.de; e.sens = 1; }
      if (e.x + e.type.largeur >= e.a) { e.x = e.a - e.type.largeur; e.sens = -1; }

      if (e.type.vol) {
        /* Il ondule autour de son altitude de repos. */
        e.phase += dt * (e.type.pulsation || 1.5);
        e.y = e.base + Math.sin(e.phase) * (e.type.amplitude || 30);
      } else if (e.type.saute) {
        /* Il rebondit sur place : gravité, puis relance dès qu'il touche. */
        e.vy += GRAVITE * dt;
        e.y += e.vy * dt;
        if (e.y >= e.base) {
          e.y = e.base;
          e.vy = -(e.type.impulsion || 400);
        }
      }

      const bE = { x: e.x, y: e.y, l: e.type.largeur, h: e.type.hauteur };
      if (!chevauche(bJoueur, bE)) continue;

      /* On l'écrase si on lui retombe dessus : en descente, et les pieds
         encore au-dessus de son milieu. Sinon c'est lui qui gagne. */
      const piedsAuDessus = joueur.y + JOUEUR_H - joueur.vy * 0.016 <= e.y + e.type.hauteur * 0.6;
      /* Les deux gros morceaux ne s'écrasent pas : on ne peut que les éviter. */
      const ecrasable = e.type.ecrasable !== false;
      if (ecrasable && joueur.vy > 0 && piedsAuDessus) {
        e.mort = true;
        e.el.classList.add("ecrase");
        jeu.score += e.type.points;
        joueur.vy = -SAUT * 0.62; // petit rebond
        majDock();
      } else if (joueur.invincible <= 0) {
        return perdVie("Touché par un " + e.type.nom.toLowerCase() + ".");
      }
    }
  }

  function majChrono(dt) {
    jeu.reste -= dt;
    if (jeu.reste <= 0) {
      jeu.reste = 0;
      perdVie("Le temps est écoulé.");
    }
    majDock();
  }

  function majCamera() {
    const large = scene.clientWidth;
    const max = Math.max(0, jeu.niveau.longueur + 200 - large);
    camera = Math.max(0, Math.min(joueur.x + JOUEUR_L / 2 - large / 2, max));
  }

  function dessine() {
    monde.style.transform = "translate3d(" + -camera + "px,0,0)";
    fond.style.transform = "translate3d(" + -camera * 0.45 + "px,0,0)";
    elJoueur.style.transform =
      "translate3d(" + joueur.x + "px," + joueur.y + "px,0) scaleX(" + joueur.regarde + ")";
    elJoueur.classList.toggle("clignote", joueur.invincible > 0);
    for (const e of ennemis) {
      e.el.style.transform =
        "translate3d(" + e.x + "px," + e.y + "px,0) scaleX(" + (e.sens > 0 ? -1 : 1) + ")";
    }
  }

  /* =========================================================
     Vies, défaite, victoire
     ========================================================= */

  function perdVie(raison) {
    if (jeu.fini) return;
    jeu.vies -= 1;
    majDock();
    if (jeu.vies <= 0) return termine(false, raison);

    jeu.enCours = false;
    ecran.className = "ecran visible ecran-mince";
    ecran.innerHTML =
      '<div class="ecran-boite">' +
      '<h2 class="ecran-titre">Aïe.</h2>' +
      '<p class="ecran-texte">' + raison + " Il te reste <b>" + jeu.vies +
      (jeu.vies > 1 ? "</b> vies." : "</b> vie.") + "</p>" +
      '<button type="button" class="fun-btn primary" id="btn-reprendre">Repartir du début</button>' +
      "</div>";
    $("#btn-reprendre").addEventListener("click", () => {
      jeu.reste = jeu.niveau.chrono;
      placeAuDepart();
      ecran.className = "ecran";
      ecran.innerHTML = "";
      jeu.enCours = true;
      dernier = 0;
      majDock();
    });
  }

  function gagne() {
    const bonus = Math.round(jeu.reste) * 10;
    jeu.score += bonus;
    const suivant = NIVEAUX[jeu.index + 1];

    if (!suivant) {
      return termine(true, "Bonus de temps : " + bonus + " points.");
    }

    /* Entre deux niveaux : on garde le score et les vies, on annonce la suite. */
    jeu.enCours = false;
    jeu.fini = true;
    majDock();
    ecran.className = "ecran visible";
    ecran.innerHTML =
      '<div class="ecran-boite">' +
      '<h2 class="ecran-titre">Niveau terminé !</h2>' +
      '<p class="ecran-texte">' + jeu.perso.nom + " s'en sort. Bonus de temps : <b>" +
      bonus + "</b> points. Score : <b>" + jeu.score + "</b>.</p>" +
      '<p class="ecran-texte">Direction <b>' + suivant.nom + "</b> — " +
      suivant.difficulte.toLowerCase() + ".<br />" +
      '<span class="ecran-suite">' + suivant.ambiance + "</span></p>" +
      '<button type="button" class="fun-btn primary" id="btn-suite">Niveau suivant</button>' +
      "</div>";
    $("#btn-suite").addEventListener("click", () => {
      jeu.index += 1;
      chargeNiveau(NIVEAUX[jeu.index]);
    });
  }

  function termine(victoire, note) {
    jeu.fini = true;
    jeu.enCours = false;
    majDock();
    ecran.className = "ecran visible";
    ecran.innerHTML =
      '<div class="ecran-boite">' +
      '<h2 class="ecran-titre">' +
      (victoire ? "Tu es arrivé au bout !" : "Game over") + "</h2>" +
      '<p class="ecran-texte">' +
      (victoire
        ? jeu.perso.nom + " a traversé le campus, Derry et la forêt. " + note
        : "Il restait du chemin. " + note) +
      "<br />Score final : <b>" + jeu.score + "</b></p>" +
      '<button type="button" class="fun-btn primary" id="btn-rejouer">Rejouer</button> ' +
      '<button type="button" class="fun-btn" id="btn-changer">Changer de personnage</button>' +
      "</div>";
    $("#btn-rejouer").addEventListener("click", () => commence(jeu.perso));
    $("#btn-changer").addEventListener("click", ecranChoix);
  }

  /* =========================================================
     Tableau de bord
     ========================================================= */

  function majDock() {
    $("#dock-perso").textContent = jeu.perso ? jeu.perso.nom : "—";
    $("#dock-score").textContent = jeu.score;
    $("#dock-chrono").textContent = Math.max(0, Math.ceil(jeu.reste));
    const vies = $("#dock-vies");
    vies.innerHTML = "";
    for (let i = 0; i < Math.max(0, jeu.vies); i++) {
      const c = document.createElement("span");
      c.className = "vie";
      c.textContent = "♥";
      vies.appendChild(c);
    }
    $("#dock-niveau").textContent = jeu.niveau
      ? jeu.niveau.nom + " (" + (jeu.index + 1) + "/" + NIVEAUX.length + ")"
      : "—";
  }

  /* =========================================================
     Commandes
     ========================================================= */

  const GAUCHE = ["ArrowLeft", "KeyA", "KeyQ"];
  const DROITE = ["ArrowRight", "KeyD"];
  const SAUTE = ["Space", "ArrowUp", "KeyW", "KeyZ"];

  document.addEventListener("keydown", (e) => {
    if (GAUCHE.includes(e.code)) { touches.gauche = true; e.preventDefault(); }
    if (DROITE.includes(e.code)) { touches.droite = true; e.preventDefault(); }
    if (SAUTE.includes(e.code)) {
      touches.saut = true;
      joueur.sautDemande = MEMOIRE_SAUT;
      e.preventDefault();
    }
  });

  document.addEventListener("keyup", (e) => {
    if (GAUCHE.includes(e.code)) touches.gauche = false;
    if (DROITE.includes(e.code)) touches.droite = false;
    if (SAUTE.includes(e.code)) {
      touches.saut = false;
      /* Relâcher tôt coupe le saut : c'est ce qui donne un saut dosable. */
      if (joueur.vy < -180) joueur.vy = -180;
    }
  });

  /* Au doigt : trois pavés sous la scène. */
  function brancheTactile() {
    const paires = [
      ["#tact-gauche", "gauche"],
      ["#tact-droite", "droite"],
      ["#tact-saut", "saut"],
    ];
    paires.forEach(([sel, nom]) => {
      const el = $(sel);
      if (!el) return;
      const on = (e) => {
        e.preventDefault();
        touches[nom] = true;
        if (nom === "saut") joueur.sautDemande = MEMOIRE_SAUT;
        el.classList.add("appuye");
      };
      const off = () => {
        touches[nom] = false;
        if (nom === "saut" && joueur.vy < -180) joueur.vy = -180;
        el.classList.remove("appuye");
      };
      el.addEventListener("pointerdown", on);
      el.addEventListener("pointerup", off);
      el.addEventListener("pointerleave", off);
      el.addEventListener("pointercancel", off);
    });
  }

  /* Onglet quitté : on remet le chrono de la boucle à zéro au retour, sinon
     le premier pas de temps serait énorme. */
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) dernier = 0;
  });

  window.addEventListener("resize", majCamera);

  brancheTactile();
  ecranChoix();
  majDock();
})();
