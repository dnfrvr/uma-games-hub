/* =========================================================
   Le résolveur d'images — un PNG s'il existe, le SVG sinon
   ---------------------------------------------------------
   Tout le portail est dessiné en code (shared/perso.js et les fichiers de
   données de chaque jeu). Ce fichier est la charnière qui permet de remplacer
   ces dessins par de vraies images UNE PAR UNE, sans jamais casser un jeu à
   moitié converti : chaque point d'appel demande son dessin ici, et reçoit
   l'image si elle est disponible, le SVG d'origine sinon.

   C'est la méthode déjà employée pour la garde-robe et les décors de Drew
   (voir games/drew-dress-up/assets/decors/LISEZMOI.md), généralisée.

   ---------------------------------------------------------
   POURQUOI UN INDEX, ET POURQUOI EN .js
   ---------------------------------------------------------
   Le code doit savoir si `assets/personnages/drew.png` existe. Trois façons,
   une seule tient ici :

   - tenter l'image et retomber sur `onerror` : zéro configuration, mais un
     404 par dessin manquant, soit plus de deux cents dans la console tant que
     la production n'est pas finie. Déboguer autre chose devient impossible.
   - un champ à remplir à la main dans chaque fichier de données : explicite,
     mais c'est plus de deux cents éditions réparties dans onze fichiers.
   - un index, écrit par `node outils/scan-assets.js` après chaque lot déposé.
     C'est ce qu'on fait : déposer les fichiers, lancer une commande.

   L'index est un `.js` et non un `.json`, pour une raison qui compte : les
   jeux construisent leur DOM au démarrage, en injectant des chaînes SVG. Un
   `fetch` de JSON arriverait APRÈS ce premier rendu — il faudrait tout
   redessiner, et plusieurs jeux mesurent leur scène au démarrage (le cadrage
   de Drew notamment, cf. CLAUDE.md). Un `<script>` posé avant ceux du jeu est
   lu de façon synchrone : quand le jeu dessine, l'index est déjà là. Bonus :
   ça marche aussi en ouvrant le fichier sans serveur.

   L'index absent, vide ou périmé n'est JAMAIS une erreur : on retombe sur les
   SVG, c'est-à-dire sur ce que le site affiche aujourd'hui.
   ========================================================= */

(function () {
  "use strict";

  /* La racine du dépôt déduite de l'URL de ce script (qui vit dans shared/),
     pour que les chemins d'images marchent depuis n'importe quelle
     profondeur — une page de jeu est deux dossiers plus bas que le hub. */
  const SCRIPT_URL = document.currentScript ? document.currentScript.src : location.href;
  const RACINE = new URL("../", SCRIPT_URL).href;

  /* Posé par assets/index.js. Lu à CHAQUE appel et non capturé une fois au
     chargement : sinon l'ordre des deux `<script>` deviendrait un piège
     silencieux (index chargé après le résolveur = plus aucune image, sans
     erreur). Le coût est une lecture de propriété par dessin, ce qui n'est
     rien à côté de l'injection de HTML qui suit. */
  function index() {
    return (typeof window !== "undefined" && window.UMA_ASSETS) || {};
  }

  /**
   * Cherche un asset indexé.
   *
   * La clé est `famille/id`. Une CASCADE permet de commencer petit : un
   * personnage demandé en `personnages/eoghan-accroupi` accepte
   * `personnages/eoghan` s'il n'y a pas encore de pose accroupie. Autrement
   * dit un seul PNG par personnage suffit à voir le résultat partout, et on
   * affine pose par pose ensuite — sans quoi il faudrait livrer les quatre
   * états d'Eoghan avant d'en voir un seul à l'écran.
   *
   * @param {string} famille  "personnages", "creatures", "objets"…
   * @param {string} id       "drew", "eoghan-accroupi"…
   * @returns {{src:string, largeur:number, hauteur:number}|null}
   */
  function asset(famille, id) {
    if (!famille || !id) return null;

    const essais = [famille + "/" + id];
    /* « eoghan-accroupi » → on retentera « eoghan ». On coupe au dernier
       tiret, ce qui permet aussi « glinda-cheer-pose2 » → « glinda-cheer ». */
    let court = String(id);
    while (court.lastIndexOf("-") > 0) {
      court = court.slice(0, court.lastIndexOf("-"));
      essais.push(famille + "/" + court);
    }

    const dispo = index();
    for (const cle of essais) {
      const entree = dispo[cle];
      if (entree && entree.src) {
        return {
          src: new URL(entree.src, RACINE).href,
          largeur: entree.largeur || 0,
          hauteur: entree.hauteur || 0,
          /* Sans ça, un fichier livré en 2× s'affichait à 96 × 144 au lieu de
             48 × 72 : deux fois trop grand, et toutes les scènes fausses. */
          echelle: entree.echelle || 1,
        };
      }
    }
    return null;
  }

  /* Une image de jeu n'est pas du contenu : elle est décrite par le texte
     autour (le nom du personnage, la réplique). D'où l'alt vide par défaut,
     qui la fait ignorer par un lecteur d'écran au lieu de lui faire lire un
     nom de fichier. */
  function balise(trouve, options) {
    const o = options || {};
    const classe = o.classe ? ' class="' + echappe(o.classe) + '"' : "";
    const alt = ' alt="' + echappe(o.alt || "") + '"';
    /* Les dimensions évitent que la mise en page saute au chargement. Elles
       sont divisées par l'échelle : un PNG livré en 2× occupe la place du
       cadre logique, pas le double. */
    const e = echelle(trouve);
    const dim = trouve.largeur
      ? ' width="' + Math.round(trouve.largeur / e) + '" height="' + Math.round(trouve.hauteur / e) + '"'
      : "";
    return '<img src="' + echappe(trouve.src) + '"' + alt + classe + dim +
      ' draggable="false" decoding="async" />';
  }

  /* Un fichier livré en 2× (96 × 144 pour un cadre de 48 × 72) doit s'afficher
     à la taille du cadre. On déduit l'échelle du rapport à la taille attendue
     quand le scanner l'a notée, sinon on suppose 1. */
  function echelle(trouve) {
    return trouve.echelle && trouve.echelle > 0 ? trouve.echelle : 1;
  }

  function echappe(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/"/g, "&quot;")
      .replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /**
   * LA fonction que les jeux appellent. Rend l'image si elle est indexée,
   * sinon rend exactement ce qu'il rendait avant.
   *
   *   dessin.innerHTML = umaDessin("creatures", "ovni", DESSINS.ovni);
   *
   * @param {string} famille
   * @param {string} id
   * @param {string} svgDeSecours  le SVG existant, rendu tel quel si pas d'image
   * @param {{classe?:string, alt?:string}} [options]
   * @returns {string} du HTML prêt à injecter
   */
  function umaDessin(famille, id, svgDeSecours, options) {
    const trouve = asset(famille, id);
    return trouve ? balise(trouve, options) : (svgDeSecours || "");
  }

  /**
   * Variante pour ce qui n'est pas injecté en HTML mais posé en fond CSS
   * (les fonds de salle, les couches de décor). Rend une valeur utilisable
   * telle quelle dans `background-image`, ou null.
   */
  function umaFond(famille, id) {
    const trouve = asset(famille, id);
    return trouve ? 'url("' + trouve.src + '")' : null;
  }

  /* =========================================================
     Le cas du canvas
     ---------------------------------------------------------
     Derry Driver ne pose pas de HTML : il dessine sa route au pinceau 2D. On ne
     peut pas lui rendre une balise `img`, il lui faut un objet Image déjà
     chargé — `drawImage` sur une image non chargée ne dessine rien, sans
     erreur, et l'obstacle disparaîtrait une frame sur deux.

     D'où ce cache : le premier appel lance le chargement et rend `null` (le
     jeu dessine donc son tracé habituel), les appels suivants rendent l'image
     dès qu'elle est prête. Aucun scintillement, aucune attente, et le tracé
     d'origine reste le repli permanent.
     ========================================================= */
  const cacheCanvas = {};

  /**
   * Une image prête à passer à `drawImage`, ou `null`.
   * @returns {HTMLImageElement|null}
   */
  function umaImageCanvas(famille, id) {
    const cle = famille + "/" + id;
    if (Object.prototype.hasOwnProperty.call(cacheCanvas, cle)) {
      const entree = cacheCanvas[cle];
      return entree && entree.pret ? entree.img : null;
    }

    const trouve = asset(famille, id);
    if (!trouve || typeof Image === "undefined") {
      cacheCanvas[cle] = null;
      return null;
    }

    const entree = { img: new Image(), pret: false };
    entree.img.onload = () => { entree.pret = true; };
    /* Une image cassée ne doit pas être retentée à chaque frame. */
    entree.img.onerror = () => { cacheCanvas[cle] = null; };
    entree.img.src = trouve.src;
    cacheCanvas[cle] = entree;
    return null;
  }

  /**
   * La vignette d'un jeu, si elle a été dessinée. Rend `null` sinon, pour que
   * l'appelant garde le chemin de `games-manifest.json`.
   *
   * Elle a sa propre fonction parce qu'elle est demandée depuis QUATRE endroits
   * (la grille du hub, le jeu à la une, le classement, le rail « Tu aimeras
   * aussi ») plus la régie : sans ça, la même condition serait recopiée cinq
   * fois et l'une d'elles finirait par être oubliée.
   */
  function umaVignette(idJeu) {
    const trouve = asset("vignettes", idJeu);
    return trouve ? trouve.src : null;
  }

  /** Vrai si au moins un asset est indexé — pratique pour les bancs d'essai. */
  function umaAssetsCharges() {
    return Object.keys(index()).length > 0;
  }

  window.umaAsset = asset;
  window.umaDessin = umaDessin;
  window.umaFond = umaFond;
  window.umaVignette = umaVignette;
  window.umaImageCanvas = umaImageCanvas;
  window.umaAssetsCharges = umaAssetsCharges;

  /* Pour les bancs d'essai Node, qui chargent ce fichier dans un contexte vm. */
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      asset, umaDessin, umaFond, umaVignette, umaImageCanvas, umaAssetsCharges,
    };
  }
})();
