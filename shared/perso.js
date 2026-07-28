/* =========================================================
   Fabrique de personnages — commune à tous les jeux du portail
   ---------------------------------------------------------
   Un seul générateur SVG paramétrique : gros contours sombres, aplats de
   couleur, grosse tête — la DA « dessin animé » du portail. Chaque jeu s'en
   sert pour ses propres personnages en changeant les options, ce qui évite
   d'avoir trois styles de dessin différents d'un jeu à l'autre.

   Tout est dessiné ici : aucune image externe, aucun asset tiers.

     persoSVG({
       peau: "#f6d3b0",
       cheveux: "boucle", couleurCheveux: "#4a2c17",
       haut: "#ff6b9d", bas: "#3a4a7a",
       regard: "face" | "gauche" | "droite" | "ferme",
       bouche: "sourire" | "neutre" | "bisou" | "o" | "sourire-large",
       accessoire: "lunettes" | "casquette" | "noeud" | "serretete" | null,
       couleurAccessoire: "#couleur",  // teinte du noeud / serre-tête
       pose: "debout" | "marche" | "accroupi" | "bras-leves"
             | "pompons-haut" | "pompons-gauche" | "pompons-droite" | "pompons-bas",
       jupe: "#couleur",        // ajoute une jupe par-dessus les jambes
       pompons: "#couleur",     // met un pompon dans chaque main
     })

   Renvoie une chaîne SVG (viewBox 0 0 48 72, pieds posés sur y = 72).
   ========================================================= */

const PERSO_TRAIT = "#2b1a2e";

/* Quelques nuances de peau et de cheveux, pour varier les castings sans
   avoir à choisir des codes couleur à la main dans chaque jeu. */
const PEAUX = ["#f8dcc0", "#f0c39a", "#d99a6c", "#a9683f", "#7a4a2b"];
const CHEVEUX_COULEURS = ["#2b1a2e", "#4a2c17", "#8a5a2b", "#c98a3a", "#e8b84b", "#b03a3a", "#6b4a8a"];

/* --- Coiffures : chacune est un chemin dessiné par-dessus le crâne --- */
const COIFFURES = {
  court: "M9 20c0-9 6-14 15-14s15 5 15 14c0-4-4-6-7-5-3-3-9-4-13-2-4 1-8 3-10 7z",
  boucle:
    "M10 20c-3-6 1-12 6-13 2-3 8-4 11-1 6 0 11 5 10 12 1 3 0 5-1 6 0-4-2-7-5-8 1 3 0 5-1 6-1-4-5-6-9-6s-8 2-9 6c-1-1-2-3-2-2z",
  long:
    "M9 20c0-9 6-14 15-14s15 5 15 14v22c-2 2-4 2-5 0V26c-2-3-5-4-10-4s-8 1-10 4v16c-1 2-3 2-5 0z",
  frange: "M9 21c0-9 6-15 15-15s15 6 15 15c-2-2-4-3-6-2-2-2-5-3-9-3s-9 1-12 3c-1-1-2 0-3 2z",
  queue:
    "M9 20c0-9 6-14 15-14s15 5 15 14c2 1 4 5 3 9-1 3-4 4-6 3 1-4 0-8-2-10-2-3-6-4-10-4s-8 1-10 4c-2 2-3 5-3 8-1-2-2-6-2-10z",
  chauve: "M11 19c1-7 6-11 13-11s12 4 13 11c-3-5-7-7-13-7s-10 2-13 7z",
  crete: "M9 22c0-6 3-10 7-12l2-6 3 5 3-6 3 6 3-5 2 6c4 2 7 6 7 12-3-5-9-8-15-8s-12 3-15 8z",
  couettes:
    "M9 20c0-9 6-14 15-14s15 5 15 14c-2-3-5-5-8-5-3-2-11-2-14 0-3 0-6 2-8 5z",
};

/* Petites boules pour les couettes, dessinées après la coiffure. */
const COIFFURE_EXTRAS = {
  couettes: (c) =>
    '<circle cx="7" cy="24" r="6" fill="' + c + '" stroke="' + PERSO_TRAIT + '" stroke-width="2.5"/>' +
    '<circle cx="41" cy="24" r="6" fill="' + c + '" stroke="' + PERSO_TRAIT + '" stroke-width="2.5"/>',
  queue: (c) =>
    '<path d="M39 25c6 2 9 8 7 14-3-1-4-3-4-6 0-3-1-6-3-8z" fill="' + c +
    '" stroke="' + PERSO_TRAIT + '" stroke-width="2.5" stroke-linejoin="round"/>',
};

function persoSVG(options) {
  const o = options || {};
  const peau = o.peau || PEAUX[0];
  const couleurCheveux = o.couleurCheveux || CHEVEUX_COULEURS[0];
  const haut = o.haut || "#ff6b9d";
  const bas = o.bas || "#3a4a7a";
  const regard = o.regard || "face";
  const bouche = o.bouche || "sourire";
  const pose = o.pose || "debout";

  // Décalage des pupilles : c'est ce qui donne la direction du regard.
  const oeil = { face: 0, gauche: -2.2, droite: 2.2, ferme: 0 }[regard] || 0;

  const jambes =
    pose === "accroupi"
      ? '<rect x="14" y="58" width="9" height="10" rx="4" fill="' + bas + '" stroke="' + PERSO_TRAIT + '" stroke-width="2.5"/>' +
        '<rect x="25" y="58" width="9" height="10" rx="4" fill="' + bas + '" stroke="' + PERSO_TRAIT + '" stroke-width="2.5"/>'
      : '<rect x="15" y="52" width="7" height="18" rx="3.5" fill="' + bas + '" stroke="' + PERSO_TRAIT + '" stroke-width="2.5"/>' +
        '<rect x="26" y="52" width="7" height="18" rx="3.5" fill="' + bas + '" stroke="' + PERSO_TRAIT + '" stroke-width="2.5"/>';

  /* Position des deux bras selon la pose. Chaque entrée donne, pour le bras
     gauche puis le bras droit : x, y et angle — le pompon (s'il y en a un)
     se pose au bout. */
  const BRAS = {
    debout: [[6, 36, 0], [35, 36, 0]],
    "bras-leves": [[4, 26, -35], [37, 26, 35]],
    "pompons-haut": [[6, 18, -18], [35, 18, 18]],
    "pompons-bas": [[4, 42, 22], [37, 42, -22]],
    "pompons-gauche": [[0, 28, -62], [30, 40, -18]],
    "pompons-droite": [[11, 40, 18], [41, 28, 62]],
  };
  const positionsBras = BRAS[pose] || BRAS.debout;

  const bras = positionsBras
    .map(
      (b) =>
        '<rect x="' + b[0] + '" y="' + b[1] + '" width="7" height="17" rx="3.5" transform="rotate(' +
        b[2] + " " + (b[0] + 3.5) + " " + (b[1] + 8.5) + ')" fill="' + peau +
        '" stroke="' + PERSO_TRAIT + '" stroke-width="2.5"/>'
    )
    .join("");

  /* Les pompons vivent au bout des bras : même rotation, donc ils suivent
     la pose sans calcul supplémentaire. */
  const pompons = o.pompons
    ? positionsBras
        .map((b) => {
          const cx = b[0] + 3.5;
          const cy = b[1] + 19;
          return (
            '<g transform="rotate(' + b[2] + " " + (b[0] + 3.5) + " " + (b[1] + 8.5) + ')">' +
            '<circle cx="' + cx + '" cy="' + cy + '" r="8" fill="' + o.pompons +
              '" stroke="' + PERSO_TRAIT + '" stroke-width="2.5"/>' +
            '<g stroke="' + PERSO_TRAIT + '" stroke-width="1.6" stroke-linecap="round">' +
              '<path d="M' + (cx - 6) + " " + (cy - 5) + "l-3-3M" + (cx + 6) + " " + (cy - 5) + "l3-3M" +
                (cx - 6) + " " + (cy + 5) + "l-3 3M" + (cx + 6) + " " + (cy + 5) + 'l3 3"/>' +
            "</g></g>"
          );
        })
        .join("")
    : "";

  /* Téléphone brandi devant soi, prêt à dégainer un snap. */
  const telephone = o.telephone
    ? '<g transform="rotate(-10 40 38)">' +
        '<rect x="34" y="28" width="12" height="18" rx="2.5" fill="#2b2b38" stroke="' + PERSO_TRAIT + '" stroke-width="2"/>' +
        '<rect x="36" y="30.5" width="8" height="13" rx="1" fill="#bfe6ff"/>' +
        '<circle cx="40" cy="45" r="1.1" fill="#8fa4c4"/>' +
      "</g>"
    : "";

  const jupe = o.jupe
    ? '<path d="M11 52h26l6 16H5z" fill="' + o.jupe + '" stroke="' + PERSO_TRAIT +
      '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M17 52l-3 16M24 52v16M31 52l3 16" stroke="' + PERSO_TRAIT + '" stroke-width="1.6" opacity=".55"/>'
    : "";

  const corpsY = pose === "accroupi" ? 40 : 36;

  return (
    '<svg viewBox="0 0 48 72" xmlns="http://www.w3.org/2000/svg" class="perso-svg">' +
      '<g stroke-linejoin="round">' +
        jambes +
        jupe +
        bras +
        // Torse
        '<rect x="12" y="' + corpsY + '" width="24" height="' + (pose === "accroupi" ? 20 : 22) +
          '" rx="8" fill="' + haut + '" stroke="' + PERSO_TRAIT + '" stroke-width="3"/>' +
        // Tête
        '<circle cx="24" cy="24" r="16" fill="' + peau + '" stroke="' + PERSO_TRAIT + '" stroke-width="3"/>' +
        // Oreilles
        '<circle cx="8.5" cy="25" r="3.5" fill="' + peau + '" stroke="' + PERSO_TRAIT + '" stroke-width="2.5"/>' +
        '<circle cx="39.5" cy="25" r="3.5" fill="' + peau + '" stroke="' + PERSO_TRAIT + '" stroke-width="2.5"/>' +
        yeux(regard, oeil) +
        boucheSVG(bouche) +
        // Cheveux par-dessus le crâne
        '<path d="' + (COIFFURES[o.cheveux] || COIFFURES.court) + '" fill="' + couleurCheveux +
          '" stroke="' + PERSO_TRAIT + '" stroke-width="2.5"/>' +
        (COIFFURE_EXTRAS[o.cheveux] ? COIFFURE_EXTRAS[o.cheveux](couleurCheveux) : "") +
        accessoireSVG(o.accessoire, couleurCheveux, o.couleurAccessoire) +
        pompons +
        telephone +
      "</g>" +
    "</svg>"
  );
}

/* =========================================================
   Spectateur de tribune : version allégée d'un personnage
   ---------------------------------------------------------
   Une foule, c'est des dizaines de silhouettes : on ne peut pas y mettre
   un personnage complet sans ramer. Ici, juste une tête, un corps et
   parfois une écharpe — assez pour lire « des gens », pas plus.
   ========================================================= */

function spectateurSVG(couleurHaut, couleurPeau, accessoire) {
  const peau = couleurPeau || PEAUX[Math.floor(Math.random() * PEAUX.length)];
  const echarpe =
    accessoire === "echarpe"
      ? '<path d="M8 26h16v5H8z" fill="#ffd84d" stroke="' + PERSO_TRAIT + '" stroke-width="2"/>'
      : accessoire === "panneau"
      ? '<rect x="18" y="2" width="14" height="11" rx="2" fill="#fff" stroke="' + PERSO_TRAIT + '" stroke-width="2"/>' +
        '<path d="M25 13v6" stroke="' + PERSO_TRAIT + '" stroke-width="2"/>'
      : "";

  return (
    '<svg viewBox="0 0 32 44" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="4" y="24" width="24" height="20" rx="8" fill="' + couleurHaut +
        '" stroke="' + PERSO_TRAIT + '" stroke-width="2.5"/>' +
      '<circle cx="16" cy="14" r="11" fill="' + peau + '" stroke="' + PERSO_TRAIT + '" stroke-width="2.5"/>' +
      '<circle cx="12" cy="14" r="1.8" fill="' + PERSO_TRAIT + '"/>' +
      '<circle cx="20" cy="14" r="1.8" fill="' + PERSO_TRAIT + '"/>' +
      '<path d="M13 19q3 3 6 0" fill="none" stroke="' + PERSO_TRAIT + '" stroke-width="2" stroke-linecap="round"/>' +
      echarpe +
    "</svg>"
  );
}

function yeux(regard, decalage) {
  if (regard === "ferme") {
    return (
      '<path d="M14 26q4 4 8 0" fill="none" stroke="' + PERSO_TRAIT + '" stroke-width="2.5" stroke-linecap="round"/>' +
      '<path d="M26 26q4 4 8 0" fill="none" stroke="' + PERSO_TRAIT + '" stroke-width="2.5" stroke-linecap="round"/>'
    );
  }
  return (
    '<ellipse cx="18" cy="26" rx="3.4" ry="4" fill="#fff" stroke="' + PERSO_TRAIT + '" stroke-width="2"/>' +
    '<ellipse cx="30" cy="26" rx="3.4" ry="4" fill="#fff" stroke="' + PERSO_TRAIT + '" stroke-width="2"/>' +
    '<circle cx="' + (18 + decalage) + '" cy="26.5" r="1.8" fill="' + PERSO_TRAIT + '"/>' +
    '<circle cx="' + (30 + decalage) + '" cy="26.5" r="1.8" fill="' + PERSO_TRAIT + '"/>'
  );
}

function boucheSVG(type) {
  const trait = 'fill="none" stroke="' + PERSO_TRAIT + '" stroke-width="2.2" stroke-linecap="round"';
  if (type === "bisou") {
    return '<path d="M21 34q3-3 6 0q-3 3-6 0z" fill="#e0446b" stroke="' + PERSO_TRAIT + '" stroke-width="2"/>';
  }
  if (type === "o") return '<ellipse cx="24" cy="34" rx="3" ry="3.6" fill="#8a2f4a" stroke="' + PERSO_TRAIT + '" stroke-width="2"/>';
  if (type === "neutre") return '<path d="M21 34h6" ' + trait + "/>";
  if (type === "sourire-large") {
    return '<path d="M18 32q6 7 12 0z" fill="#8a2f4a" stroke="' + PERSO_TRAIT + '" stroke-width="2"/>';
  }
  return '<path d="M20 33q4 4 8 0" ' + trait + "/>";
}

function accessoireSVG(type, couleurCheveux, couleurAccessoire) {
  if (!type) return "";

  if (type === "lunettes") {
    return (
      '<g fill="rgba(255,255,255,.55)" stroke="' + PERSO_TRAIT + '" stroke-width="2.5">' +
        '<rect x="12" y="21" width="11" height="10" rx="3"/>' +
        '<rect x="25" y="21" width="11" height="10" rx="3"/>' +
      "</g>" +
      '<path d="M23 26h2" stroke="' + PERSO_TRAIT + '" stroke-width="2.5"/>'
    );
  }

  if (type === "casquette") {
    return (
      '<path d="M8 20c0-9 7-15 16-15s16 6 16 15H8z" fill="#e0446b" stroke="' + PERSO_TRAIT + '" stroke-width="2.5"/>' +
      '<path d="M40 20c6 0 9 2 10 5H36z" fill="#c22f52" stroke="' + PERSO_TRAIT + '" stroke-width="2.5"/>'
    );
  }

  if (type === "noeud") {
    return (
      '<path d="M30 9c5-4 11-1 10 4-4 1-7 1-10 0 3 1 6 1 10 0 1 5-5 8-10 4z" fill="' +
      (couleurAccessoire || "#ff3d9a") + '" stroke="' + PERSO_TRAIT + '" stroke-width="2.5"/>'
    );
  }

  if (type === "serretete") {
    return (
      '<path d="M9 20a15 15 0 0 1 30 0" fill="none" stroke="' + PERSO_TRAIT + '" stroke-width="4"/>' +
      '<path d="M9 20a15 15 0 0 1 30 0" fill="none" stroke="' + (couleurAccessoire || "#ffd84d") + '" stroke-width="2"/>'
    );
  }

  return "";
}

/* Petit utilitaire : construit un élément DOM prêt à poser dans la scène. */
function persoElement(options, classe) {
  const el = document.createElement("div");
  el.className = "perso " + (classe || "");
  el.innerHTML = persoSVG(options);
  return el;
}
