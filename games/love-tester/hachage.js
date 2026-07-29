/* =========================================================
   Love Tester — le calcul, et rien que le calcul
   ---------------------------------------------------------
   Tout l'intérêt du gadget, c'est de RETESTER : on montre le verdict à un
   copain, on inverse les prénoms, on revient trois jours plus tard. Si le
   pourcentage bougeait, la blague tomberait à plat et la machine perdrait
   son autorité. D'où une règle unique, dont tout le reste découle :

     le même couple rend TOUJOURS le même résultat.

   « Le même couple » se lit très largement, parce que personne ne tape son
   prénom deux fois de la même façon :
     - la casse ne compte pas       (« DREW » = « drew »)
     - les accents non plus         (« Éloïse » = « eloise »)
     - ni les espaces et tirets     (« Jean-Luc » = « jeanluc »)
     - ni l'ordre                   (« Drew + Glinda » = « glinda + drew »)

   Ce fichier ne touche à aucun DOM : c'est ce qui permet au banc d'essai
   (test-hachage.js) de le charger sous Node et de vérifier ces promesses
   sans navigateur.
   ========================================================= */

(function (racine) {
  "use strict";

  /* --- 1. Réduire un prénom à sa forme la plus nue possible -------------- */

  /* Les signes diacritiques que NFD vient de détacher (bloc « Combining
     Diacritical Marks », U+0300 à U+036F). Construite par code plutôt
     qu'écrite en dur : un accent combinant nu dans un fichier source ne
     survit pas au premier copier-coller. */
  const MARQUES = new RegExp("[\\u0300-\\u036f]", "g");

  /**
   * Met un prénom sous forme canonique : minuscules, sans accent, sans
   * ponctuation. `normalize("NFD")` sépare la lettre de son accent, on jette
   * ensuite tous les signes diacritiques d'un coup — bien plus fiable qu'une
   * table « é → e » qu'on oublie toujours de compléter.
   * @param {string} prenom
   * @returns {string} chaîne de [a-z0-9], éventuellement vide
   */
  function normalise(prenom) {
    return String(prenom == null ? "" : prenom)
      .normalize("NFD")
      .replace(MARQUES, "")
      .toLowerCase()
      /* Les ligatures ne portent pas d'accent : NFD les laisse entières. */
      .replace(/œ/g, "oe")
      .replace(/æ/g, "ae")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]/g, "");
  }

  /**
   * La clé d'un couple. Les deux prénoms sont rangés par ordre alphabétique
   * AVANT d'être collés : c'est ce qui rend le résultat indifférent à l'ordre
   * de saisie, sans avoir à combiner deux hachages (un XOR ou une somme
   * seraient symétriques eux aussi, mais bien plus pauvres en mélange).
   * @returns {string|null} null si l'un des deux prénoms est vide
   */
  function cle(a, b) {
    const x = normalise(a);
    const y = normalise(b);
    if (!x || !y) return null;
    return x < y ? x + "+" + y : y + "+" + x;
  }

  /* --- 2. Le hachage ---------------------------------------------------- */

  /* FNV-1a 32 bits. `Math.imul` fait la multiplication entière sur 32 bits :
     sans lui, JavaScript passe en flottant et les bits de poids fort sont
     perdus — le hachage se met alors à coller aux dernières lettres. */
  function fnv1a(texte) {
    let h = 0x811c9dc5;
    for (let i = 0; i < texte.length; i++) {
      h ^= texte.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  /* FNV seul suffit à être déterministe, pas à être bien réparti : deux clés
     voisines (« drew+glinda » / « drew+glindb ») lui donnent des sorties
     voisines. Cette « avalanche » (le finaliseur de Murmur3, variante de
     Stafford) éparpille chaque bit sur tous les autres, ce qui est exactement
     ce qu'on veut avant un modulo : sinon les scores se tasseraient par
     paquets et deux prénoms proches donneraient le même verdict. */
  function avalanche(x) {
    x = (x ^ (x >>> 16)) >>> 0;
    x = Math.imul(x, 0x7feb352d) >>> 0;
    x = (x ^ (x >>> 15)) >>> 0;
    x = Math.imul(x, 0x846ca68b) >>> 0;
    return (x ^ (x >>> 16)) >>> 0;
  }

  function graine(texte) {
    return avalanche(fnv1a(texte));
  }

  /* --- 3. Ce que la machine sait rendre --------------------------------- */

  /**
   * Le pourcentage d'amour. 101 valeurs possibles, de 0 à 100 inclus —
   * le biais de modulo sur 2^32 est de l'ordre de 2 pour un milliard, donc
   * invisible même si on testait tous les prénoms du campus.
   * @returns {number|null} 0..100, ou null si un prénom manque
   */
  function score(a, b) {
    const k = cle(a, b);
    return k === null ? null : graine(k) % 101;
  }

  /**
   * Un tirage annexe, déterministe lui aussi : sous-scores, choix du verdict
   * parmi les variantes d'une tranche, tête du portrait d'un inconnu. Le
   * `sel` sépare les usages — sans lui, l'« alchimie » et la « complicité »
   * d'un couple seraient toujours le même nombre.
   * @param {string} cleOuTexte
   * @param {string} sel  étiquette de l'usage, ex. "alchimie"
   * @param {number} modulo
   */
  function tirage(cleOuTexte, sel, modulo) {
    /* Le « # » n est pas décoratif : sans séparateur, tirage("ab", "c") et
       tirage("a", "bc") tomberaient exactement sur la même valeur. */
    return graine(cleOuTexte + "#" + sel) % modulo;
  }

  /** Le même tirage, mais pour piocher dans un tableau. */
  function pioche(cleOuTexte, sel, tableau) {
    return tableau[tirage(cleOuTexte, sel, tableau.length)];
  }

  const api = { normalise, cle, score, tirage, pioche, graine };

  /* Utilisable des deux côtés : dans la page (global) et sous Node (banc
     d'essai). Aucun bundler, aucune dépendance — la règle du projet. */
  if (typeof module === "object" && module.exports) module.exports = api;
  else racine.loveHachage = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
