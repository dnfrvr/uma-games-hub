/* =========================================================
   Run, Glinda, Run — le moteur
   ---------------------------------------------------------
   Une course sans fin en vue de côté : Glinda ne s'arrête jamais, c'est le
   monde qui défile sous elle, de plus en plus vite. Boq court derrière.
   Chaque obstacle touché lui offre du terrain ; quand il n'y a plus de
   terrain, il l'a rattrapée et il PARLE.

   Le partage des rôles dans ce dossier :
     donnees.js     le contenu (réglages, casting, mobilier, décor, répliques)
     generateur.js  le parcours et les collisions — sans DOM, donc testable
     main.js        ce fichier : la boucle, les commandes, l'affichage
     test-course.js la preuve, dans Node, qu'aucun parcours n'est infranchissable

   Le moteur ne connaît aucun nom propre et ne décide d'aucune difficulté :
   ajouter un obstacle, c'est une entrée dans `OBSTACLES`, pas une ligne ici.

   Rendu en DOM plutôt qu'en canvas, comme les autres jeux du portail : les
   personnages sont des SVG produits par shared/perso.js, autant les poser
   tels quels et laisser le GPU faire défiler des `transform`.
   ========================================================= */

(function () {
  "use strict";

  const P = PHYSIQUE;

  const $ = (sel) => document.querySelector(sel);
  const scene = $("#run-scene");
  const decor = $("#run-decor");
  const acteurs = $("#run-acteurs");
  const elGlinda = $("#run-glinda");
  const elBoq = $("#run-boq");
  const ecran = $("#run-ecran");
  const annonceur = $(".run-annonce");

  /* Le système peut demander moins d'animation. Le défilement, lui, EST le
     jeu : on ne peut pas le retirer. On enlève tout le reste — la secousse
     du choc, le scintillement des pompons, le clignotement de l'alerte. */
  const sobre = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (sobre) scene.classList.add("run-sobre");

  /* --- État ------------------------------------------------------------- */
  const partie = {
    enCours: false,
    fini: false,
    parcouru: 0, // px de monde défilés depuis le départ
    pompons: 0,
    ecart: P.ecartDepart, // ce qui reste entre Glinda et Boq, en px
    choc: 0, // temps restant à tituber
    secousse: 0,
  };

  const glinda = { y: P.ySol - P.joueurH, vy: 0, sol: true, glisse: false, tenue: 0, pose: "" };
  const memoire = { saut: 0, glisse: 0, depuisSol: 0 };
  const touches = { saut: false, bas: false };

  let objets = []; // ce qui est actuellement à l'écran (obstacles + pompons)
  let couches = []; // les bandes de décor en parallaxe
  let gen = null;
  let record = 0; // meilleur score de la session, en mémoire seulement
  let dernier = 0;
  let boucle = null;

  /* =========================================================
     Le décor : une bande par couche, décrite dans donnees.js
     ========================================================= */

  function construitDecor() {
    /* La feuille de style cale tout le monde sur la LIGNE DE SOL, jamais sur
       le haut du cadre : le lecteur du portail étire la scène, et le plein
       écran encore plus. On lui donne donc la hauteur du trottoir, calculée
       ici pour que la donnée n'existe qu'à un seul endroit. */
    scene.style.setProperty("--run-sol", P.hauteurScene - P.ySol + "px");
    decor.innerHTML = "";
    couches = COUCHES.map((c) => {
      const el = document.createElement("div");
      el.className = "run-couche run-couche-" + c.id;
      /* La bande est plus large que la scène d'exactement une période : on
         peut donc la faire glisser d'une période puis la remettre à zéro
         sans que personne ne voie la couture. */
      el.style.width = "calc(100% + " + c.periode + "px)";
      decor.appendChild(el);
      return { el: el, facteur: c.facteur, periode: c.periode };
    });
  }

  /* =========================================================
     Une partie
     ========================================================= */

  function commence() {
    objets.forEach((o) => o.el.remove());
    objets = [];
    partie.enCours = true;
    partie.fini = false;
    partie.parcouru = 0;
    partie.pompons = 0;
    partie.ecart = P.ecartDepart;
    partie.choc = 0;
    partie.secousse = 0;

    glinda.y = P.ySol - P.joueurH;
    glinda.vy = 0;
    glinda.sol = true;
    glinda.glisse = false;
    glinda.tenue = 0;
    memoire.saut = 0;
    memoire.glisse = 0;
    memoire.depuisSol = 0;

    gen = creeGenerateur();
    poseGlinda("course");
    elBoq.innerHTML = persoSVG(BOQ);

    ecran.className = "run-ecran";
    ecran.innerHTML = "";
    annonce("C'est parti. Boq est à " + Math.round(partie.ecart) + " pas derrière toi.");

    dernier = 0;
    if (boucle) cancelAnimationFrame(boucle);
    boucle = requestAnimationFrame(tourne);
    majTableau();
  }

  /* Glinda ne change de dessin que quand sa pose change vraiment : redessiner
     un SVG à chaque image pour rien, c'est du travail jeté. */
  function poseGlinda(nom) {
    if (glinda.pose === nom) return;
    glinda.pose = nom;
    elGlinda.innerHTML = persoSVG(Object.assign({}, GLINDA.base, GLINDA.poses[nom]));
    elGlinda.classList.toggle("run-glinda-glisse", nom === "glisse");
  }

  /* =========================================================
     La boucle
     ========================================================= */

  function tourne(t) {
    boucle = requestAnimationFrame(tourne);
    if (!partie.enCours) return;

    if (!dernier) dernier = t;
    /* On plafonne le pas : un onglet revenu au premier plan enverrait sinon
       un delta d'une seconde, et Glinda traverserait trois banderoles. */
    const dt = Math.min((t - dernier) / 1000, 0.05);
    dernier = t;

    avance(dt);
    dessine();
  }

  function avance(dt) {
    const xJoueur = partie.parcouru + P.xJoueur;
    const vNominale = vitesseA(xJoueur);
    /* Quand elle titube, le monde ralentit : c'est visible, et c'est
       exactement ce qui permet à Boq de revenir. */
    const v = partie.choc > 0 ? vNominale * P.chocVitesse : vNominale;

    partie.parcouru += v * dt;
    partie.choc = Math.max(0, partie.choc - dt);
    partie.secousse = Math.max(0, partie.secousse - dt);

    peuple();
    majGlinda(dt);
    majCollisions(xJoueur);
    majBoq(dt, v, vNominale, xJoueur);
    majTableau();
  }

  /* --- Le parcours : on écrit devant, on efface derrière ----------------- */
  function peuple() {
    const large = scene.clientWidth || 900;
    gen.produireJusqua(partie.parcouru + large + 320).forEach(cree);

    objets = objets.filter((o) => {
      if (o.x + o.largeur > partie.parcouru - 140) return true;
      o.el.remove();
      return false;
    });
  }

  function cree(o) {
    const el = document.createElement("div");
    if (o.genre === "pompon") {
      el.className = "run-pompon";
      el.innerHTML = POMPON_SVG;
    } else {
      el.className = "run-obstacle run-obstacle-" + o.type;
      el.innerHTML = o.def.svg;
    }
    const boite = boiteObjet(o);
    el.style.width = o.largeur + "px";
    el.style.height = o.hauteur + "px";
    o.el = el;
    o.ecranY = boite.y;
    acteurs.appendChild(el);
    objets.push(o);
  }

  /* --- Saut et glissade -------------------------------------------------- */
  function majGlinda(dt) {
    memoire.depuisSol = glinda.sol ? 0 : memoire.depuisSol + dt;
    memoire.saut = Math.max(0, memoire.saut - dt);
    memoire.glisse = Math.max(0, memoire.glisse - dt);

    /* Coyote + mémoire d'appui : la commande répond même si on appuie un
       cheveu trop tôt ou un cheveu trop tard. */
    if (memoire.saut > 0 && memoire.depuisSol < P.coyote) {
      glinda.vy = -P.saut;
      glinda.sol = false;
      glinda.glisse = false;
      memoire.depuisSol = P.coyote;
      memoire.saut = 0;
    }

    /* La glissade ne s'engage qu'au sol. Demandée en l'air, elle est mise de
       côté (et fait plonger plus vite : ça donne envie de l'utiliser). */
    if (memoire.glisse > 0 && glinda.sol && !glinda.glisse) {
      glinda.glisse = true;
      glinda.tenue = 0;
      memoire.glisse = 0;
    }
    if (glinda.glisse) {
      glinda.tenue += dt;
      const relachee = !touches.bas && glinda.tenue > P.glisseMin;
      if (relachee || glinda.tenue > P.glisseMax) glinda.glisse = false;
    }

    const hauteur = glinda.glisse ? P.joueurHGlisse : P.joueurH;
    /* Au sol, la boîte est PLAQUÉE à la posture du moment : s'accroupir est
       instantané. Sans ça elle met 0,14 s à baisser la tête et se cogne à la
       banderole qu'elle vient justement d'esquiver — trouvé par test-course.js,
       pas à l'œil. */
    if (glinda.sol) glinda.y = P.ySol - hauteur;

    let g = P.gravite;
    if (!glinda.sol && touches.bas) g += P.plongeon;
    glinda.vy = Math.min(glinda.vy + g * dt, P.chuteMax);
    glinda.y += glinda.vy * dt;

    if (glinda.y >= P.ySol - hauteur) {
      glinda.y = P.ySol - hauteur;
      glinda.vy = 0;
      glinda.sol = true;
    } else {
      glinda.sol = false;
    }

    poseGlinda(
      partie.choc > 0 ? "choc" : !glinda.sol ? "saut" : glinda.glisse ? "glisse" : "course"
    );
  }

  /* --- Ce qu'on touche --------------------------------------------------- */
  function majCollisions(xJoueur) {
    const boite = boiteJoueur(xJoueur, glinda.y, glinda.glisse);

    for (const o of objets) {
      if (o.pris) continue;
      if (o.x > xJoueur + P.joueurL) break; // la liste est triée : rien après
      if (!chevauche(boite, boiteObjet(o))) continue;

      if (o.genre === "pompon") {
        o.pris = true;
        o.el.classList.add("run-pris");
        partie.pompons += 1;
        partie.ecart = Math.min(P.ecartMax, partie.ecart + P.pomponEcart);
        continue;
      }

      /* Un obstacle ne se cogne qu'une fois : sinon on le retouche à chaque
         image pendant qu'on le traverse en titubant. */
      o.pris = true;
      o.el.classList.add("run-cogne");
      partie.choc = P.chocDuree;
      partie.secousse = 0.3;
      partie.ecart -= P.ecartChoc;
      annonce("Aïe, " + o.def.nom + ". Boq se rapproche.");
    }
  }

  /* --- Boq ---------------------------------------------------------------
     Trois forces sur l'écart : ce que le trébuchement coûte (Glinda ralentit,
     lui non), la pression qui monte avec la course, et ce qu'un tour de piste
     propre lui reprend. */
  function majBoq(dt, v, vNominale, xJoueur) {
    const p = progressionA(xJoueur);
    const pression = P.pressionDepart + (P.pressionFinale - P.pressionDepart) * p;

    partie.ecart -= (vNominale - v) * dt;
    partie.ecart -= pression * dt;
    if (partie.choc <= 0) partie.ecart += P.recuperation * dt;
    partie.ecart = Math.min(P.ecartMax, partie.ecart);

    if (partie.ecart <= 0) termine();
  }

  /* =========================================================
     Affichage
     ========================================================= */

  /* Le monde est dessiné par rapport à la ligne de sol, pas au haut du cadre
     (voir style.css) : une altitude de jeu se traduit donc en y − ySol,
     négatif vers le ciel. */
  const auSol = (y) => y - P.ySol;

  function dessine() {
    for (const c of couches) {
      const d = (partie.parcouru * c.facteur) % c.periode;
      c.el.style.transform = "translate3d(" + -d + "px,0,0)";
    }

    elGlinda.style.transform = "translate3d(" + P.xJoueur + "px," + auSol(glinda.y) + "px,0)";

    /* Boq est dessiné à un écart comprimé : à taille réelle il sortirait du
       cadre dès qu'on court bien, et on perdrait le seul indicateur qui
       compte. La jauge du tableau de bord dit la vérité chiffrée. */
    const xBoq = Math.max(-14, P.xJoueur - partie.ecart * P.ecartVisuel);
    const sautille = sobre ? 0 : Math.abs(Math.sin(partie.parcouru / 26)) * 6;
    elBoq.style.transform =
      "translate3d(" + xBoq + "px," + (auSol(P.ySol - P.joueurH) - sautille) + "px,0)";

    for (const o of objets) {
      o.el.style.transform =
        "translate3d(" + (o.x - partie.parcouru) + "px," + auSol(o.ecranY) + "px,0)";
    }

    scene.classList.toggle("run-secoue", partie.secousse > 0 && !sobre);
    scene.classList.toggle("run-danger", partie.ecart < P.ecartMax * 0.2);
  }

  /* =========================================================
     Tableau de bord
     ========================================================= */

  const affiche = {};
  function ecrit(id, valeur) {
    if (affiche[id] === valeur) return;
    affiche[id] = valeur;
    $(id).textContent = valeur;
  }

  function metres() {
    return Math.floor(partie.parcouru / P.pxParMetre);
  }

  function score() {
    return metres() + partie.pompons * P.pomponPoints;
  }

  function majTableau() {
    const p = progressionA(partie.parcouru + P.xJoueur);
    ecrit("#run-distance", metres().toLocaleString("fr-FR") + " m");
    ecrit("#run-score", score().toLocaleString("fr-FR"));
    ecrit("#run-record", record ? record.toLocaleString("fr-FR") + " pts" : "—");
    ecrit("#run-pompons", String(partie.pompons));
    ecrit(
      "#run-allure",
      "×" + (vitesseA(partie.parcouru + P.xJoueur) / P.vMin).toFixed(1).replace(".", ",")
    );

    const part = Math.max(0, Math.min(1, partie.ecart / P.ecartMax));
    const barre = $("#run-jauge-barre");
    barre.style.width = (part * 100).toFixed(1) + "%";
    barre.parentElement.classList.toggle("run-jauge-rouge", part < 0.2);

    for (const a of ALERTES) {
      if (part > a.seuil) {
        ecrit("#run-alerte", a.texte);
        break;
      }
    }
    /* La progression sert aussi de repère au décor : le ciel se charge à
       mesure qu'on s'éloigne du campus. */
    scene.dataset.ambiance = p < 0.35 ? "jour" : p < 0.7 ? "couchant" : "nuit";
  }

  function annonce(texte) {
    if (annonceur) annonceur.textContent = texte;
  }

  /* =========================================================
     Écrans
     ========================================================= */

  function ecranTitre() {
    partie.enCours = false;
    ecran.className = "run-ecran run-visible";
    ecran.innerHTML =
      '<div class="run-boite">' +
      '<h2 class="run-titre">Il t\'a vue.</h2>' +
      '<p class="run-ligne">Boq traverse le parvis en agitant son téléphone. ' +
      "Tu as trois ans de pyramides humaines dans les jambes : <b>cours</b>.</p>" +
      '<ul class="run-consignes">' +
      "<li><b>Espace</b> / <b>↑</b> — sauter (relâche tôt pour sauter court)</li>" +
      "<li><b>↓</b> maintenu — glisser sous les banderoles</li>" +
      "<li>Un pompon attrapé en l'air, et Boq perd du terrain</li>" +
      "</ul>" +
      '<p class="run-ligne run-petit">Ça va de plus en plus vite.</p>' +
      '<button type="button" class="fun-btn primary" id="run-partir">Cours !</button>' +
      "</div>";
    const b = $("#run-partir");
    b.addEventListener("click", commence);
  }

  function termine() {
    if (partie.fini) return;
    partie.fini = true;
    partie.enCours = false;
    partie.ecart = 0;

    const points = score();
    const bat = points > record;
    if (bat) record = points;
    majTableau();

    const replique = REPLIQUES_BOQ[Math.floor(Math.random() * REPLIQUES_BOQ.length)];
    ecran.className = "run-ecran run-visible";
    ecran.innerHTML =
      '<div class="run-boite">' +
      '<h2 class="run-titre">Boq t\'a rattrapée.</h2>' +
      '<p class="run-replique">' + replique + "</p>" +
      '<p class="run-ligne">Tu as tenu <b>' + metres().toLocaleString("fr-FR") + " m</b>" +
      (partie.pompons
        ? " en ramassant <b>" + partie.pompons + "</b> pompon" + (partie.pompons > 1 ? "s" : "")
        : "") +
      ".<br />Score : <b>" + points.toLocaleString("fr-FR") + "</b>" +
      (bat
        ? ' — <span class="run-record">nouveau record de la session !</span>'
        : " · record : <b>" + record.toLocaleString("fr-FR") + "</b>") +
      "</p>" +
      '<button type="button" class="fun-btn primary" id="run-rejouer">Repartir</button>' +
      "</div>";

    const b = $("#run-rejouer");
    b.addEventListener("click", commence);
    /* Le joueur avait les mains sur le clavier : on lui rend le focus là où
       il en a besoin, sans faire sauter la page. */
    b.focus({ preventScroll: true });
    annonce(
      "Boq t'a rattrapée après " + metres() + " mètres. Score " + points +
        (bat ? ", nouveau record." : ".")
    );
  }

  /* =========================================================
     Commandes
     ========================================================= */

  const SAUTER = ["Space", "ArrowUp", "KeyW", "KeyZ"];
  const GLISSER = ["ArrowDown", "KeyS"];

  /* Une page de portail est pleine de boutons et d'un champ de recherche :
     tant que le doigt du joueur est sur l'un d'eux, le jeu ne lui vole ni
     l'Espace ni les flèches. */
  function dansLaCoque(e) {
    const cible = e.target;
    return !!(cible && cible.closest && cible.closest("button, a, input, select, textarea"));
  }

  document.addEventListener("keydown", (e) => {
    if (dansLaCoque(e)) return;
    if (SAUTER.includes(e.code)) {
      e.preventDefault();
      touches.saut = true;
      if (partie.enCours) {
        memoire.saut = P.memoireSaut;
      } else {
        /* Hors partie, la même touche lance la course : on ne demande pas au
           joueur d'aller chercher un bouton à la souris pour recommencer. */
        const b = ecran.querySelector("button");
        if (b) b.click();
      }
    }
    if (GLISSER.includes(e.code)) {
      e.preventDefault();
      touches.bas = true;
      if (partie.enCours) memoire.glisse = P.memoireGlisse;
    }
  });

  document.addEventListener("keyup", (e) => {
    if (SAUTER.includes(e.code)) {
      touches.saut = false;
      /* Relâcher tôt écourte le saut : c'est ce qui rend le saut dosable, et
         donc ce qui permet d'enchaîner deux obstacles rapprochés. */
      if (glinda.vy < -P.sautCourt) glinda.vy = -P.sautCourt;
    }
    if (GLISSER.includes(e.code)) touches.bas = false;
  });

  /* Au doigt : deux grandes moitiés sous la scène. Une flèche de 30 px ne se
     vise pas en courant. */
  function brancheTactile() {
    [
      ["#run-tact-saut", "saut"],
      ["#run-tact-glisse", "bas"],
    ].forEach(([sel, nom]) => {
      const el = $(sel);
      if (!el) return;
      const on = (e) => {
        e.preventDefault();
        touches[nom] = true;
        el.classList.add("run-appuye");
        if (!partie.enCours) {
          const b = ecran.querySelector("button");
          if (b) b.click();
          return;
        }
        if (nom === "saut") memoire.saut = P.memoireSaut;
        else memoire.glisse = P.memoireGlisse;
      };
      const off = () => {
        touches[nom] = false;
        el.classList.remove("run-appuye");
        if (nom === "saut" && glinda.vy < -P.sautCourt) glinda.vy = -P.sautCourt;
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

  construitDecor();
  brancheTactile();
  /* Glinda et Boq sont dessinés dès le chargement : l'écran-titre est
     translucide, et une piste vide derrière lui ne dirait pas de quel jeu
     il s'agit. */
  poseGlinda("course");
  elBoq.innerHTML = persoSVG(BOQ);
  dessine();
  ecranTitre();
  majTableau();
})();
