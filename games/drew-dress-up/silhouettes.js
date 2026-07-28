/* =========================================================
   Silhouettes : les placeholders dessinés.

   Chaque forme est tracée dans le cadre de référence 400×600,
   celui-là même que tes futurs PNG. Elles servent à deux choses :
   le calque affiché sur Drew, et la vignette de la garde-robe
   (même dessin, cadrage resserré via `cadre`).

   Un item du manifest choisit sa forme avec le champ `forme`.
   Dès qu'il a un `fichier`, c'est l'image qui gagne et la forme
   n'est plus utilisée — rien d'autre à changer.

   Repères du corps (à respecter si tu ajoutes une forme) :
     tête      cx 200, cy 98, rx 40, ry 48
     épaules   y 168, de x 150 à x 250
     taille    y 296, de x 162 à x 238
     hanches   y 296→352
     genoux    y 450          chevilles y 552
   ========================================================= */

const TRAIT_SVG = "#3b0a45";
const OMBRE = "rgba(0,0,0,.26)";
const LUEUR = "rgba(255,255,255,.35)";

const PEAU = "#f0c9a0";
const PEAU_OMBRE = "#dcae82";

// Duplique un tracé de gauche en miroir : garantit des paires symétriques.
function miroir(contenu) {
  return `${contenu}<g transform="matrix(-1,0,0,1,400,0)">${contenu}</g>`;
}

function contour(w = 4) {
  return `stroke="${TRAIT_SVG}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
}

const FORMES = {
  /* ---------------------------------------------------- corps */
  corps: {
    cadre: "140 40 120 200",
    dessin: () => `
      <g ${contour(3)} fill="${PEAU}">
        <path d="M166 330 L198 330 L193 554 L172 554 Z"/>
        <path d="M234 330 L202 330 L207 554 L228 554 Z"/>
        <path d="M158 288 L242 288 L246 352 L154 352 Z"/>
        <path d="M150 170 Q200 158 250 170 L238 300 L162 300 Z"/>
        <path d="M152 172 Q132 244 138 336 L158 336 Q152 246 168 180 Z"/>
        <path d="M248 172 Q268 244 262 336 L242 336 Q248 246 232 180 Z"/>
        <circle cx="148" cy="342" r="12"/><circle cx="252" cy="342" r="12"/>
        <ellipse cx="181" cy="562" rx="17" ry="10"/><ellipse cx="219" cy="562" rx="17" ry="10"/>
      </g>
      <rect x="188" y="128" width="24" height="46" fill="${PEAU_OMBRE}" ${contour(3)}/>
      <ellipse cx="200" cy="98" rx="40" ry="48" fill="${PEAU}" ${contour(3)}/>
      <circle cx="161" cy="102" r="8" fill="${PEAU}" ${contour(3)}/>
      <circle cx="239" cy="102" r="8" fill="${PEAU}" ${contour(3)}/>
      <g fill="#ff8ac4" opacity=".5"><circle cx="173" cy="112" r="8"/><circle cx="227" cy="112" r="8"/></g>
      <g fill="${TRAIT_SVG}"><ellipse cx="186" cy="98" rx="4.5" ry="6.5"/><ellipse cx="214" cy="98" rx="4.5" ry="6.5"/></g>
      <g fill="none" stroke="${TRAIT_SVG}" stroke-width="3" stroke-linecap="round">
        <path d="M178 83 q8 -6 16 -1"/><path d="M206 82 q8 -5 16 1"/><path d="M192 118 q8 7 16 0"/>
      </g>`,
  },

  /* ----------------------------------------------------- haut */
  tshirt: {
    cadre: "120 148 160 172",
    dessin: (c) => `
      ${miroir(`<path d="M150 170 L128 186 L142 238 L162 230 L160 306 L200 306 L200 162 Q172 162 150 170 Z" fill="${c}" ${contour()}/>`)}
      <path d="M182 164 q18 18 36 0" fill="none" stroke="${OMBRE}" stroke-width="6"/>
      <path d="M158 296 h84" stroke="${OMBRE}" stroke-width="3" fill="none"/>`,
  },

  chemise: {
    cadre: "120 148 160 200",
    dessin: (c) => `
      ${miroir(`<path d="M152 168 L128 188 L134 334 L162 334 L156 210 L160 306 L200 306 L200 160 Q174 160 152 168 Z" fill="${c}" ${contour()}/>`)}
      ${miroir(`<path d="M186 162 L200 176 L200 196 L180 176 Z" fill="${c}" ${contour(3)}/>`)}
      <path d="M200 176 V304" stroke="${OMBRE}" stroke-width="4" fill="none"/>
      <g fill="${LUEUR}"><circle cx="200" cy="204" r="4"/><circle cx="200" cy="240" r="4"/><circle cx="200" cy="276" r="4"/></g>`,
  },

  /* --------------------------------------------- veste/manteau */
  veste: {
    cadre: "116 150 168 200",
    dessin: (c) => `
      ${miroir(`<path d="M150 168 L122 190 L130 338 L160 338 L152 208 Z" fill="${c}" ${contour()}/>`)}
      ${miroir(`<path d="M152 166 Q176 156 196 158 L188 200 L180 320 L142 320 L138 190 Z" fill="${c}" ${contour()}/>`)}
      ${miroir(`<path d="M196 158 L200 200 L184 204 Z" fill="${LUEUR}" ${contour(3)}/>`)}`,
  },

  /* ------------------------------------------------------ bas */
  pantalon: {
    cadre: "140 282 120 290",
    dessin: (c) => `
      <path d="M154 302 L246 302 L250 354 L237 556 L206 556 L200 404 L194 556 L163 556 L150 354 Z" fill="${c}" ${contour()}/>
      <rect x="154" y="288" width="92" height="20" rx="5" fill="${c}" ${contour()}/>
      <path d="M200 404 V330" stroke="${OMBRE}" stroke-width="3" fill="none"/>`,
  },

  short: {
    cadre: "140 282 120 160",
    dessin: (c) => `
      <path d="M152 302 L248 302 L252 354 L244 430 L206 430 L200 396 L194 430 L156 430 L148 354 Z" fill="${c}" ${contour()}/>
      <rect x="154" y="288" width="92" height="20" rx="5" fill="${c}" ${contour()}/>
      <path d="M200 396 V330" stroke="${OMBRE}" stroke-width="3" fill="none"/>`,
  },

  jupe: {
    cadre: "128 282 144 140",
    dessin: (c) => `
      <path d="M158 300 L242 300 L264 412 L136 412 Z" fill="${c}" ${contour()}/>
      <rect x="154" y="288" width="92" height="18" rx="5" fill="${c}" ${contour()}/>
      <g stroke="${OMBRE}" stroke-width="3" fill="none"><path d="M178 306 L168 410M200 306 V410M222 306 L232 410"/></g>`,
  },

  /* ----------------------------------------------- chaussures */
  baskets: {
    cadre: "150 524 100 60",
    dessin: (c) => `
      ${miroir(`<path d="M166 530 h26 q7 0 7 8 v18 q0 7 7 9 v9 h-46 q-7 0 -7 -8 v-26 q0 -10 13 -10 z" fill="${c}" ${contour()}/>`)}
      ${miroir(`<path d="M153 566 h47 v10 h-47 q-4 0 -4 -5 t4 -5 z" fill="${LUEUR}" ${contour(3)}/>`)}`,
  },

  tongs: {
    cadre: "150 538 100 44",
    dessin: (c) => `
      ${miroir(`<path d="M162 552 h32 q6 0 6 7 v8 q0 7 -6 7 h-32 q-7 0 -7 -7 v-8 q0 -7 7 -7 z" fill="${c}" ${contour()}/>`)}
      ${miroir(`<g fill="none" stroke="${TRAIT_SVG}" stroke-width="4" stroke-linecap="round"><path d="M181 552 L170 566M181 552 L193 566"/></g>`)}`,
  },

  sandales: {
    cadre: "150 512 100 70",
    // la chaussette est le vrai sujet ici
    dessin: (c) => `
      ${miroir(`<path d="M170 516 h24 v42 h-28 v-38 q0 -4 4 -4 z" fill="#ffffff" ${contour(3)}/>`)}
      ${miroir(`<path d="M170 522 h24" stroke="#ff3d9a" stroke-width="4" fill="none"/>`)}
      ${miroir(`<path d="M160 556 h36 q6 0 6 7 v6 q0 7 -6 7 h-36 q-7 0 -7 -7 v-6 q0 -7 7 -7 z" fill="${c}" ${contour()}/>`)}
      ${miroir(`<g fill="none" stroke="${TRAIT_SVG}" stroke-width="4"><path d="M160 560 h36M164 568 h30"/></g>`)}`,
  },

  /* ---------------------------------------------------- caleçon */
  calecon: {
    cadre: "144 276 112 108",
    dessin: (c) => `
      <path d="M156 296 L244 296 L248 340 L238 374 L208 374 L200 352 L192 374 L162 374 L152 340 Z" fill="${c}" ${contour()}/>
      <rect x="154" y="282" width="92" height="18" rx="5" fill="${c}" ${contour()}/>
      <path d="M158 288 h84" stroke="${LUEUR}" stroke-width="4" fill="none"/>`,
  },

  slip: {
    cadre: "146 276 108 92",
    dessin: (c) => `
      <path d="M156 296 L244 296 L245 332 Q224 366 200 344 Q176 366 155 332 Z" fill="${c}" ${contour()}/>
      <rect x="154" y="282" width="92" height="18" rx="5" fill="${c}" ${contour()}/>
      <path d="M158 288 h84" stroke="${LUEUR}" stroke-width="4" fill="none"/>`,
  },

  /* -------------------------------------------------- ceinture */
  ceinture: {
    cadre: "146 276 108 44",
    dessin: (c) => `
      <rect x="154" y="286" width="92" height="20" rx="5" fill="${c}" ${contour()}/>
      <rect x="188" y="280" width="26" height="32" rx="5" fill="#ffd84d" ${contour()}/>
      <rect x="197" y="288" width="8" height="16" rx="3" fill="${c}"/>`,
  },

  /* ---------------------------------------------------- bijoux */
  collier: {
    cadre: "164 138 72 52",
    dessin: (c) => `
      <path d="M176 144 q24 34 48 0" fill="none" stroke="${c}" stroke-width="5"/>
      <g fill="${c}" ${contour(2)}>
        <circle cx="180" cy="150" r="6"/><circle cx="188" cy="160" r="6"/><circle cx="200" cy="165" r="6"/>
        <circle cx="212" cy="160" r="6"/><circle cx="220" cy="150" r="6"/>
      </g>
      <circle cx="200" cy="180" r="9" fill="${c}" ${contour(3)}/>`,
  },

  /* -------------------------------------------------- coiffure */
  bol: {
    cadre: "148 32 104 96",
    dessin: (c) => `
      <path d="M156 122 L156 86 Q156 40 200 40 Q244 40 244 86 L244 122 L230 122 L230 82 Q200 68 170 82 L170 122 Z"
            fill="${c}" ${contour()}/>`,
  },

  meche: {
    cadre: "148 32 104 80",
    dessin: (c) => `
      <path d="M158 96 Q158 42 200 40 Q242 38 246 88 Q236 60 208 58 Q186 82 158 96 Z" fill="${c}" ${contour()}/>
      <path d="M208 58 Q198 74 176 88" fill="none" stroke="${OMBRE}" stroke-width="4"/>`,
  },

  /* ---------------------------------------------------- chapeau */
  casquette: {
    cadre: "148 32 130 70",
    dessin: (c) => `
      <path d="M160 92 Q160 42 200 42 Q240 42 240 92 Z" fill="${c}" ${contour()}/>
      <path d="M238 88 q34 2 38 12 q-36 8 -78 4 z" fill="${c}" ${contour()}/>
      <circle cx="200" cy="46" r="6" fill="${LUEUR}" ${contour(2)}/>`,
  },

  casquette_envers: {
    cadre: "122 32 130 70",
    dessin: (c) => `
      <path d="M160 92 Q160 42 200 42 Q240 42 240 92 Z" fill="${c}" ${contour()}/>
      <path d="M162 88 q-34 2 -38 12 q36 8 78 4 z" fill="${c}" ${contour()}/>
      <circle cx="200" cy="46" r="6" fill="${LUEUR}" ${contour(2)}/>`,
  },

  /* ----------------------------------------------- visage extra */
  lunettes: {
    cadre: "150 78 100 38",
    dessin: (c) => `
      <g fill="${c}" ${contour(3)}>
        <rect x="166" y="86" width="28" height="22" rx="7"/>
        <rect x="206" y="86" width="28" height="22" rx="7"/>
      </g>
      <g fill="none" stroke="${TRAIT_SVG}" stroke-width="4" stroke-linecap="round">
        <path d="M194 94 h12M166 92 l-9 -3M234 92 l9 -3"/>
      </g>`,
  },
};

// Forme utilisée par défaut quand un item n'en précise pas.
const FORME_PAR_DEFAUT = {
  calecon: "calecon",
  haut: "tshirt",
  veste_manteau: "veste",
  bas: "pantalon",
  chaussures: "baskets",
  ceinture_accessoire_taille: "ceinture",
  bijoux: "collier",
  coiffure: "bol",
  chapeau_couvre_chef: "casquette",
  visage_extra: "lunettes",
};

/* Le corps de Drew : ton dessin s'il y en a un, sinon la silhouette.
   Dépose-le dans assets/body/ et lance `python declarer_assets.py` : il sera
   déclaré dans le manifest et repris ici sans rien changer au code. */
function urlCorps() {
  const declare = (manifest.body || []).find((b) => b.fichier);
  return declare ? declare.fichier : urlForme("corps");
}

/* URL d'une forme, prête pour <img src> comme pour drawImage.
   `vignette` resserre le cadrage sur la pièce seule. */
function urlForme(nom, couleur, vignette = false) {
  const forme = FORMES[nom];
  if (!forme) return "";
  const boite = vignette ? forme.cadre : "0 0 400 600";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${boite}">${forme.dessin(couleur)}</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.replace(/\s+/g, " ").trim());
}

// Image d'un item : son fichier s'il existe, sinon sa silhouette.
function urlItem(cat, item, vignette = false) {
  if (item.fichier && !vignette) return item.fichier;
  if (item.vignette && vignette) return item.vignette;
  if (item.fichier && vignette) return item.fichier;
  return urlForme(item.forme || FORME_PAR_DEFAUT[cat], item.couleurPlaceholder || "#bbb", vignette);
}
