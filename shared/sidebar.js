/* =========================================================
   Sidebar « Tu aimeras aussi... » — composant partagé
   ---------------------------------------------------------
   Usage dans n'importe quelle page de jeu :

     <div id="sidebar-autres-jeux"></div>
     <script src="../../shared/sidebar.js"></script>
     <script>renderSidebar("drew", "sidebar-autres-jeux");</script>

   Ajouter/retirer un jeu du portail ne demande de toucher qu'un seul
   fichier : games-manifest.json.
   ========================================================= */

(function () {
  "use strict";

  /* Les chemins du manifest (`games/...`, `shared/vignettes/...`) sont relatifs
     à la RACINE du dépôt, alors que la page appelante peut être à n'importe
     quelle profondeur. On déduit donc la racine de l'URL de ce script lui-même
     (il vit dans shared/), ce qui évite de passer un préfixe à la main. */
  const SCRIPT_URL = document.currentScript
    ? document.currentScript.src
    : location.href;
  const RACINE = new URL("../", SCRIPT_URL).href;

  const versRacine = (chemin) => new URL(chemin, RACINE).href;

  /**
   * Injecte la liste des AUTRES jeux dans un élément de la page.
   * @param {string|null} currentGameId  id du jeu courant (exclu de la liste) ;
   *        null sur le hub, où l'on veut la liste complète
   * @param {string} targetElementId  id de l'élément conteneur
   * @param {{titre?: string, retour?: boolean}} [options]
   *        titre du bloc et présence du lien de retour au hub
   * @returns {Promise<void>}
   */
  function renderSidebar(currentGameId, targetElementId, options) {
    const cible = document.getElementById(targetElementId);
    if (!cible) {
      console.warn('[sidebar] élément "' + targetElementId + '" introuvable.');
      return Promise.resolve();
    }

    return fetch(versRacine("games-manifest.json"))
      .then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then((jeux) => {
        remplit(cible, jeux.filter((jeu) => jeu.id !== currentGameId), options || {});
      })
      .catch((err) => {
        /* Un manifest illisible ne doit jamais casser le jeu qui l'accueille :
           on n'affiche simplement pas la sidebar. */
        console.error("[sidebar] manifest illisible :", err);
        cible.innerHTML = "";
      });
  }

  function remplit(cible, jeux, options) {
    cible.innerHTML = "";

    const bloc = document.createElement("aside");
    bloc.className = "sidebar-autres";

    const titre = document.createElement("h2");
    titre.className = "sidebar-titre";
    titre.textContent = options.titre || "Tu aimeras aussi…";
    bloc.appendChild(titre);

    const liste = document.createElement("ul");
    liste.className = "sidebar-liste";
    jeux.forEach((jeu) => liste.appendChild(vignette(jeu)));
    bloc.appendChild(liste);

    /* Inutile sur le hub : on y est déjà. */
    if (options.retour !== false) {
      const retour = document.createElement("a");
      retour.className = "sidebar-retour";
      retour.href = versRacine("index.html");
      retour.textContent = "← Tous les jeux";
      bloc.appendChild(retour);
    }

    cible.appendChild(bloc);
  }

  function vignette(jeu) {
    const dispo = jeu.statut === "disponible" && jeu.url;

    const li = document.createElement("li");
    li.className = "sidebar-item" + (dispo ? "" : " bientot");
    li.style.setProperty("--accent", jeu.couleur);

    /* Disponible = vrai lien ; à venir = simple bloc, donc rien à neutraliser
       au clic ni à la navigation clavier. */
    const el = document.createElement(dispo ? "a" : "div");
    el.className = "sidebar-lien";
    if (dispo) {
      el.href = versRacine(jeu.url);
    } else {
      el.setAttribute("aria-disabled", "true");
    }

    const img = document.createElement("img");
    img.className = "sidebar-vignette";
    img.src = (window.umaVignette && umaVignette(jeu.id)) || versRacine(jeu.vignette);
    img.alt = "";
    img.loading = "lazy";

    const texte = document.createElement("span");
    texte.className = "sidebar-texte";

    const nom = document.createElement("span");
    nom.className = "sidebar-nom";
    nom.textContent = jeu.titre;
    texte.appendChild(nom);

    if (!dispo) {
      const badge = document.createElement("span");
      badge.className = "sidebar-badge";
      badge.textContent = "Bientôt";
      texte.appendChild(badge);
    } else if (jeu.categorie) {
      /* La catégorie sous le titre : c'est ce qui transforme une liste de
         liens en rail « jeux similaires » de portail. */
      const cat = document.createElement("span");
      cat.className = "sidebar-cat";
      cat.textContent = jeu.categorie;
      texte.appendChild(cat);
    }

    el.append(img, texte);
    li.appendChild(el);
    return li;
  }

  window.renderSidebar = renderSidebar;
})();
