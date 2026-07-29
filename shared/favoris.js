/* =========================================================
   Mes jeux favoris — petit magasin partagé
   ---------------------------------------------------------
   Le « ★ Ajouter à mes favoris » des portails de 2012, en vrai : la barre
   d'outils sous le jeu écrit, la barre de service et le hub lisent.

   À charger AVANT navbar.js et lecteur.js, sur toutes les pages :
     <script src="../../shared/favoris.js"></script>

   API : umaFavoris.liste() / .contient(id) / .bascule(id) / .surChangement(fn)
   ========================================================= */

(function () {
  "use strict";

  const CLE = "uma_favoris";

  /* Le stockage peut être refusé (navigation privée stricte). Dans ce cas les
     favoris vivent le temps de la page au lieu de faire planter le bouton. */
  let secours = [];

  function liste() {
    try {
      const brut = JSON.parse(localStorage.getItem(CLE));
      return Array.isArray(brut) ? brut : [];
    } catch (e) {
      return secours;
    }
  }

  function ecrit(ids) {
    secours = ids;
    try {
      localStorage.setItem(CLE, JSON.stringify(ids));
    } catch (e) {
      /* tant pis, on garde la copie en mémoire */
    }
    abonnes.forEach((fn) => fn(ids));
  }

  const abonnes = [];

  const umaFavoris = {
    liste: liste,
    contient: (id) => liste().indexOf(id) !== -1,
    /** Ajoute ou retire un jeu. @returns {boolean} vrai s'il est désormais favori */
    bascule: function (id) {
      const ids = liste();
      const i = ids.indexOf(id);
      if (i === -1) ids.push(id);
      else ids.splice(i, 1);
      ecrit(ids);
      return i === -1;
    },
    /** Rappelé à chaque changement, y compris depuis un autre onglet. */
    surChangement: function (fn) {
      abonnes.push(fn);
      return fn;
    },
    /**
     * Fabrique le bouton ★ d'un jeu, déjà branché et qui se tient à jour —
     * y compris si le même jeu est mis en favori depuis un autre onglet.
     * @param {string} id  id du jeu dans games-manifest.json
     * @param {string} [classe]  classe CSS du bouton
     */
    bouton: function (id, classe) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = classe || "bouton-favori";
      const maj = () => {
        const est = umaFavoris.contient(id);
        b.setAttribute("aria-pressed", String(est));
        b.textContent = est ? "★ Dans mes favoris" : "☆ Ajouter aux favoris";
      };
      b.addEventListener("click", () => umaFavoris.bascule(id));
      umaFavoris.surChangement(maj);
      maj();
      return b;
    },
  };

  window.addEventListener("storage", (e) => {
    if (e.key === CLE) abonnes.forEach((fn) => fn(liste()));
  });

  window.umaFavoris = umaFavoris;
})();
