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

  pull: {
    cadre: "112 144 176 210",
    dessin: (c) => `
      ${miroir(`<path d="M150 166 L124 188 Q116 262 126 338 L152 338 Q146 258 158 216 L158 322 L200 322 L200 158 Q172 158 150 166 Z" fill="${c}" ${contour()}/>`)}
      <rect x="176" y="148" width="48" height="22" rx="10" fill="${c}" ${contour(3)}/>
      ${miroir(`<path d="M128 326 q12 5 22 2" fill="none" stroke="${OMBRE}" stroke-width="5"/>`)}
      <path d="M158 310 h84" stroke="${OMBRE}" stroke-width="4" fill="none"/>`,
  },

  debardeur: {
    cadre: "150 148 100 168",
    dessin: (c) => `
      ${miroir(`<path d="M172 158 L162 174 L158 306 L200 306 L200 186 Q184 186 179 172 L177 158 Z" fill="${c}" ${contour()}/>`)}
      <path d="M179 172 q21 18 42 0" fill="none" stroke="${OMBRE}" stroke-width="5"/>
      <path d="M158 296 h84" stroke="${OMBRE}" stroke-width="3" fill="none"/>`,
  },

  /* --------------------------------------------- veste/manteau */
  veste: {
    cadre: "116 150 168 200",
    dessin: (c) => `
      ${miroir(`<path d="M150 168 L122 190 L130 338 L160 338 L152 208 Z" fill="${c}" ${contour()}/>`)}
      ${miroir(`<path d="M152 166 Q176 156 196 158 L188 200 L180 320 L142 320 L138 190 Z" fill="${c}" ${contour()}/>`)}
      ${miroir(`<path d="M196 158 L200 200 L184 204 Z" fill="${LUEUR}" ${contour(3)}/>`)}`,
  },

  /* Sans manches : le col fourrure (LUEUR) sert de doublure. */
  gilet: {
    cadre: "132 146 136 200",
    dessin: (c) => `
      ${miroir(`<path d="M152 166 Q176 156 196 158 L188 200 L182 336 L142 336 L138 190 Z" fill="${c}" ${contour()}/>`)}
      ${miroir(`<path d="M152 162 Q174 150 196 154 L196 174 Q174 170 158 182 Z" fill="${LUEUR}" ${contour(3)}/>`)}
      <path d="M200 172 V332" stroke="${OMBRE}" stroke-width="4" fill="none"/>`,
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

  /* Coupe large, bandes latérales et bas de jambe resserré. */
  jogging: {
    cadre: "134 280 132 292",
    dessin: (c) => `
      <path d="M150 302 L250 302 L256 356 L242 552 L204 552 L200 400 L196 552 L158 552 L144 356 Z" fill="${c}" ${contour()}/>
      <rect x="150" y="284" width="100" height="24" rx="9" fill="${c}" ${contour()}/>
      ${miroir(`<path d="M158 320 L168 544" fill="none" stroke="#ffffff" stroke-width="6"/>`)}
      ${miroir(`<path d="M158 534 h40" fill="none" stroke="${OMBRE}" stroke-width="5"/>`)}`,
  },

  /* S'arrête à mi-mollet : de quoi bien exposer les chaussettes. */
  pantacourt: {
    cadre: "140 280 120 240",
    dessin: (c) => `
      <path d="M154 302 L246 302 L250 354 L240 502 L206 502 L200 402 L194 502 L160 502 L150 354 Z" fill="${c}" ${contour()}/>
      <rect x="154" y="288" width="92" height="20" rx="5" fill="${c}" ${contour()}/>
      ${miroir(`<path d="M162 490 h38" fill="none" stroke="${OMBRE}" stroke-width="4"/>`)}
      <path d="M200 402 V330" stroke="${OMBRE}" stroke-width="3" fill="none"/>`,
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

  /* Montantes jusqu'au mollet : le seul modèle qui remonte plus haut
     que le bas de jambe du pantacourt, exprès. */
  bottes: {
    cadre: "138 466 124 120",
    dessin: (c) => `
      ${miroir(`<path d="M162 476 h36 v100 h-50 q-6 0 -6 -8 v-10 q0 -8 8 -10 l12 -4 z" fill="${c}" ${contour()}/>`)}
      ${miroir(`<path d="M160 476 h40 v16 h-40 z" fill="${LUEUR}" ${contour(3)}/>`)}
      ${miroir(`<path d="M144 566 h54" fill="none" stroke="${TRAIT_SVG}" stroke-width="5"/>`)}`,
  },

  chaussons: {
    cadre: "144 522 112 64",
    dessin: (c) => `
      ${miroir(`<circle cx="162" cy="538" r="9" fill="${c}" ${contour(3)}/><circle cx="192" cy="538" r="9" fill="${c}" ${contour(3)}/>`)}
      ${miroir(`<path d="M154 540 h36 q9 0 9 10 v18 q0 10 -10 10 h-35 q-10 0 -10 -10 v-18 q0 -10 10 -10 z" fill="${c}" ${contour()}/>`)}
      ${miroir(`<g fill="${TRAIT_SVG}"><circle cx="166" cy="556" r="3.5"/><circle cx="184" cy="556" r="3.5"/></g>
                <path d="M170 566 q5 5 10 0" fill="none" stroke="${TRAIT_SVG}" stroke-width="3"/>`)}`,
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

  banane: {
    cadre: "140 272 120 72",
    dessin: (c) => `
      <rect x="154" y="284" width="92" height="16" rx="6" fill="${c}" ${contour()}/>
      <path d="M164 298 h72 q12 0 12 13 v14 q0 13 -13 13 h-70 q-13 0 -13 -13 v-14 q0 -13 12 -13 z" fill="${c}" ${contour()}/>
      <path d="M162 318 h76" fill="none" stroke="${OMBRE}" stroke-width="4"/>
      <circle cx="232" cy="318" r="5" fill="${LUEUR}" ${contour(2)}/>`,
  },

  /* Deux sangles épaules→taille : c'est la seule pièce de « taille »
     qui se voit encore quand Drew ne porte pas de haut. */
  bretelles: {
    cadre: "146 152 108 164",
    dessin: (c) => `
      ${miroir(`<path d="M170 160 L186 296 L173 298 L157 166 Z" fill="${c}" ${contour(3)}/>`)}
      ${miroir(`<rect x="170" y="288" width="16" height="18" rx="4" fill="#ffd84d" ${contour(2)}/>`)}`,
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

  cravate: {
    cadre: "172 144 56 144",
    dessin: (c) => `
      <path d="M186 150 h28 l10 16 -24 14 -24 -14 z" fill="${c}" ${contour(3)}/>
      <path d="M190 180 h20 l9 74 -19 26 -19 -26 z" fill="${c}" ${contour(3)}/>
      <g fill="none" stroke="${OMBRE}" stroke-width="4"><path d="M191 210 h18M194 238 h14"/></g>`,
  },

  echarpe: {
    cadre: "152 138 96 152",
    dessin: (c) => `
      <path d="M168 148 q32 24 64 0 l6 24 q-38 26 -76 0 z" fill="${c}" ${contour()}/>
      <path d="M184 172 l-8 102 h28 l-5 -100 z" fill="${c}" ${contour(3)}/>
      <g fill="none" stroke="${OMBRE}" stroke-width="4"><path d="M178 206 h24M180 236 h24M182 266 h24"/></g>`,
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

  /* Les deux mèches de nuque descendent SOUS les épaules : c'est ce
     qui distingue le mulet d'une coupe au bol vue de face. */
  mulet: {
    cadre: "142 30 116 176",
    dessin: (c) => `
      ${miroir(`<path d="M160 88 q-14 62 -4 108 q19 -6 21 -31 q-9 -40 -3 -77 z" fill="${c}" ${contour()}/>`)}
      <path d="M158 104 L158 84 Q158 40 200 40 Q242 40 242 84 L242 104 L230 104 Q228 72 200 68 Q172 72 170 104 Z" fill="${c}" ${contour()}/>`,
  },

  /* Crânes rasés sur les côtés (le voile à 40 %) + l'arête, en pointes. */
  crete: {
    cadre: "156 6 88 118",
    dessin: (c) => `
      <path d="M168 112 Q168 66 200 60 Q232 66 232 112 L219 112 Q219 82 200 78 Q181 82 181 112 Z" fill="${c}" opacity=".4"/>
      <path d="M186 78 L180 14 L196 44 L200 8 L206 46 L220 16 L214 80 Z" fill="${c}" ${contour()}/>`,
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

  bob: {
    cadre: "140 34 120 82",
    dessin: (c) => `
      <path d="M166 92 Q164 44 200 44 Q236 44 234 92 Z" fill="${c}" ${contour()}/>
      <path d="M150 88 q50 20 100 0 q6 16 -6 21 q-44 13 -88 0 q-12 -5 -6 -21 z" fill="${c}" ${contour()}/>
      <path d="M168 90 h64" fill="none" stroke="${OMBRE}" stroke-width="4"/>`,
  },

  bonnet: {
    cadre: "150 12 100 96",
    dessin: (c) => `
      <circle cx="200" cy="28" r="14" fill="${LUEUR}" ${contour(3)}/>
      <path d="M160 82 Q160 40 200 40 Q240 40 240 82 Z" fill="${c}" ${contour()}/>
      <rect x="156" y="78" width="88" height="24" rx="9" fill="${c}" ${contour()}/>
      <path d="M160 90 h80" fill="none" stroke="${OMBRE}" stroke-width="3"/>`,
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

  /* Le tracé part de l'axe (x=200) et file vers la gauche : `miroir`
     recompose la seconde moitié sans raccord visible. */
  moustache: {
    cadre: "160 104 80 38",
    dessin: (c) =>
      miroir(`<path d="M200 112 q-11 -6 -23 -1 q-15 6 -13 15 q3 9 13 5 q13 -5 23 -13 z" fill="${c}" ${contour(3)}/>`),
  },

  lunettes_ski: {
    cadre: "142 74 116 46",
    dessin: (c) => `
      <path d="M158 86 q42 -11 84 0 q7 21 -6 26 q-36 9 -72 0 q-13 -5 -6 -26 z" fill="${c}" ${contour()}/>
      <path d="M168 92 q32 -7 64 0 q4 12 -4 15 q-28 6 -56 0 q-8 -3 -4 -15 z" fill="#8fd0ff" ${contour(2)}/>
      <g fill="none" stroke="${TRAIT_SVG}" stroke-width="6" stroke-linecap="round"><path d="M156 98 h-8M244 98 h8"/></g>`,
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
