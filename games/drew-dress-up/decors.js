/* =========================================================
   Décors : scènes affichées derrière Drew, à l'écran comme
   dans l'export PNG.

   REMPLACER UN DÉCOR PAR TA PROPRE IMAGE
   1. Dépose ton fichier dans assets/decors/ (PNG ou JPG).
   2. Renseigne `fichier` sur le décor concerné ci-dessous.
   Le SVG de secours reste là tant que `fichier` est vide : dès qu'il
   est rempli, c'est l'image qui est utilisée partout, sans rien changer
   d'autre. Format conseillé : 400×600 (ou tout ratio proche, l'image
   est cadrée en « cover » et centrée).
   ========================================================= */

const DECOR_W = 400;
const DECOR_H = 600;

function svg(contenu) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${DECOR_W}" height="${DECOR_H}" viewBox="0 0 ${DECOR_W} ${DECOR_H}">${contenu}</svg>`;
}

const DECORS = [
  {
    id: "decor_aucun",
    nom: "Fond rose",
    fichier: "",
    vignette: "#ffd3ef",
    svg: svg(`
      <defs><radialGradient id="g" cx="50%" cy="32%" r="75%">
        <stop offset="0" stop-color="#ffffff"/><stop offset="55%" stop-color="#fff0fa"/><stop offset="100%" stop-color="#ffd3ef"/>
      </radialGradient></defs>
      <rect width="400" height="600" fill="url(#g)"/>
      <g fill="#ffd84d" opacity=".55">
        <path d="M60 90l4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/>
        <path d="M330 160l4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/>
        <path d="M40 430l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/>
      </g>`),
  },
  {
    id: "decor_augusta",
    nom: "Université d'Augusta",
    fichier: "",
    vignette: "#b9553f",
    svg: svg(`
      <defs><linearGradient id="ciel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8fd0ff"/><stop offset="1" stop-color="#e7f6ff"/>
      </linearGradient></defs>
      <rect width="400" height="600" fill="url(#ciel)"/>
      <circle cx="330" cy="70" r="30" fill="#fff6c9"/>
      <g fill="#ffffff" opacity=".85">
        <ellipse cx="90" cy="90" rx="42" ry="20"/><ellipse cx="120" cy="82" rx="30" ry="16"/>
      </g>
      <g fill="#2f7a4d"><ellipse cx="30" cy="330" rx="46" ry="34"/><ellipse cx="372" cy="325" rx="48" ry="36"/></g>
      <!-- bâtiment en brique -->
      <rect x="52" y="168" width="296" height="212" fill="#b9553f"/>
      <rect x="52" y="168" width="296" height="16" fill="#8f3f2f"/>
      <polygon points="200,116 40,172 360,172" fill="#8f3f2f"/>
      <rect x="182" y="96" width="36" height="34" fill="#f0e2c8"/>
      <polygon points="200,72 176,100 224,100" fill="#7c3527"/>
      <g fill="#cfe8f5" stroke="#7c3527" stroke-width="3">
        <rect x="76" y="204" width="34" height="44"/><rect x="130" y="204" width="34" height="44"/>
        <rect x="236" y="204" width="34" height="44"/><rect x="290" y="204" width="34" height="44"/>
        <rect x="76" y="278" width="34" height="44"/><rect x="130" y="278" width="34" height="44"/>
        <rect x="236" y="278" width="34" height="44"/><rect x="290" y="278" width="34" height="44"/>
      </g>
      <rect x="176" y="266" width="48" height="114" fill="#7c3527"/>
      <rect x="184" y="276" width="32" height="104" fill="#c98f5a"/>
      <g fill="#f0e2c8"><rect x="164" y="252" width="10" height="128"/><rect x="226" y="252" width="10" height="128"/></g>
      <!-- pelouse -->
      <rect x="0" y="376" width="400" height="224" fill="#7ac36a"/>
      <path d="M0 376h400v22H0z" fill="#66ad57"/>
      <polygon points="150,600 250,600 226,398 174,398" fill="#d7c9a8"/>
      <g fill="#8fd47f" opacity=".8">
        <circle cx="46" cy="470" r="9"/><circle cx="352" cy="500" r="9"/><circle cx="90" cy="556" r="9"/><circle cx="318" cy="430" r="9"/>
      </g>`),
  },
  {
    id: "decor_dortoir",
    nom: "Le dortoir",
    fichier: "",
    vignette: "#f6b7d8",
    svg: svg(`
      <rect width="400" height="600" fill="#fbdcec"/>
      <g fill="#f6c7de"><rect x="0" y="0" width="26" height="470"/><rect x="52" y="0" width="26" height="470"/>
        <rect x="104" y="0" width="26" height="470"/><rect x="156" y="0" width="26" height="470"/>
        <rect x="208" y="0" width="26" height="470"/><rect x="260" y="0" width="26" height="470"/>
        <rect x="312" y="0" width="26" height="470"/><rect x="364" y="0" width="26" height="470"/></g>
      <!-- fenêtre -->
      <rect x="238" y="66" width="128" height="128" fill="#6fc5f0" stroke="#8a5a3b" stroke-width="8"/>
      <path d="M238 150h128v44H238z" fill="#4aa8db"/>
      <g stroke="#8a5a3b" stroke-width="6"><path d="M302 66v128M238 130h128"/></g>
      <!-- guirlande lumineuse -->
      <path d="M0 40q100 46 200 0t200 22" fill="none" stroke="#c98f5a" stroke-width="3"/>
      <g fill="#ffd84d"><circle cx="46" cy="56" r="7"/><circle cx="112" cy="66" r="7"/><circle cx="180" cy="62" r="7"/>
        <circle cx="248" cy="44" r="7"/><circle cx="316" cy="42" r="7"/><circle cx="378" cy="54" r="7"/></g>
      <!-- poster -->
      <rect x="46" y="92" width="118" height="140" fill="#fff" stroke="#3b0a45" stroke-width="5"/>
      <circle cx="105" cy="150" r="34" fill="#ff3d9a"/>
      <path d="M62 206h86v14H62z" fill="#9b4dff"/>
      <!-- lit superposé -->
      <g fill="#9b4dff"><rect x="36" y="300" width="14" height="270"/><rect x="330" y="300" width="14" height="270"/></g>
      <rect x="36" y="322" width="308" height="26" fill="#c9a3ff"/>
      <rect x="36" y="336" width="308" height="16" fill="#ff8ac4"/>
      <rect x="36" y="452" width="308" height="26" fill="#c9a3ff"/>
      <rect x="36" y="466" width="308" height="16" fill="#4de0ff"/>
      <rect x="52" y="300" width="70" height="30" rx="10" fill="#fff"/>
      <rect x="52" y="430" width="70" height="30" rx="10" fill="#fff"/>
      <!-- sol -->
      <rect x="0" y="470" width="400" height="130" fill="#c98f5a"/>
      <g stroke="#a97545" stroke-width="3"><path d="M0 502h400M0 536h400M0 570h400"/></g>
      <ellipse cx="200" cy="556" rx="120" ry="34" fill="#ff8ac4" opacity=".55"/>`),
  },
  {
    id: "decor_starbucks",
    nom: "Le Starbucks",
    fichier: "",
    vignette: "#1e6b4f",
    svg: svg(`
      <rect width="400" height="600" fill="#e8d3b8"/>
      <rect x="0" y="0" width="400" height="240" fill="#1e6b4f"/>
      <rect x="0" y="234" width="400" height="12" fill="#134a36"/>
      <!-- ardoise du menu -->
      <rect x="34" y="50" width="150" height="150" rx="6" fill="#2b2b2b" stroke="#8a5a3b" stroke-width="8"/>
      <g fill="#f3e6cf" opacity=".9">
        <rect x="52" y="74" width="96" height="7" rx="3"/><rect x="52" y="94" width="114" height="7" rx="3"/>
        <rect x="52" y="114" width="80" height="7" rx="3"/><rect x="52" y="134" width="104" height="7" rx="3"/>
        <rect x="52" y="154" width="66" height="7" rx="3"/></g>
      <!-- enseigne ronde -->
      <circle cx="300" cy="118" r="56" fill="#0f8a5f" stroke="#f3e6cf" stroke-width="8"/>
      <circle cx="300" cy="118" r="34" fill="#134a36"/>
      <path d="M286 104h28v10l-6 26h-16l-6-26z" fill="#f3e6cf"/>
      <!-- suspensions -->
      <g stroke="#2b2b2b" stroke-width="4"><path d="M110 0v34M240 0v22M356 0v46"/></g>
      <g fill="#ffd84d"><path d="M92 34h36l-8 22H100z"/><path d="M222 22h36l-8 22h-20z"/><path d="M338 46h36l-8 22h-20z"/></g>
      <!-- comptoir -->
      <rect x="0" y="380" width="400" height="40" fill="#8a5a3b"/>
      <rect x="0" y="410" width="400" height="190" fill="#a9714a"/>
      <g stroke="#8a5a3b" stroke-width="4"><path d="M60 420v180M140 420v180M260 420v180M340 420v180"/></g>
      <!-- gobelets -->
      <g>
        <path d="M46 336l8 44h34l8-44z" fill="#f3f0e8" stroke="#1e6b4f" stroke-width="4"/>
        <rect x="44" y="348" width="60" height="14" fill="#1e6b4f"/>
        <path d="M312 344l7 36h30l7-36z" fill="#f3f0e8" stroke="#1e6b4f" stroke-width="4"/>
        <rect x="310" y="354" width="52" height="12" fill="#1e6b4f"/>
      </g>
      <g fill="#e8d3b8" opacity=".5"><ellipse cx="200" cy="300" rx="150" ry="40"/></g>`),
  },
  {
    id: "decor_derry",
    nom: "Derry",
    fichier: "",
    vignette: "#5f6f7a",
    svg: svg(`
      <defs><linearGradient id="orage" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#4a5a66"/><stop offset="1" stop-color="#8c9aa3"/>
      </linearGradient></defs>
      <rect width="400" height="600" fill="url(#orage)"/>
      <g fill="#3c4a54">
        <polygon points="0,300 0,150 60,110 120,150 120,300"/>
        <polygon points="140,300 140,180 200,138 260,180 260,300"/>
        <polygon points="280,300 280,160 340,120 400,160 400,300"/>
      </g>
      <g fill="#f0c14b" opacity=".75">
        <rect x="26" y="180" width="24" height="30"/><rect x="70" y="180" width="24" height="30"/>
        <rect x="176" y="212" width="24" height="30"/><rect x="308" y="196" width="24" height="30"/>
      </g>
      <rect x="0" y="298" width="400" height="18" fill="#5f6f7a"/>
      <!-- trottoir + caniveau -->
      <rect x="0" y="316" width="400" height="284" fill="#8d9aa2"/>
      <rect x="0" y="316" width="400" height="10" fill="#6f7d86"/>
      <g stroke="#75838c" stroke-width="4"><path d="M0 420h400M0 510h400M100 316v284M300 316v284"/></g>
      <rect x="128" y="536" width="144" height="34" rx="6" fill="#3c4a54"/>
      <g fill="#26313a"><rect x="140" y="544" width="120" height="6"/><rect x="140" y="556" width="120" height="6"/></g>
      <!-- flaques -->
      <g fill="#aeb9c0" opacity=".7"><ellipse cx="66" cy="470" rx="46" ry="14"/><ellipse cx="336" cy="440" rx="38" ry="12"/></g>
      <!-- ballon rouge -->
      <path d="M330 176v76" stroke="#e8e8e8" stroke-width="3" fill="none"/>
      <ellipse cx="330" cy="150" rx="30" ry="35" fill="#d1232a"/>
      <ellipse cx="320" cy="138" rx="8" ry="11" fill="#ff7b7f" opacity=".8"/>
      <!-- pluie -->
      <g stroke="#dfe8ee" stroke-width="2" opacity=".55">
        <path d="M20 40l-8 34M92 10l-8 34M158 60l-8 34M230 24l-8 34M296 66l-8 34M370 30l-8 34
                 M54 130l-8 34M126 160l-8 34M198 120l-8 34M270 168l-8 34M344 140l-8 34
                 M36 240l-8 34M110 268l-8 34M250 250l-8 34M366 262l-8 34"/></g>`),
  },
  {
    id: "decor_nature",
    nom: "La nature",
    fichier: "",
    vignette: "#7ac36a",
    svg: svg(`
      <defs><linearGradient id="cielN" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#7fd0ff"/><stop offset="1" stop-color="#dff4ff"/>
      </linearGradient></defs>
      <rect width="400" height="600" fill="url(#cielN)"/>
      <circle cx="66" cy="66" r="34" fill="#ffd84d"/>
      <g stroke="#ffd84d" stroke-width="5" stroke-linecap="round">
        <path d="M66 12v-12M66 132v12M12 66H0M132 66h12M28 28l-9-9M104 104l9 9M104 28l9-9M28 104l-9 9"/></g>
      <g fill="#ffffff" opacity=".9">
        <ellipse cx="290" cy="80" rx="46" ry="22"/><ellipse cx="322" cy="70" rx="32" ry="18"/><ellipse cx="258" cy="72" rx="28" ry="16"/></g>
      <path d="M0 300q100-70 200-10t200-20v60H0z" fill="#5aa84e"/>
      <path d="M0 340h400v260H0z" fill="#7ac36a"/>
      <!-- arbres -->
      <g>
        <rect x="52" y="268" width="16" height="76" fill="#8a5a3b"/>
        <circle cx="60" cy="246" r="42" fill="#2f7a4d"/><circle cx="34" cy="266" r="28" fill="#38915b"/><circle cx="86" cy="266" r="28" fill="#38915b"/>
        <rect x="326" y="286" width="14" height="60" fill="#8a5a3b"/>
        <circle cx="333" cy="266" r="34" fill="#2f7a4d"/><circle cx="310" cy="282" r="22" fill="#38915b"/><circle cx="356" cy="282" r="22" fill="#38915b"/>
      </g>
      <!-- rivière -->
      <path d="M0 470q100 30 200 0t200 0v34q-100 30-200 0T0 504z" fill="#4de0ff" opacity=".8"/>
      <!-- fleurs -->
      <g>
        <g fill="#ff3d9a"><circle cx="40" cy="410" r="6"/><circle cx="52" cy="402" r="6"/><circle cx="64" cy="410" r="6"/><circle cx="52" cy="418" r="6"/></g>
        <circle cx="52" cy="410" r="5" fill="#ffd84d"/>
        <g fill="#ffffff"><circle cx="336" cy="560" r="6"/><circle cx="348" cy="552" r="6"/><circle cx="360" cy="560" r="6"/><circle cx="348" cy="568" r="6"/></g>
        <circle cx="348" cy="560" r="5" fill="#ffd84d"/>
        <g fill="#9b4dff"><circle cx="124" cy="566" r="6"/><circle cx="136" cy="558" r="6"/><circle cx="148" cy="566" r="6"/><circle cx="136" cy="574" r="6"/></g>
        <circle cx="136" cy="566" r="5" fill="#ffd84d"/>
      </g>`),
  },
];

/* Ton image si tu en as déposé une, sinon le SVG de secours.
   La même URL sert au DOM (background-image) et au canvas (drawImage). */
DECORS.forEach((d) => {
  if (d.fichier) {
    d.url = d.fichier;
  } else if (d.svg) {
    d.url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(d.svg.replace(/\s+/g, " ").trim());
  } else {
    d.url = ""; // ni image ni SVG : on retombe sur la couleur de vignette
  }
});

function trouveDecor(id) {
  return DECORS.find((d) => d.id === id) || DECORS[0];
}

/* Reprend les décors déclarés dans le manifest (dossier assets/decors/).
   Un id connu remplace son SVG de secours par ton image ; un id inconnu
   ajoute un décor de plus. Rien à écrire ici à la main. */
function fusionneDecorsDeclares(declares) {
  (declares || []).forEach((entree) => {
    if (!entree.fichier) return;
    const existant = DECORS.find((d) => d.id === entree.id);
    if (existant) {
      existant.fichier = entree.fichier;
      existant.url = entree.fichier;
      if (entree.nom) existant.nom = entree.nom;
    } else {
      DECORS.push({
        id: entree.id,
        nom: entree.nom || entree.id,
        fichier: entree.fichier,
        vignette: entree.vignette || "#ffd3ef",
        url: entree.fichier,
      });
    }
  });
}
