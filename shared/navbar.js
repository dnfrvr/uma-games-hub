/* =========================================================
   Barre de navigation permanente du portail — composant partagé
   ---------------------------------------------------------
   Usage, sur le hub comme sur n'importe quelle page de jeu :

     <div id="navbar"></div>
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

  /**
   * Injecte la barre de navigation du portail.
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

    /* La barre est posée tout de suite avec sa marque et son lien Accueil :
       même si le manifest tarde ou échoue, la navigation de secours existe. */
    const barre = squelette(currentGameId);
    cible.innerHTML = "";
    cible.appendChild(barre.nav);

    return fetch(versRacine("games-manifest.json"))
      .then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then((jeux) => {
        jeux.forEach((jeu) => barre.liens.appendChild(onglet(jeu, currentGameId)));
        brancheHasard(barre.hasard, jeux);
        brancheRuban(barre.liens);
      })
      .catch((err) => {
        console.error("[navbar] manifest illisible :", err);
        barre.hasard.remove();
      });
  }

  function squelette(currentGameId) {
    const nav = document.createElement("nav");
    nav.className = "navbar";
    nav.setAttribute("aria-label", "Navigation du portail");

    const marque = document.createElement("a");
    marque.className = "navbar-marque";
    marque.href = versRacine("index.html");
    marque.innerHTML = '<span aria-hidden="true">★</span> UMA GAMES <span aria-hidden="true">★</span>';

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
    return { nav, liens, hasard };
  }

  function onglet(jeu, currentGameId) {
    const dispo = jeu.statut === "disponible" && jeu.url;

    /* Jouable = lien, à venir = simple <span> : rien à neutraliser au clic. */
    const el = document.createElement(dispo ? "a" : "span");
    el.className =
      "navbar-lien" +
      (dispo ? "" : " bientot") +
      (jeu.id === currentGameId ? " actif" : "");
    el.style.setProperty("--accent", jeu.couleur);
    if (dispo) {
      el.href = versRacine(jeu.url);
    } else {
      el.setAttribute("aria-disabled", "true");
      el.title = "Bientôt disponible";
    }
    el.textContent = jeu.titre;
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

    /* Dès que la visiteuse fait glisser le ruban elle-même, on ne le recadre
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
