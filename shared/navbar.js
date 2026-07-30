/* =========================================================
   En-tête du portail — composant partagé
   ---------------------------------------------------------
   Rend la coque haute du site, identique sur le hub et sur les pages de jeu :

     barre de service (recherche, favoris)
     barre de navigation (marque, onglets, « Au hasard ! »)
     bandeau d'annonces déroulant

   Usage, inchangé :

     <div id="navbar"></div>
     <script src="../../shared/favoris.js"></script>
     <script src="../../shared/navbar.js"></script>
     <script>renderNavbar("drew", "navbar");</script>

   Passer null (ou rien) comme currentGameId sur le hub : aucun onglet de
   jeu n'est alors marqué actif, c'est « Accueil » qui l'est.
   ========================================================= */

(function () {
  "use strict";

  /* Les chemins du manifest sont relatifs à la racine du dépôt et la page
     appelante peut être à n'importe quelle profondeur : on déduit la racine
     de l'URL de ce script (qui vit dans shared/). */
  const SCRIPT_URL = document.currentScript
    ? document.currentScript.src
    : location.href;
  const RACINE = new URL("../", SCRIPT_URL).href;

  const versRacine = (chemin) => new URL(chemin, RACINE).href;
  const nombre = (n) => Number(n || 0).toLocaleString("fr-FR");

  /**
   * Injecte l'en-tête du portail.
   * @param {string|null} currentGameId  id du jeu affiché, null sur le hub
   * @param {string} targetElementId  id de l'élément conteneur
   * @returns {Promise<void>}
   */
  function renderNavbar(currentGameId, targetElementId) {
    const cible = document.getElementById(targetElementId);
    if (!cible) {
      console.warn('[navbar] élément "' + targetElementId + '" introuvable.');
      return Promise.resolve();
    }

    /* L'en-tête est posé tout de suite avec sa marque, sa recherche et son
       lien Accueil : même si le manifest tarde ou échoue, on garde une
       navigation de secours. */
    const barre = squelette(currentGameId);
    cible.innerHTML = "";
    cible.appendChild(barre.entete);

    return fetch(versRacine("games-manifest.json"))
      .then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then((jeux) => {
        remplitOnglets(barre.liens, jeux, currentGameId);
        brancheHasard(barre.hasard, jeux);
        brancheRuban(barre.liens);
        remplitSalut(barre.salut, jeux);
        remplitAnnonces(barre.annonces, jeux);
      })
      .catch((err) => {
        console.error("[navbar] manifest illisible :", err);
        barre.hasard.remove();
        barre.annonces.closest(".bandeau-annonces").remove();
      });
  }

  /* ---------------------------------------------------------
     La coque haute
     --------------------------------------------------------- */

  function squelette(currentGameId) {
    const entete = document.createElement("div");
    entete.className = "entete-site";

    const service = document.createElement("div");
    service.className = "barre-service";

    const salut = document.createElement("span");
    salut.className = "service-salut";
    salut.textContent = "Bienvenue sur UMA Games !";

    /* Un vrai formulaire GET : la recherche marche sans JS, elle arrive sur le
       hub avec ?q= et c'est le hub qui filtre sa grille. */
    const recherche = document.createElement("form");
    recherche.className = "service-recherche";
    recherche.setAttribute("role", "search");
    recherche.action = versRacine("index.html");
    recherche.method = "get";
    recherche.innerHTML =
      '<input class="service-champ" type="search" name="q" ' +
      'placeholder="Cherche un jeu…" aria-label="Chercher un jeu" />' +
      '<button class="service-loupe" type="submit">Chercher</button>';

    const liensService = document.createElement("span");
    liensService.className = "service-liens";

    const favoris = document.createElement("a");
    favoris.className = "service-lien";
    favoris.href = versRacine("index.html") + "?favoris=1";
    liensService.appendChild(favoris);
    brancheCompteurFavoris(favoris);

    const sep = document.createElement("span");
    sep.className = "service-sep";
    sep.textContent = "·";

    /* Classé pour que la coque puisse le retirer en écran étroit : à 360 px,
       « ★ Mes favoris (0) · Visiteur anonyme » ne tient pas à côté du champ de
       recherche (voir portail.css §9). */
    const compte = document.createElement("span");
    compte.className = "service-compte";
    compte.textContent = "Visiteur anonyme";

    liensService.append(sep, compte);
    service.append(salut, recherche, liensService);

    const nav = document.createElement("nav");
    nav.className = "navbar";
    nav.setAttribute("aria-label", "Navigation du portail");

    /* Le logo d'un portail, c'est un bloc marque + accroche, pas un mot posé
       dans la barre. C'est lui qui porte le nom du site maintenant que
       l'accueil n'a plus de grand titre décoratif au milieu de la page. */
    const marque = document.createElement("a");
    marque.className = "navbar-marque";
    marque.href = versRacine("index.html");
    marque.innerHTML =
      '<span class="marque-nom">' +
      '<span aria-hidden="true">★</span> UMA GAMES <span aria-hidden="true">★</span>' +
      "</span>" +
      '<span class="marque-slogan">Jeux gratuits en ligne</span>';

    const liens = document.createElement("div");
    liens.className = "navbar-liens";

    const accueil = document.createElement("a");
    accueil.className = "navbar-lien" + (currentGameId ? "" : " actif");
    accueil.href = versRacine("index.html");
    accueil.textContent = "🏠 Accueil";
    liens.appendChild(accueil);

    const hasard = document.createElement("button");
    hasard.type = "button";
    hasard.className = "navbar-hasard";
    hasard.textContent = "🎲 Au hasard !";

    nav.append(marque, liens, hasard);

    const bandeau = document.createElement("div");
    bandeau.className = "bandeau-annonces";
    const annonces = document.createElement("span");
    annonces.className = "bandeau-piste";
    bandeau.appendChild(annonces);

    entete.append(service, nav, bandeau);
    return { entete, nav, liens, hasard, salut, annonces };
  }

  /* Ce que le site a à annoncer se déduit du manifest — pas de chiffre écrit
     en dur qui mentirait dès qu'on ajoute un jeu. */
  function remplitSalut(salut, jeux) {
    const jouables = jeux.filter((j) => j.statut === "disponible" && j.url);
    const parties = jeux.reduce((t, j) => t + (j.parties || 0), 0);
    salut.innerHTML =
      "Bienvenue ! <b>" +
      jouables.length +
      "</b> jeux en ligne · <b>" +
      nombre(parties) +
      "</b> parties jouées";
  }

  /* Le ruban d'annonces d'un portail parle comme un portail : des sorties, un
     classement, un appel aux favoris. Il ne parle jamais de lui-même comme
     d'un site en construction — les jeux qui arrivent sont des « prochaines
     sorties », pas des « jeux pas finis ». */
  function remplitAnnonces(piste, jeux) {
    const jouables = jeux.filter((j) => j.statut === "disponible" && j.url);
    if (!jouables.length) return;
    const aVenir = jeux.filter((j) => j.statut !== "disponible" || !j.url);

    const recent = jouables
      .slice()
      .sort((a, b) => String(b.ajoute_le).localeCompare(String(a.ajoute_le)))[0];
    const mieuxNote = jouables
      .slice()
      .sort((a, b) => (b.note || 0) - (a.note || 0))[0];
    const plusJoue = jouables
      .slice()
      .sort((a, b) => (b.parties || 0) - (a.parties || 0))[0];

    const messages = [
      "<b>★ NOUVEAU ★</b> <em>" + recent.titre + "</em> est en ligne — soyez les premiers à y jouer !",
      "Le mieux noté du moment : <em>" +
        mieuxNote.titre +
        "</em>, " +
        String(mieuxNote.note).replace(".", ",") +
        "/10 sur " +
        nombre(mieuxNote.votes) +
        " votes.",
      "<em>" +
        plusJoue.titre +
        "</em> en tête du classement avec <b>" +
        nombre(plusJoue.parties) +
        "</b> parties.",
      "<b>" + jouables.length + " jeux gratuits</b>, sans inscription, directement dans votre navigateur.",
      "Ajoutez UMA Games à vos favoris (Ctrl+D) pour ne rien manquer des nouveautés !",
    ];

    if (aVenir.length) {
      messages.splice(
        3,
        0,
        "Prochainement sur UMA Games : <em>" +
          aVenir.map((j) => j.titre).join("</em>, <em>") +
          "</em>."
      );
    }

    /* Le ruban est doublé : quand la première copie sort à gauche, la seconde
       occupe déjà l'écran, donc pas de blanc au raccord. */
    const ruban = messages.join('<span class="bandeau-sep">◆</span>');
    piste.innerHTML = ruban + '<span class="bandeau-sep">◆</span>' + ruban;

    caleVitesseBandeau(piste);
  }

  /* Vitesse de défilé du bandeau, en pixels par seconde. Une durée fixe ne
     marche pas : l'animation parcourt la largeur du ruban, qui dépend de la
     largeur de l'écran ET du nombre de messages. À 26 s le bandeau filait à
     ~240 px/s sur un grand écran, illisible et fatigant. On fixe donc la
     vitesse et on en déduit la durée. */
  const BANDEAU_PX_PAR_SECONDE = 60;

  function caleVitesseBandeau(piste) {
    const cale = () => {
      /* `offsetWidth` inclut le `padding-left: 100%` — c'est bien la distance
         que parcourt la translation de -100 %. */
      const distance = piste.offsetWidth;
      if (!distance) return;
      piste.style.animationDuration =
        Math.round(distance / BANDEAU_PX_PAR_SECONDE) + "s";
    };

    cale();
    /* Les polices arrivent après le premier rendu et changent la largeur ;
       le redimensionnement de la fenêtre aussi. */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(cale);
    window.addEventListener("resize", cale);
  }

  function brancheCompteurFavoris(lien) {
    const maj = () => {
      const n = window.umaFavoris ? window.umaFavoris.liste().length : 0;
      lien.textContent = "★ Mes favoris (" + n + ")";
    };
    if (window.umaFavoris) window.umaFavoris.surChangement(maj);
    maj();
  }

  /* ---------------------------------------------------------
     Les onglets
     --------------------------------------------------------- */

  /* La barre liste les CATÉGORIES, pas les jeux. Un onglet par jeu tenait tant
     qu'il y en avait quatre ; à neuf le ruban devient un mur de pastilles où
     plus rien ne se lit. C'est aussi ce que faisaient les portails : leur
     navigation haute était thématique, et on tombait sur les jeux ensuite. */
  function remplitOnglets(liens, jeux, currentGameId) {
    const jeuCourant = jeux.filter((j) => j.id === currentGameId)[0];
    const filtreUrl = new URLSearchParams(location.search).get("categorie");

    /* La catégorie active, c'est celle du jeu ouvert, ou celle qu'on filtre
       sur l'accueil. Sinon aucune, et c'est « Accueil » qui reste allumé. */
    const active = jeuCourant ? jeuCourant.categorie : filtreUrl;
    if (active) {
      const accueil = liens.querySelector(".navbar-lien");
      if (accueil) accueil.classList.remove("actif");
    }

    const comptes = new Map();
    jeux.forEach((j) => {
      if (j.categorie) comptes.set(j.categorie, (comptes.get(j.categorie) || 0) + 1);
    });

    [...comptes.keys()]
      .sort((a, b) => a.localeCompare(b, "fr"))
      .forEach((nom) => liens.appendChild(onglet(nom, nom === active, jeuCourant)));
  }

  function onglet(categorie, estActive, jeuCourant) {
    const el = document.createElement("a");
    el.className = "navbar-lien" + (estActive ? " actif" : "");
    el.href = versRacine("index.html") + "?categorie=" + encodeURIComponent(categorie);
    el.textContent = categorie;
    /* Sur une page de jeu, l'onglet allumé prend la couleur du perso : la
       barre rappelle discrètement où l'on est. */
    if (estActive && jeuCourant) el.style.setProperty("--accent", jeuCourant.couleur);
    return el;
  }

  /* Sur téléphone le ruban d'onglets est plus large que l'écran. Deux détails
     qui changent tout, et qui demandent la position réelle du défilé — donc du
     JS, mais du JS facultatif : sans lui le ruban défile quand même.
       1. l'onglet de la page courante est amené sous les yeux, sinon on ne voit
          pas où on est quand on joue au dernier jeu de la liste ;
       2. les bords se fondent du côté où il reste des jeux (classes lues par
          navbar.css), pour que la pastille coupée se lise comme une invitation
          à faire glisser. */
  function brancheRuban(liens) {
    const majFondu = () => {
      const reste = liens.scrollWidth - liens.clientWidth;
      const marge = 2; // le défilé n'atteint pas toujours l'entier pile
      liens.classList.toggle("deborde-gauche", liens.scrollLeft > marge);
      liens.classList.toggle("deborde-droite", liens.scrollLeft < reste - marge);
    };

    /* `scrollIntoView` ferait aussi défiler la page verticalement : on ne
       touche qu'à l'axe du ruban. Le calcul passe par les rectangles et non par
       `offsetLeft` — l'offsetParent d'une pastille, c'est la barre (elle est
       `sticky`, donc positionnée), pas le ruban. */
    let mainMise = false;
    const centreActif = () => {
      const actif = liens.querySelector(".navbar-lien.actif");
      if (!actif || mainMise) return;
      const pastille = actif.getBoundingClientRect();
      const cadre = liens.getBoundingClientRect();
      liens.scrollLeft +=
        pastille.left - cadre.left - (cadre.width - pastille.width) / 2;
      majFondu();
    };

    liens.addEventListener("scroll", majFondu, { passive: true });
    window.addEventListener("resize", majFondu);
    if (window.ResizeObserver) new ResizeObserver(majFondu).observe(liens);

    /* Dès que le visiteur fait glisser le ruban lui-même, on ne le recadre
       plus dans son dos. */
    const laMain = () => { mainMise = true; };
    liens.addEventListener("pointerdown", laMain, { passive: true, once: true });
    liens.addEventListener("wheel", laMain, { passive: true, once: true });

    centreActif();
    /* Les polices arrivent après le premier rendu : les pastilles changent de
       largeur et le centrage calculé sur Times ne vaut plus rien. */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(centreActif);
    }
    majFondu();
  }

  /* Le bouton « Au hasard ! » d'époque : il n'envoie que vers un jeu
     réellement jouable, sinon il ne sert à rien et on le retire. */
  function brancheHasard(bouton, jeux) {
    const jouables = jeux.filter((j) => j.statut === "disponible" && j.url);
    if (!jouables.length) {
      bouton.remove();
      return;
    }
    bouton.addEventListener("click", () => {
      const tire = jouables[Math.floor(Math.random() * jouables.length)];
      location.href = versRacine(tire.url);
    });
  }

  window.renderNavbar = renderNavbar;
})();
