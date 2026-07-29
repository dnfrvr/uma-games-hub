/* =========================================================
   Le pied de page du portail — composant partagé
   ---------------------------------------------------------
   UN SEUL pied de page pour tout le site, celui du portail. Les jeux avaient
   chacun le leur, avec son propre compteur de visites : ça faisait deux pieds
   de page empilés sur une page de jeu, et surtout autant de compteurs que de
   jeux, ce qui ne veut rien dire. Le compteur est celui du SITE, la même clé
   partout.

   Usage, sur n'importe quelle page :
     <div id="pied"></div>
     <script src="../../shared/sparkle.js"></script>
     <script src="../../shared/pied.js"></script>
     <script>renderPied("pied");</script>

   À appeler dans un script en fin de <body> : le rendu est synchrone, donc le
   compteur existe avant que sparkle.js ne le remplisse au DOMContentLoaded.
   ========================================================= */

(function () {
  "use strict";

  const SCRIPT_URL = document.currentScript
    ? document.currentScript.src
    : location.href;
  const RACINE = new URL("../", SCRIPT_URL).href;
  const versRacine = (chemin) => new URL(chemin, RACINE).href;

  /**
   * Injecte le pied de page du portail.
   * @param {string} targetElementId  id de l'élément conteneur
   */
  function renderPied(targetElementId) {
    const cible = document.getElementById(targetElementId);
    if (!cible) {
      console.warn('[pied] élément "' + targetElementId + '" introuvable.');
      return;
    }

    const accueil = versRacine("index.html");
    const pied = document.createElement("footer");
    pied.className = "pied-portail";
    pied.innerHTML =
      '<div class="pied-liens">' +
      '<a href="' + accueil + '">Accueil</a>' +
      '<span class="fil-sep">·</span>' +
      '<a href="' + accueil + '">Tous les jeux</a>' +
      '<span class="fil-sep">·</span>' +
      '<a href="' + accueil + '?favoris=1">Mes favoris</a>' +
      '<span class="fil-sep">·</span>' +
      '<a href="' + accueil + '" class="pied-hasard">Un jeu au hasard</a>' +
      "</div>" +
      '<p class="pied-mentions"><strong>© 2012 UMA GAMES</strong> — Tous droits réservés.</p>' +
      '<div class="footer-compteur">' +
      '<span class="counter-label">Tu es le visiteur n°</span>' +
      '<span id="counter" class="counter" aria-label="compteur de visites" ' +
      'data-cle="uma_visites" data-base="130370" data-chiffres="7"></span>' +
      "</div>" +
      '<div class="pied-badges" aria-hidden="true">' +
      '<span class="pied-badge badge-flash">Nécessite Flash Player 11</span>' +
      '<span class="pied-badge">★ Powered by le pouvoir de l\'amitier ★</span>' +
      "</div>";

    cible.innerHTML = "";
    cible.appendChild(pied);
    brancheHasard(pied.querySelector(".pied-hasard"));
  }

  /* Le lien « au hasard » n'envoie que vers un jeu réellement jouable. S'il ne
     peut pas le savoir (manifest illisible), il reste un lien vers l'accueil,
     ce qui est un repli honnête. */
  function brancheHasard(lien) {
    if (!lien) return;
    fetch(versRacine("games-manifest.json"))
      .then((r) => (r.ok ? r.json() : []))
      .then((jeux) => {
        const jouables = jeux.filter((j) => j.statut === "disponible" && j.url);
        if (!jouables.length) return;
        lien.addEventListener("click", (e) => {
          e.preventDefault();
          const tire = jouables[Math.floor(Math.random() * jouables.length)];
          location.href = versRacine(tire.url);
        });
      })
      .catch(() => {});
  }

  window.renderPied = renderPied;
})();
