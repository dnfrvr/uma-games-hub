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
