/* =========================================================
   La régie publicitaire du portail
   ---------------------------------------------------------
   Un emplacement de 2012 ne montrait pas une image fixe : il tournait. Ce
   composant remplit un emplacement et fait défiler ses créations, en fondu.

   Deux sources, mélangées comme sur un vrai portail gratuit :
     - `pubs.json`      : les annonceurs d'Augusta (le Starbucks du campus,
                          le club d'échecs, les comptes des personnages…) ;
     - `games-manifest.json` : les réclames maison, une par jeu jouable —
                          l'autopromo que les portails glissaient entre deux
                          vraies bannières.

   Usage :
     <div class="pub pub-banniere" id="pub-haut"></div>
     <script src="../shared/pub.js"></script>
     <script>renderPubs([["pub-haut", "banniere"], ["pub-cote", "pave"]]);</script>

   Les deux emplacements d'une page ne montrent jamais la même création au
   même moment : chacun part à un endroit différent du même ordre tiré au sort.

   Une création n'est cliquable que si elle mène quelque part : les réclames
   maison sont des liens vers le jeu, les annonceurs d'Augusta sont du décor
   et n'ont pas d'URL — donc pas de lien mort.

   Quand de vraies images existeront, ajouter un champ `image` à l'entrée de
   `pubs.json` : le rendu l'affichera si elle est là, et retombera sinon sur la
   création dessinée en CSS ci-dessous. Même méthode que pour le reste de l'art.
   ========================================================= */

(function () {
  "use strict";

  const SCRIPT_URL = document.currentScript
    ? document.currentScript.src
    : location.href;
  const RACINE = new URL("../", SCRIPT_URL).href;
  const versRacine = (chemin) => new URL(chemin, RACINE).href;

  const DUREE_MS = 7000; // le rythme d'une régie d'époque

  /**
   * Remplit des emplacements publicitaires et fait tourner leurs créations.
   * @param {Array<[string, string]>} emplacements  paires [idElement, format]
   *        où format vaut "banniere" (728×90) ou "pave" (300×250)
   * @returns {Promise<void>}
   */
  function renderPubs(emplacements) {
    const hotes = emplacements
      .map(([id, format]) => ({ hote: document.getElementById(id), format }))
      .filter((e) => e.hote);
    if (!hotes.length) return Promise.resolve();

    return Promise.all([
      charge(versRacine("pubs.json"), []),
      charge(versRacine("games-manifest.json"), []),
    ]).then(([annonceurs, jeux]) => {
      const creations = annonceurs.concat(reclamesMaison(jeux));
      if (!creations.length) return;

      const ordre = melange(creations);
      hotes.forEach((e, i) => {
        /* Chaque emplacement démarre à un tiers de tour d'écart : deux pavés
           côte à côte ne montrent jamais la même chose. */
        const depart = Math.floor((ordre.length / hotes.length) * i);
        anime(e.hote, e.format, ordre, depart);
      });
    });
  }

  function charge(url, defaut) {
    return fetch(url)
      .then((r) => (r.ok ? r.json() : defaut))
      .catch(() => defaut);
  }

  /* Une réclame maison par jeu jouable, fabriquée depuis le manifest : rien
     n'est écrit en dur, ajouter un jeu ajoute sa pub. */
  function reclamesMaison(jeux) {
    const ACCROCHES = [
      "Tu n'as pas encore joué à",
      "Le jeu dont tout le monde parle",
      "Des milliers de joueurs sont déjà dessus",
      "Recommandé par la rédaction",
    ];
    return jeux
      .filter((j) => j.statut === "disponible" && j.url)
      .map((jeu, i) => ({
        id: "maison-" + jeu.id,
        maison: true,
        annonceur: "UMA Games",
        titre: jeu.titre,
        accroche: ACCROCHES[i % ACCROCHES.length],
        bouton: "Jouer gratuitement ▸",
        vignette: versRacine(jeu.vignette),
        couleur: jeu.couleur,
        url: versRacine(jeu.url),
      }));
  }

  /* Tirage sans biais (Fisher-Yates) : un `sort(() => Math.random() - .5)`
     ne mélange pas uniformément et laissait souvent la même pub en tête. */
  function melange(liste) {
    const t = liste.slice();
    for (let i = t.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [t[i], t[j]] = [t[j], t[i]];
    }
    return t;
  }

  function anime(hote, format, ordre, depart) {
    hote.innerHTML = "";

    const mention = document.createElement("span");
    hote.appendChild(mention);
    mention.className = "pub-mention";

    const scene = document.createElement("div");
    scene.className = "pub-scene";
    hote.appendChild(scene);

    let index = depart % ordre.length;
    const pose = (creation, avecFondu) => {
      const el = creation.maison ? reclameMaison(creation) : creationAugusta(creation);
      if (avecFondu) el.classList.add("pub-entre");
      scene.innerHTML = "";
      scene.appendChild(el);
      mention.textContent = creation.maison ? "Publicité — UMA Games" : "Publicité";
    };

    pose(ordre[index], false);
    if (ordre.length < 2) return;

    /* Une pub qui clignote toutes les 7 s est insupportable quand on a demandé
       moins d'animation : dans ce cas l'emplacement garde sa création. */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    setInterval(() => {
      /* Onglet en arrière-plan : inutile de faire tourner la régie. */
      if (document.hidden) return;
      index = (index + 1) % ordre.length;
      pose(ordre[index], true);
    }, DUREE_MS);
  }

  /* --- Une création d'annonceur : pas d'URL, donc pas de lien --- */
  function creationAugusta(pub) {
    const cadre = document.createElement("div");
    cadre.className = "pub-cadre pub-annonceur";
    cadre.style.setProperty("--pub-a", pub.couleur);
    cadre.style.setProperty("--pub-b", pub.couleur2 || pub.couleur);
    cadre.style.setProperty("--pub-encre", pub.encre || "#fff");

    const bloc = document.createElement("div");
    bloc.className = "pub-reclame";

    /* Le champ `image` n'existe pas encore : tant qu'il est absent, la marque
       est dessinée en CSS. Le jour où il arrive, il passe devant. */
    if (pub.image) {
      const img = document.createElement("img");
      img.className = "pub-vignette";
      img.src = versRacine(pub.image);
      img.alt = "";
      bloc.appendChild(img);
    } else {
      const marque = document.createElement("span");
      marque.className = "pub-glyphe";
      marque.setAttribute("aria-hidden", "true");
      marque.textContent = pub.glyphe || "★";
      bloc.appendChild(marque);
    }

    const texte = document.createElement("p");
    texte.className = "pub-accroche";

    const annonceur = document.createElement("span");
    annonceur.className = "pub-annonceur-nom";
    annonceur.textContent = pub.annonceur;

    const titre = document.createElement("strong");
    titre.textContent = pub.titre;

    const bouton = document.createElement("span");
    bouton.className = "pub-bouton";
    bouton.textContent = pub.bouton;

    texte.append(annonceur, titre, bouton);
    bloc.appendChild(texte);
    cadre.appendChild(bloc);
    return cadre;
  }

  /* --- Une réclame maison : elle, elle mène au jeu --- */
  function reclameMaison(pub) {
    const cadre = document.createElement("a");
    cadre.className = "pub-cadre";
    cadre.href = pub.url;

    const bloc = document.createElement("div");
    bloc.className = "pub-reclame";

    const img = document.createElement("img");
    img.className = "pub-vignette";
    img.src = pub.vignette;
    img.alt = "";
    img.loading = "lazy";

    const texte = document.createElement("p");
    texte.className = "pub-accroche";
    texte.append(document.createTextNode(pub.accroche + " "));

    const titre = document.createElement("strong");
    titre.textContent = pub.titre;

    const bouton = document.createElement("span");
    bouton.className = "pub-bouton";
    bouton.textContent = pub.bouton;

    texte.append(titre, bouton);
    bloc.append(img, texte);
    cadre.appendChild(bloc);
    return cadre;
  }

  window.renderPubs = renderPubs;
})();
