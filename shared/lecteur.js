/* =========================================================
   Le lecteur — l'habillage d'une page de jeu de portail
   ---------------------------------------------------------
   Sur les portails Flash de 2012, un jeu n'était jamais servi nu : il vivait
   dans un bezel, sous une barre de chargement et au-dessus d'une barre
   d'outils (note, favori, plein écran, recommencer), avec sa fiche en
   dessous. C'est cet habillage que ce composant remplit, à partir de
   games-manifest.json.

   Le squelette est en HTML dans chaque page — on n'enveloppe RIEN à l'exécution :
   déplacer le jeu dans le DOM après le chargement de ses scripts casserait les
   mesures que certains font au démarrage.

     <div class="colonne-jeu">
       <div id="fil-ariane"></div>
       <div class="lecteur">
         <div id="lecteur-chargement"></div>
         <div class="lecteur-scene"><div class="shell">…le jeu…</div></div>
         <div id="lecteur-outils"></div>
       </div>
       <div id="fiche-jeu"></div>
     </div>

     <script src="../../shared/favoris.js"></script>
     <script src="../../shared/lecteur.js"></script>
     <script>renderLecteur("drew");</script>
   ========================================================= */

(function () {
  "use strict";

  const SCRIPT_URL = document.currentScript
    ? document.currentScript.src
    : location.href;
  const RACINE = new URL("../", SCRIPT_URL).href;
  const versRacine = (chemin) => new URL(chemin, RACINE).href;

  const nombre = (n) => Number(n || 0).toLocaleString("fr-FR");
  const virgule = (n) => String(n).replace(".", ",");

  /**
   * Habille la page du jeu demandé.
   * @param {string} gameId  id du jeu dans games-manifest.json
   * @returns {Promise<void>}
   */
  function renderLecteur(gameId) {
    return fetch(versRacine("games-manifest.json"))
      .then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then((jeux) => {
        const jeu = jeux.filter((j) => j.id === gameId)[0];
        if (!jeu) throw new Error('jeu "' + gameId + '" absent du manifest');
        filAriane(jeu);
        chargement();
        outils(jeu);
        fiche(jeu);
      })
      .catch((err) => {
        /* Un manifest illisible ne doit jamais empêcher de jouer : on laisse
           simplement la page sans son habillage de portail. */
        console.error("[lecteur] habillage impossible :", err);
      });
  }

  /* --------------------------------------------------------- */

  function filAriane(jeu) {
    const hote = document.getElementById("fil-ariane");
    if (!hote) return;

    hote.className = "fil-ariane";
    hote.setAttribute("aria-label", "Fil d'Ariane");
    hote.innerHTML = "";

    const accueil = document.createElement("a");
    accueil.href = versRacine("index.html");
    accueil.textContent = "Accueil";

    const cat = document.createElement("a");
    cat.href = versRacine("index.html") + "?categorie=" + encodeURIComponent(jeu.categorie);
    cat.textContent = jeu.categorie;

    const ici = document.createElement("span");
    ici.className = "fil-actuel";
    ici.textContent = jeu.titre;

    hote.append(accueil, separateur(), cat, separateur(), ici);
  }

  function separateur() {
    const s = document.createElement("span");
    s.className = "fil-sep";
    s.textContent = "»";
    return s;
  }

  /* La barre de chargement est un décor : la page est déjà jouable quand elle
     s'affiche. Elle se remplit une fois puis annonce « prêt », et saute
     directement à la fin si le système demande moins d'animation. */
  function chargement() {
    const hote = document.getElementById("lecteur-chargement");
    if (!hote) return;

    hote.className = "lecteur-chargement";
    hote.innerHTML =
      "<span>Chargement</span>" +
      '<span class="lecteur-jauge"><span></span></span>' +
      '<span class="lecteur-etat">0 %</span>';

    const jauge = hote.querySelector(".lecteur-jauge span");
    const etat = hote.querySelector(".lecteur-etat");
    const sobre = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (sobre) {
      jauge.style.width = "100%";
      etat.textContent = "Prêt";
      return;
    }

    jauge.style.width = "0%";
    const depart = performance.now();
    const DUREE = 850;

    (function avance(t) {
      const part = Math.min(1, (t - depart) / DUREE);
      jauge.style.width = (part * 100).toFixed(0) + "%";
      etat.textContent = Math.round(part * 100) + " %";
      if (part < 1) requestAnimationFrame(avance);
      else etat.textContent = "Prêt";
    })(depart);
  }

  function outils(jeu) {
    const hote = document.getElementById("lecteur-outils");
    if (!hote) return;

    hote.className = "lecteur-outils";
    hote.innerHTML = "";

    /* La note, à gauche : c'est l'information que la barre porte d'abord. */
    const note = document.createElement("span");
    note.className = "notation";
    note.title = virgule(jeu.note) + " sur 10";
    note.innerHTML =
      '<span class="notation-etoiles"><i style="width:' +
      (jeu.note / 10) * 100 +
      '%"></i></span><span class="notation-chiffre">' +
      virgule(jeu.note) +
      '/10</span><span class="notation-votes">' +
      nombre(jeu.votes) +
      " votes</span>";

    const gauche = document.createElement("span");
    gauche.className = "outils-groupe";

    if (window.umaFavoris) gauche.appendChild(window.umaFavoris.bouton(jeu.id, "outil"));

    const scene = document.querySelector(".lecteur-scene");
    if (scene && scene.requestFullscreen) {
      gauche.appendChild(boutonPleinEcran(scene));
    }

    const recommencer = document.createElement("button");
    recommencer.type = "button";
    recommencer.className = "outil";
    recommencer.textContent = "⟳ Recommencer";
    recommencer.addEventListener("click", () => location.reload());
    gauche.appendChild(recommencer);

    const stats = document.createElement("span");
    stats.className = "outils-groupe a-droite outil-stat";
    stats.innerHTML =
      "<b>" + nombre(jeu.parties) + "</b> parties jouées · " + jeu.categorie;

    hote.append(note, gauche, stats);
  }

  function boutonPleinEcran(scene) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "outil";

    const maj = () => {
      const dedans = document.fullscreenElement === scene;
      b.textContent = dedans ? "⛶ Quitter le plein écran" : "⛶ Plein écran";
      b.setAttribute("aria-pressed", String(dedans));
    };

    b.addEventListener("click", () => {
      if (document.fullscreenElement === scene) document.exitFullscreen();
      else scene.requestFullscreen().catch((e) => console.warn("[lecteur]", e));
    });
    document.addEventListener("fullscreenchange", maj);
    maj();
    return b;
  }

  function fiche(jeu) {
    const hote = document.getElementById("fiche-jeu");
    if (!hote) return;

    hote.className = "bloc fiche-jeu";
    hote.innerHTML = "";

    const titre = document.createElement("h2");
    titre.className = "rubrique";
    titre.innerHTML =
      '<span class="rubrique-icone" aria-hidden="true">▤</span> À propos de ce jeu';
    const info = document.createElement("span");
    info.className = "rubrique-info";
    info.textContent = "ajouté le " + enDate(jeu.ajoute_le);
    titre.appendChild(info);

    const corps = document.createElement("div");
    corps.className = "fiche-corps";

    const desc = document.createElement("p");
    desc.className = "fiche-desc";
    desc.textContent = jeu.description;

    const dl = document.createElement("dl");
    dl.className = "fiche";
    [
      ["Personnage", jeu.perso],
      ["Catégorie", jeu.categorie],
      ["Contrôles", jeu.controles],
      ["Note", virgule(jeu.note) + "/10 sur " + nombre(jeu.votes) + " votes"],
    ].forEach(([cle, valeur]) => {
      const dt = document.createElement("dt");
      dt.textContent = cle;
      const dd = document.createElement("dd");
      dd.textContent = valeur;
      dl.append(dt, dd);
    });

    corps.append(desc, dl);
    hote.append(titre, corps);
  }

  const DATE_FR = { day: "numeric", month: "long", year: "numeric" };
  function enDate(iso) {
    const d = new Date(iso + "T12:00:00");
    return isNaN(d) ? iso : d.toLocaleDateString("fr-FR", DATE_FR);
  }

  window.renderLecteur = renderLecteur;
})();
