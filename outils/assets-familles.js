/* =========================================================
   LA LISTE DES ASSETS — source unique de vérité
   ---------------------------------------------------------
   Ce fichier est lu par `node outils/scan-assets.js`, qui s'en sert pour :
     - valider les dimensions et le ratio de ce qui est déposé ;
     - écrire `assets/index.js`, l'index que les pages chargent ;
     - imprimer ce qu'il reste à produire.

   Il n'y a donc PAS de liste en markdown à tenir à jour à côté : la liste,
   c'est ce fichier, et `node outils/scan-assets.js --liste` l'imprime. Une
   liste recopiée aurait dérivé au premier ajout de jeu — c'est déjà arrivé au
   tableau d'inventaire de CLAUDE.md, écrit quand le portail avait quatre jeux
   et faux dès le sixième.

   ---------------------------------------------------------
   CADRE LOGIQUE ET ÉCHELLE
   ---------------------------------------------------------
   `cadre` est la taille de RÉFÉRENCE, celle que le SVG occupe aujourd'hui à
   l'écran. Les fichiers sont attendus à cette taille multipliée par
   `ECHELLE` (2 par défaut) : un personnage se livre donc en 96 × 144 et
   s'affiche dans 48 × 72. Le scanner accepte aussi 1× et 3× — il note
   l'échelle réelle dans l'index et le résolveur en tient compte, donc un
   fichier en 3× ne sera pas deux fois trop grand à l'écran.

   Ce qui n'est PAS négociable, c'est le RATIO : un 50 × 70 à la place d'un
   48 × 72 déformerait le personnage, le scanner le rejette et le dit.
   ========================================================= */

const ECHELLE = 2;

/* Les cadres, nommés une fois pour ne pas les recopier trente fois. */
const CADRES = {
  perso: { largeur: 48, hauteur: 72 },     // shared/perso.js, pieds en bas du cadre
  creature: { largeur: 64, hauteur: 64 },  // carré, la bête sort par le bas du trou
  objet: { largeur: 64, hauteur: 64 },     // cartes de Memory, accessoires
  vignette: { largeur: 320, hauteur: 240 },// 4/3, la miniature du hub
  decorDrew: { largeur: 400, hauteur: 600 },
  fond: { largeur: 1000, hauteur: 420 },   // fond de salle de Kiss & Cache
  bandeau: { largeur: 1200, hauteur: 400 },// ciel / couche de parallaxe
};

/* --- Aide à la rédaction : un personnage et ses poses ------------------- */
function perso(id, nom, ou, poses) {
  const liste = [{ id, nom, ou, base: true }];
  (poses || []).forEach((p) =>
    liste.push({ id: id + "-" + p.suffixe, nom: nom + " — " + p.quoi, ou: p.ou }));
  return liste;
}

const FAMILLES = {
  /* =========================================================
     Les personnages, partagés par TOUT le portail
     ---------------------------------------------------------
     Un seul dessin de Drew sert dans Dress my Drew, UMA Bros, UMA Memory et
     Sanity Whack. C'est le gros de l'économie : sans dossier partagé, il
     faudrait le dessiner quatre fois.

     La CASCADE du résolveur (voir shared/images.js) fait qu'un `drew.png`
     suffit à voir Drew partout : les poses ne font que l'affiner. Commence
     donc par les neuf dessins « base », le reste est du confort.
     ========================================================= */
  personnages: {
    jeu: "Commun",
    titre: "Personnages",
    dossier: "assets/personnages",
    cadre: CADRES.perso,
    note:
      "Fond transparent. Pieds posés sur le bord BAS du cadre, tête proche du " +
      "bord haut : c'est ce qui aligne tout le monde à la même hauteur d'un " +
      "jeu à l'autre. Vu de face sauf mention contraire.",
    ids: [].concat(
      perso("drew", "Drew", "partout", [
        { suffixe: "court", quoi: "en train de courir", ou: "UMA Bros" },
        { suffixe: "saut", quoi: "en saut", ou: "UMA Bros" },
      ]),
      perso("glinda", "Glinda", "partout", [
        { suffixe: "gauche", quoi: "pompons à gauche", ou: "Pep Rally Rhythm" },
        { suffixe: "droite", quoi: "pompons à droite", ou: "Pep Rally Rhythm" },
        { suffixe: "haut", quoi: "pompons en haut", ou: "Pep Rally Rhythm" },
        { suffixe: "bas", quoi: "pompons en bas", ou: "Pep Rally Rhythm" },
        { suffixe: "court", quoi: "course", ou: "Run, Glinda, Run + UMA Bros" },
        { suffixe: "saut", quoi: "saut", ou: "Run, Glinda, Run + UMA Bros" },
        { suffixe: "glisse", quoi: "glissade", ou: "Run, Glinda, Run" },
      ]),
      perso("elias", "Elias", "partout", [
        { suffixe: "court", quoi: "course", ou: "UMA Bros" },
        { suffixe: "saut", quoi: "saut", ou: "UMA Bros" },
        /* Les six clés de HUMEURS dans games/elias-whack/main.js, pas les
           quatre paliers de sanity : c'est l'humeur qui pilote l'avatar, et
           elle réagit aussi aux bons coups et aux bourdes. */
        { suffixe: "calme", quoi: "visage : calme", ou: "Sanity Whack (avatar)" },
        { suffixe: "inquiet", quoi: "visage : inquiet", ou: "Sanity Whack (avatar)" },
        { suffixe: "tendu", quoi: "visage : tendu", ou: "Sanity Whack (avatar)" },
        { suffixe: "panique", quoi: "visage : paniqué", ou: "Sanity Whack (avatar)" },
        { suffixe: "content", quoi: "visage : content", ou: "Sanity Whack (avatar)" },
        { suffixe: "honte", quoi: "visage : honteux", ou: "Sanity Whack (avatar)" },
      ]),
      perso("eoghan", "Eoghan", "partout", [
        { suffixe: "marche", quoi: "en marche", ou: "Kiss & Cache" },
        { suffixe: "accroupi", quoi: "accroupi", ou: "Kiss & Cache" },
        { suffixe: "bisou", quoi: "en train d'embrasser", ou: "Kiss & Cache" },
        { suffixe: "court", quoi: "course", ou: "UMA Bros" },
        { suffixe: "saut", quoi: "saut", ou: "UMA Bros" },
      ]),
      perso("camarade", "La camarade de Glinda", "Pep Rally Rhythm", [
        { suffixe: "gauche", quoi: "pompons à gauche", ou: "Pep Rally Rhythm" },
        { suffixe: "droite", quoi: "pompons à droite", ou: "Pep Rally Rhythm" },
        { suffixe: "haut", quoi: "pompons en haut", ou: "Pep Rally Rhythm" },
        { suffixe: "bas", quoi: "pompons en bas", ou: "Pep Rally Rhythm" },
      ]),
      perso("boq", "Boq", "UMA Memory", [
        { suffixe: "court", quoi: "en train de poursuivre", ou: "Run, Glinda, Run" },
      ]),
      perso("mads", "Mads Prout", "Balance ta tomate, UMA Memory", [
        { suffixe: "nargue", quoi: "bras levés, fanfaron", ou: "Balance ta tomate" },
        { suffixe: "planque", quoi: "accroupi derrière un abri", ou: "Balance ta tomate" },
        { suffixe: "touche", quoi: "touché par une tomate", ou: "Balance ta tomate" },
      ]),
      perso("nils", "Nils", "UMA Bros, UMA Memory"),
      perso("elphie", "Elphie", "UMA Bros, UMA Memory"),
      perso("mamie", "La grand-mère d'Elias", "Sanity Whack, UMA Memory"),
      perso("lanceur", "Le lanceur de tomates (dos)", "Balance ta tomate")
    ),
  },

  /* =========================================================
     Le bestiaire
     ---------------------------------------------------------
     Partagé entre Sanity Whack (à taper), UMA Memory (cartes) et UMA Bros
     (ennemis). Cadre carré, la créature sortant par le bas.
     ========================================================= */
  creatures: {
    jeu: "Commun",
    titre: "Créatures",
    dossier: "assets/creatures",
    cadre: CADRES.creature,
    note:
      "Fond transparent, cadre CARRÉ. La créature occupe le bas du cadre : " +
      "dans Sanity Whack elle sort d'un trou, il faut donc que le haut du " +
      "dessin soit la partie visible.",
    ids: [
      { id: "gris", nom: "Petit gris générique", ou: "Sanity Whack, Memory" },
      { id: "ovni", nom: "Ovni de tourisme", ou: "Sanity Whack, Memory" },
      { id: "silhouette", nom: "Silhouette floue dans les bois", ou: "Sanity Whack, Memory" },
      { id: "oeil", nom: "Œil géant dans le ciel", ou: "Sanity Whack, Memory" },
      { id: "chevre", nom: "Chèvre suspecte", ou: "Sanity Whack, Memory" },
      { id: "ombre", nom: "Ombre humanoïde du couloir", ou: "Sanity Whack, Memory" },
      { id: "pennywise", nom: "Pennywise", ou: "Sanity Whack, Memory, UMA Bros" },
      { id: "slenderman", nom: "Slenderman", ou: "Sanity Whack, Memory" },
      { id: "cafard", nom: "Cafard du campus", ou: "UMA Bros, Memory" },
      { id: "oiseau", nom: "Oiseau mal intentionné", ou: "UMA Bros, Memory" },
      { id: "lutin", nom: "Lutin de la fac", ou: "UMA Bros, Memory" },
      { id: "ange", nom: "Ange (exact)", ou: "UMA Bros, Memory" },
      { id: "toto", nom: "Toto, le perroquet d'Elias", ou: "Sanity Whack, Memory" },
      { id: "aigle", nom: "L'aigle qui fond sur la garde-robe", ou: "Dress my Drew" },
    ],
  },

  /* =========================================================
     Les objets
     ---------------------------------------------------------
     Surtout les cartes d'UMA Memory : chaque duo associe un personnage à
     l'objet qui lui appartient. Mêmes dimensions que les créatures pour
     qu'une carte ressemble à une carte.
     ========================================================= */
  objets: {
    jeu: "Commun",
    titre: "Objets",
    dossier: "assets/objets",
    cadre: CADRES.objet,
    note: "Fond transparent, cadre carré, objet centré.",
    ids: [
      { id: "camion", nom: "Le camion vert de Drew", ou: "Memory (duo Drew)" },
      { id: "pompon", nom: "Un pompon", ou: "Memory (duo Glinda), Pep Rally" },
      { id: "carnet", nom: "Le carnet à complots d'Elias", ou: "Memory (duo Elias)" },
      { id: "telephone", nom: "Un téléphone qui filme", ou: "Memory (duo Eoghan)" },
      { id: "coeur", nom: "Un cœur", ou: "Memory (duo Boq), Kiss & Cache" },
      { id: "tomate", nom: "Une tomate", ou: "Memory (duo Mads), Balance ta tomate" },
      { id: "ballon", nom: "Le ballon rouge", ou: "Memory (duo Pennywise)" },
      { id: "pizza", nom: "Une part de pizza", ou: "Sanity Whack, Memory" },
      { id: "champignon", nom: "Un champignon", ou: "Memory (duo Lutin)" },
      { id: "gobelet", nom: "Un gobelet renversé", ou: "Memory (duo Oiseau)" },
      { id: "vhs", nom: "Une cassette VHS", ou: "Memory (duo Trophée)" },
      { id: "trophee", nom: "Un trophée", ou: "Memory (duo VHS)" },
      { id: "dos-carte", nom: "Le DOS d'une carte", ou: "UMA Memory (face cachée)" },
    ],
  },

  /* =========================================================
     Le mobilier de Kiss & Cache
     ---------------------------------------------------------
     Chaque meuble a déjà une largeur et une hauteur en unités de salle dans
     `PROPS` : l'image doit respecter CE ratio, et se poser au sol.
     ========================================================= */
  "eoghan-mobilier": {
    jeu: "Kiss & Cache",
    titre: "Mobilier de Kiss & Cache",
    dossier: "games/eoghan-office/assets/mobilier",
    cadre: { largeur: 120, hauteur: 120 },
    ratioLibre: true,
    note:
      "Fond transparent, posé AU SOL (le bas du dessin est le bas du meuble). " +
      "Le ratio de chaque meuble est donné par sa largeur/hauteur dans PROPS " +
      "de decors.js — le scanner ne le vérifie donc pas ici.",
    ids: [
      { id: "bureau", nom: "Un bureau", ou: "coupe la vue" },
      { id: "plante", nom: "Une plante en pot", ou: "cachette" },
      { id: "casier", nom: "Une rangée de casiers", ou: "coupe la vue" },
      { id: "canape", nom: "Un canapé", ou: "coupe la vue" },
      { id: "arbre", nom: "Un arbre", ou: "coupe la vue" },
      { id: "banc", nom: "Un banc", ou: "cachette seulement" },
      { id: "enceinte", nom: "Une enceinte", ou: "cachette" },
      { id: "buvette", nom: "Une table de boissons", ou: "coupe la vue" },
    ],
  },

  /* =========================================================
     Les vignettes du hub
     ---------------------------------------------------------
     Le seul endroit déjà entièrement piloté par le manifest : le champ
     `vignette` de games-manifest.json. Changer le chemin suffit.
     ========================================================= */
  vignettes: {
    jeu: "Commun",
    titre: "Vignettes du hub",
    dossier: "assets/vignettes",
    cadre: CADRES.vignette,
    note:
      "4/3 strict. C'est la miniature de la grille d'accueil, du classement " +
      "et du rail « Tu aimeras aussi » : elle doit rester lisible à 90 px de " +
      "large. Pas de texte fin.",
    ids: [
      { id: "drew", nom: "Dress my Drew", ou: "hub" },
      { id: "glinda", nom: "Pep Rally Rhythm", ou: "hub" },
      { id: "elias", nom: "Sanity Whack", ou: "hub" },
      { id: "eoghan", nom: "Kiss & Cache", ou: "hub" },
      { id: "uma-bros", nom: "UMA Bros", ou: "hub" },
      { id: "memory", nom: "UMA Memory", ou: "hub" },
      { id: "glinda-run", nom: "Run, Glinda, Run", ou: "hub" },
      { id: "derry-driver", nom: "Derry Driver", ou: "hub" },
      { id: "love-tester", nom: "Love Tester", ou: "hub" },
      { id: "tomates", nom: "Balance ta tomate", ou: "hub" },
    ],
  },

  /* =========================================================
     Les décors
     ---------------------------------------------------------
     Un par jeu et par terrain. Ce sont des FONDS : ils passent derrière les
     personnages, donc pas de transparence nécessaire.
     ========================================================= */
  "decors-drew": {
    jeu: "Dress my Drew",
    titre: "Décors de Dress my Drew",
    dossier: "games/drew-dress-up/assets/decors",
    cadre: CADRES.decorDrew,
    note:
      "Cadre de la poupée. L'image est cadrée en « cover » et centrée, donc " +
      "les bords qui dépassent sont rognés. Garde la zone centrale lisible : " +
      "Drew se tient au milieu. Sert aussi dans l'export PNG.",
    ids: [
      { id: "augusta", nom: "L'université d'Augusta", ou: "décor" },
      { id: "dortoir", nom: "Le dortoir", ou: "décor" },
      { id: "starbucks", nom: "Le Starbucks du campus", ou: "décor" },
      { id: "derry", nom: "Derry sous la pluie", ou: "décor" },
      { id: "nature", nom: "En pleine nature", ou: "décor" },
    ],
  },

  "decors-eoghan": {
    jeu: "Kiss & Cache",
    titre: "Fonds de salle de Kiss & Cache",
    dossier: "games/eoghan-office/assets/fonds",
    cadre: CADRES.fond,
    note:
      "Vue de CÔTÉ, deux rangées de profondeur. Le haut de l'image est le " +
      "fond de la salle, le bas le sol de la rangée avant. Aujourd'hui c'est " +
      "un dégradé CSS en trois bandes (fond, sol arrière, sol avant).",
    ids: [
      { id: "campus", nom: "Le campus, plein jour", ou: "décor 1" },
      { id: "soiree", nom: "La soirée, lumière tamisée", ou: "décor 2" },
      { id: "vestiaire", nom: "Le vestiaire de sport", ou: "décor 3" },
      { id: "bal", nom: "Le bal de promo", ou: "décor 4" },
    ],
  },

  "decors-uma-bros": {
    jeu: "UMA Bros",
    titre: "Décors d'UMA Bros",
    dossier: "games/uma-bros/assets/decors",
    cadre: CADRES.bandeau,
    note: "Fond de niveau, défile horizontalement. Se répète bien en largeur.",
    ids: [
      { id: "universite", nom: "L'université d'Augusta, plein jour", ou: "niveau 1" },
      { id: "derry", nom: "Derry, un soir de pluie", ou: "niveau 2" },
      { id: "foret", nom: "La forêt d'Augusta, nuit noire", ou: "niveau 3" },
    ],
  },

  "decors-derry": {
    jeu: "Derry Driver",
    titre: "Décors de Derry Driver",
    dossier: "games/derry-driver/assets/decors",
    cadre: CADRES.bandeau,
    note: "Fond de parcours, vu de profil, défile horizontalement.",
    ids: [
      { id: "campus", nom: "La côte du campus", ou: "parcours 1" },
      { id: "derry", nom: "Le centre de Derry", ou: "parcours 2" },
      { id: "foret", nom: "La forêt d'Augusta, de nuit", ou: "parcours 3" },
    ],
  },

  "decors-glinda-run": {
    jeu: "Run, Glinda, Run",
    titre: "Couches de parallaxe de Run, Glinda, Run",
    dossier: "games/glinda-run/assets/couches",
    cadre: CADRES.bandeau,
    note:
      "Quatre couches qui défilent à des vitesses différentes. Chacune doit " +
      "se RACCORDER à elle-même horizontalement (le bord droit colle au bord " +
      "gauche), sinon la boucle se voit.",
    ids: [
      { id: "ciel", nom: "Le ciel", ou: "couche la plus lente" },
      { id: "campus", nom: "Les bâtiments du campus", ou: "couche 2" },
      { id: "arbres", nom: "Les arbres", ou: "couche 3" },
      { id: "bordure", nom: "La bordure de trottoir", ou: "couche la plus rapide" },
    ],
  },

  "decors-glinda-cheer": {
    jeu: "Pep Rally Rhythm",
    titre: "Décor du stade de Pep Rally Rhythm",
    dossier: "games/glinda-cheer/assets/decor",
    cadre: CADRES.bandeau,
    note: "Stade de foot US en plein jour, aux couleurs d'Augusta (marine et blanc).",
    ids: [
      { id: "ciel", nom: "Le ciel", ou: "fond" },
      { id: "tribune", nom: "La tribune (5 rangs)", ou: "fond" },
      { id: "pelouse", nom: "La pelouse", ou: "sol" },
      { id: "poteaux", nom: "Les poteaux", ou: "décor" },
      { id: "panneau", nom: "Le panneau de score", ou: "décor" },
    ],
  },

  "decors-tomates": {
    jeu: "Balance ta tomate",
    titre: "Décor de Balance ta tomate",
    dossier: "games/tomates/assets/decor",
    cadre: { largeur: 160, hauteur: 100 },
    ratioLibre: true,
    note:
      "Fête foraine : estrade, rideau de velours, herbe piétinée, fanions. " +
      "Le monde du jeu fait 160 × 100 unités — respecte ce cadrage large.",
    ids: [
      { id: "scene", nom: "L'estrade et son rideau", ou: "fond" },
      { id: "tonneau", nom: "Un tonneau", ou: "abri" },
      { id: "caisse", nom: "Une caisse", ou: "abri" },
      { id: "pancarte", nom: "Une pancarte", ou: "abri" },
    ],
  },

  /* =========================================================
     Les obstacles
     ========================================================= */
  "obstacles-glinda-run": {
    jeu: "Run, Glinda, Run",
    titre: "Obstacles de Run, Glinda, Run",
    dossier: "games/glinda-run/assets/obstacles",
    cadre: CADRES.objet,
    ratioLibre: true,
    note:
      "Fond transparent. Chaque obstacle a déjà sa largeur et sa hauteur dans " +
      "donnees.js : respecte SON ratio, pas un carré.",
    ids: [
      { id: "sac", nom: "Sac de sport", ou: "à sauter" },
      { id: "poubelle", nom: "Poubelle du campus", ou: "à sauter" },
      { id: "banc", nom: "Banc du parvis", ou: "à sauter" },
      { id: "banderole", nom: "Banderole des sélections", ou: "à glisser dessous" },
      { id: "haie", nom: "Haie taillée", ou: "à sauter" },
      { id: "guirlande", nom: "Guirlande de fanions", ou: "à glisser dessous" },
      { id: "caddie", nom: "Caddie abandonné", ou: "à sauter" },
    ],
  },

  "obstacles-derry": {
    jeu: "Derry Driver",
    titre: "Véhicules et obstacles de Derry Driver",
    dossier: "games/derry-driver/assets/obstacles",
    cadre: CADRES.objet,
    ratioLibre: true,
    note: "Vus de PROFIL, fond transparent. Les camions sont les trois chargements jouables.",
    ids: [
      { id: "camionnette", nom: "La camionnette (6 cartons)", ou: "véhicule" },
      { id: "camion", nom: "Le camion vert de Drew (10 cartons)", ou: "véhicule" },
      { id: "semi", nom: "La remorque pleine (16 cartons)", ou: "véhicule" },
      { id: "nid-de-poule", nom: "Un nid-de-poule", ou: "obstacle" },
      { id: "plot", nom: "Un plot de chantier", ou: "obstacle" },
      { id: "barriere", nom: "Une barrière de chantier", ou: "obstacle" },
      { id: "colis", nom: "Un colis égaré", ou: "bonus" },
      { id: "jerrican", nom: "Un jerrican", ou: "bonus carburant" },
      { id: "carton", nom: "Un carton qui tombe", ou: "cargaison" },
    ],
  },
};

/* =========================================================
   Ce qui RESTE en SVG, et pourquoi
   ---------------------------------------------------------
   Deux familles ne peuvent pas devenir des images, et ce n'est pas un oubli :
   elles sont PROCÉDURALES. Le scanner ne les réclame donc jamais.
   ========================================================= */
const RESTE_EN_SVG = [
  {
    quoi: "Le Love Tester n'a plus aucun dessin du tout",
    ou: "games/love-tester/ — réglé, rien à produire",
    pourquoi:
      "C'était le seul cas que la conversion en illustrations ne savait pas " +
      "résoudre : la machine inventait un visage pour un prénom inconnu, tiré " +
      "du hachage, et l'ensemble des prénoms possibles est infini — aucun jeu " +
      "de PNG fini ne pouvait le couvrir. Les portraits ont donc été retirés " +
      "et le gadget est redevenu ce qu'il était en 2012 : deux champs, une " +
      "aiguille, un verdict. Du texte, et rien d'autre. Le problème a " +
      "disparu au lieu d'être contourné.",
  },
  {
    quoi: "Les silhouettes de foule",
    ou: "shared/perso.js → spectateurSVG",
    pourquoi:
      "La tribune de Pep Rally est remplie de variantes combinatoires " +
      "(3 formes × 6 maillots, réparties au hasard sur cinq rangs). Ce sont " +
      "des aplats volontairement sommaires, vus à 20 px de haut : les " +
      "remplacer coûterait 18 dessins pour un gain nul. Si tu veux quand même " +
      "les traiter, dis-le et j'ajoute la famille.",
  },
];

/* =========================================================
   Le contrôle d'un fichier — partagé par le scanner ET l'atelier
   ---------------------------------------------------------
   `outils/scan-assets.js` (Node) et `outils/atelier.html` (navigateur) doivent
   juger EXACTEMENT pareil : sinon l'atelier accepterait un fichier que le
   scanner refuse, et le dossier se remplirait d'images qui ne s'afficheront
   jamais. D'où cette fonction ici, et pas dans l'un des deux.
   ========================================================= */

/* Une échelle très proche d'un entier est prise pour cet entier : un export à
   96 × 144 donne pile 2, mais 97 × 145 donnerait 2,02 et afficherait l'image à
   une taille légèrement fausse. */
function arrondiEchelle(e) {
  const proche = Math.round(e);
  return proche > 0 && Math.abs(e - proche) < 0.02 ? proche : e;
}

/**
 * @returns {{ok: true, echelle: number}|{ok: false, raison: string}}
 */
function controleDimensions(famille, largeur, hauteur) {
  if (!largeur || !hauteur) {
    return { ok: false, raison: "illisible (format non reconnu ou fichier corrompu)" };
  }

  const cadre = famille.cadre;
  const echelle = arrondiEchelle(largeur / cadre.largeur);

  /* Ratio libre : la forme vient de la donnée du jeu (largeur/hauteur d'un
     meuble, d'un obstacle), pas de la famille. On ne juge que la largeur. */
  if (famille.ratioLibre) return { ok: true, echelle: echelle, ratioLibre: true };

  const ratioAttendu = cadre.largeur / cadre.hauteur;
  const ratioReel = largeur / hauteur;
  /* 2 % de tolérance : de quoi absorber un arrondi d'export, pas une erreur de
     cadrage. À 48 × 72 ça laisse passer un pixel, pas trois. */
  if (Math.abs(ratioReel - ratioAttendu) / ratioAttendu > 0.02) {
    return {
      ok: false,
      raison:
        "mauvais ratio — " + largeur + "×" + hauteur + " au lieu d'un multiple de " +
        cadre.largeur + "×" + cadre.hauteur + " (attendu " +
        cadre.largeur * ECHELLE + "×" + cadre.hauteur * ECHELLE + ")",
    };
  }

  return { ok: true, echelle: echelle };
}

/* =========================================================
   RECONNAÎTRE UN NOM DE FICHIER
   ---------------------------------------------------------
   L'atelier accepte qu'on lui jette des images en vrac : il doit deviner à
   quelle entrée chacune appartient. Les règles vivent ici, et pas dans la page,
   pour deux raisons : elles font partie du contrat de nommage (au même titre
   que les cadres), et elles sont ainsi éprouvables en Node —
   `outils/test-assets.js` les tient.
   ========================================================= */

/** « Drew FINAL v2.png » → « drew-final-v2 ». */
function normaliseNom(nom) {
  return String(nom)
    .replace(/\.[^.]+$/, "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    /* TOUT ce qui n'est pas alphanumérique devient un tiret, et pas seulement
       les espaces : « drew-court@2x » donnait « drew-court2x », où le « 2x »
       collé empêchait de reconnaître « drew-court ». */
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* id normalisé → [{nomFamille, famille, entree}], et les ids du plus long au
   plus court (c'est ce qui fait que « drew-court-final » trouve `drew-court`
   et pas `drew`). Construits une fois, à partir des familles. */
const PAR_NOM = {};
const IDS_TRIES = [];
function indexeNoms() {
  Object.keys(PAR_NOM).forEach((k) => delete PAR_NOM[k]);
  IDS_TRIES.length = 0;
  Object.keys(FAMILLES).forEach((nomFamille) => {
    const famille = FAMILLES[nomFamille];
    famille.ids.forEach((entree) => {
      const cle = normaliseNom(entree.id);
      (PAR_NOM[cle] = PAR_NOM[cle] || []).push({ nomFamille, famille, entree });
    });
  });
  IDS_TRIES.push(...Object.keys(PAR_NOM).sort((a, b) => b.length - a.length));
}

/**
 * À qui appartient ce fichier ?
 *
 * Deux difficultés, une réponse pour chacune.
 *
 * 1. Personne n'exporte `drew.png` du premier coup : ça sort de l'éditeur en
 *    « Drew FINAL v2.png », « drew@2x.png », « drew (1).png ». Exiger le nom
 *    exact renverrait tout au bac à ranger à la main, et l'outil ne servirait
 *    plus à rien. On accepte donc qu'un nom COMMENCE par un identifiant connu,
 *    en prenant le plus long qui colle.
 *
 * 2. Le même identifiant existe dans DEUX familles : `drew` est à la fois un
 *    personnage et la vignette du hub — et c'est vrai des dix vignettes. Le nom
 *    seul ne peut pas trancher ; les DIMENSIONS, si. Un 96 × 144 ne peut pas
 *    être une vignette 4/3. On ne garde donc que les candidats dont le ratio
 *    accepte le fichier. S'il en reste plusieurs, on demande plutôt que parier.
 *
 * @param {string} nom  le nom du fichier déposé
 * @param {{largeur:number,hauteur:number}|null} dim  ses dimensions, si connues
 * @returns {{nomFamille,famille,entree}|null|"ambigu"}
 */
function devineEntree(nom, dim) {
  if (!IDS_TRIES.length) indexeNoms();
  const n = normaliseNom(nom);

  let candidats = PAR_NOM[n];
  if (!candidats) {
    for (const id of IDS_TRIES) {
      if (n === id || n.indexOf(id + "-") === 0) { candidats = PAR_NOM[id]; break; }
    }
  }
  if (!candidats) return null;
  if (candidats.length === 1) return candidats[0];

  if (dim && dim.largeur && dim.hauteur) {
    const compatibles = candidats.filter(
      (c) => controleDimensions(c.famille, dim.largeur, dim.hauteur).ok
    );
    if (compatibles.length === 1) return compatibles[0];
  }
  return "ambigu";
}

/* =========================================================
   L'ORDRE DES JEUX
   ---------------------------------------------------------
   On travaille un jeu à la fois : c'est comme ça qu'on avance, et c'est comme
   ça qu'on sait où on en est. La liste ci-dessous fixe donc l'ordre des
   sections, dans l'atelier comme à la console.

   « Commun » vient en tête, et pas par politesse : ces quatre familles sont
   partagées par plusieurs jeux (un seul dessin de Drew sert dans quatre jeux).
   Les faire d'abord, c'est avancer partout à la fois ; les laisser pour la fin,
   c'est n'avoir aucun jeu complet.

   Un jeu absent d'ici mais présent sur une famille s'afficherait quand même,
   en queue de liste. Les jeux dont tous les dessins sont communs (Sanity Whack,
   UMA Memory, Love Tester) n'ont pas de section propre : ils n'ont aucun décor
   ni objet qui leur soit particulier.
   ========================================================= */
const JEUX = [
  { nom: "Commun", detail: "partagé par plusieurs jeux — à faire en premier" },
  { nom: "Kiss & Cache", detail: "mobilier et fonds de salle" },
  { nom: "Dress my Drew", detail: "décors de la poupée" },
  { nom: "Pep Rally Rhythm", detail: "le stade" },
  { nom: "UMA Bros", detail: "les trois niveaux" },
  { nom: "Run, Glinda, Run", detail: "parallaxe et obstacles" },
  { nom: "Derry Driver", detail: "parcours, véhicules, obstacles" },
  { nom: "Balance ta tomate", detail: "l'estrade et ses abris" },
];

/** Les familles d'un jeu, dans l'ordre où elles sont déclarées. */
function famillesDuJeu(nomJeu) {
  return Object.entries(FAMILLES).filter(([, f]) => f.jeu === nomJeu);
}

/** Les jeux réellement présents, dans l'ordre de JEUX puis les intrus. */
function jeuxOrdonnes() {
  const connus = JEUX.map((j) => j.nom);
  const presents = [...new Set(Object.values(FAMILLES).map((f) => f.jeu || "Sans jeu"))];
  const ordonnes = connus.filter((n) => presents.indexOf(n) !== -1);
  presents.forEach((n) => { if (ordonnes.indexOf(n) === -1) ordonnes.push(n); });
  return ordonnes.map((nom) => {
    const meta = JEUX.filter((j) => j.nom === nom)[0];
    return { nom: nom, detail: meta ? meta.detail : "", familles: famillesDuJeu(nom) };
  });
}

/* Lisible par Node (le scanner et les bancs d'essai) ET par le navigateur
   (l'atelier, chargé par un simple <script>). Une seule liste, deux lecteurs. */
const UMA_ASSETS_SPEC = {
  ECHELLE, CADRES, FAMILLES, JEUX, RESTE_EN_SVG,
  controleDimensions, arrondiEchelle, famillesDuJeu, jeuxOrdonnes,
  normaliseNom, devineEntree,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = UMA_ASSETS_SPEC;
} else if (typeof window !== "undefined") {
  window.UMA_ASSETS_SPEC = UMA_ASSETS_SPEC;
}
