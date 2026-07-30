/* =========================================================
   Le Drewmètre : barème du mauvais goût et commentaires.

   Ce fichier ne contient QUE du contenu, comme silhouettes.js pour
   les dessins et decors.js pour les fonds. main.js sait additionner
   des points, comparer à un palier et afficher une phrase ; il ne
   sait pas ce qui est laid. C'est ici qu'on le lui apprend.

   Deux niveaux, parce que la laideur n'est pas qu'une somme :
   - la laideur d'une pièce prise seule (`laideur`, 0-10) et ses
     étiquettes (`tags`) vivent avec elle, dans assets/manifest.json ;
   - ce qui ne se voit que lorsque deux pièces se rencontrent est ici,
     dans COMBOS. C'est là qu'est le jeu : viser les rencontres.

   Une règle reçoit un « lecteur de tenue » et répond oui ou non :
     t.porte(id)          une pièce précise est portée
     t.forme(nom)         une pièce de cette silhouette est portée
     t.cat(categorie)     la pièce portée à cet endroit, ou null
     t.nu(categorie)      rien à cet endroit
     t.tag(etiquette)     au moins une pièce porte cette étiquette
     t.compte(etiquette)  combien de pièces la portent
     t.nb                 nombre de pièces portées
     t.decor              identifiant du décor choisi

   Ajouter un combo = ajouter une entrée ci-dessous. Rien d'autre.
   ========================================================= */

/* Le haut de la jauge. Mesuré, pas deviné : 353 est le meilleur score
   qu'une recherche exhaustive trouve dans la garde-robe actuelle. La
   barre pleine est donc exactement l'optimum — atteignable, mais
   seulement à qui traque les combos. Une tenue tirée au hasard (bouton
   Chaos) tourne autour de 134, soit un gros tiers de la jauge.
   À revoir si la garde-robe ou les combos bougent. */
const GOUT_MAX = 350;

/* Les rencontres qui coûtent cher. `points` s'ajoute à la somme des
   laideurs, `texte` remplace le commentaire au moment où le combo
   s'active — d'où l'écriture au présent, c'est une réaction. */
const COMBOS = [
  {
    id: "chaussettes_sandales",
    nom: "Chaussettes-sandales",
    points: 30,
    texte: "Chaussettes dans les sandales. Le grand classique.",
    quand: (t) => t.porte("chaussures_02"),
  },
  {
    id: "sans_bas",
    nom: "Sorti sans le bas",
    points: 30,
    texte: "Drew a oublié le pantalon.",
    quand: (t) => t.cat("calecon") && t.nu("bas"),
  },
  {
    id: "torse_nu",
    nom: "Torse nu accessoirisé",
    points: 25,
    texte: "Pas de haut, mais des bijoux.",
    quand: (t) => t.nu("haut") && t.nu("veste_manteau") && (t.cat("bijoux") || t.cat("ceinture_accessoire_taille")),
  },
  {
    id: "deux_saisons",
    nom: "Deux saisons à la fois",
    points: 25,
    texte: "Une moitié en tenue d'hiver, l'autre en tenue de plage.",
    quand: (t) => t.tag("hiver") && t.tag("ete"),
  },
  {
    id: "motifs",
    nom: "Motifs en guerre",
    points: 25,
    texte: "Trois imprimés différents sur la même tenue.",
    quand: (t) => t.compte("motif") >= 3,
  },
  {
    id: "sport",
    nom: "Survêtement intégral",
    points: 25,
    texte: "Tenue de sport complète. Drew ne fait aucun sport.",
    quand: (t) => t.compte("sport") >= 3,
  },
  {
    id: "formel_plage",
    nom: "Cérémonie à la plage",
    points: 25,
    texte: "Moitié tenue de mariage, moitié tenue de plage.",
    quand: (t) => t.tag("formel") && t.tag("plage"),
  },
  {
    id: "neons",
    nom: "Fluo croisé",
    points: 20,
    texte: "Deux pièces fluo en même temps.",
    quand: (t) => t.compte("neon") >= 2,
  },
  {
    id: "neons_partout",
    nom: "Alerte fluo",
    points: 25,
    texte: "Quatre pièces fluo. Même un gilet de chantier en fait moins.",
    quand: (t) => t.compte("neon") >= 4,
  },
  {
    id: "sale",
    nom: "Pas très frais",
    points: 20,
    texte: "Deux pièces qui n'ont pas vu de machine depuis l'automne.",
    quand: (t) => t.compte("sale") >= 2,
  },
  {
    id: "fait_maison",
    nom: "Atelier créatif",
    points: 20,
    texte: "Deux pièces cousues à la maison.",
    quand: (t) => t.compte("fait-maison") >= 2,
  },
  {
    id: "annees90",
    nom: "Rescapé des années 90",
    points: 20,
    texte: "Trois pièces qui sortent tout droit des années 90.",
    quand: (t) => t.compte("annees90") >= 3,
  },
  {
    id: "fac",
    nom: "Boutique du campus",
    points: 20,
    texte: "Tout vient de la boutique de la fac.",
    quand: (t) => t.compte("fac") >= 3,
  },
  {
    id: "fete",
    nom: "Sortie de boîte",
    points: 20,
    texte: "Une tenue de soirée. Il est quatorze heures.",
    quand: (t) => t.compte("fete") >= 3,
  },
  {
    id: "complet",
    nom: "Rien laissé au hasard",
    points: 20,
    texte: "Drew a rempli toutes les cases, sans exception.",
    quand: (t) => t.nb >= 10,
  },
  {
    id: "cravate_sans_haut",
    nom: "Cravate sur la peau",
    points: 25,
    texte: "Une cravate sans chemise. Drew appelle ça « décontracté chic ».",
    quand: (t) => t.forme("cravate") && t.nu("haut"),
  },
  {
    id: "bretelles_sans_haut",
    nom: "Bretelles à cru",
    points: 25,
    texte: "Des bretelles posées à même la peau.",
    quand: (t) => t.forme("bretelles") && t.nu("haut"),
  },
  {
    id: "double_tete",
    nom: "Coiffé, puis couvert",
    points: 10,
    texte: "Une heure de coiffage, puis un chapeau par-dessus.",
    quand: (t) => t.cat("coiffure") && t.cat("chapeau_couvre_chef"),
  },
  {
    id: "ski_bob",
    nom: "Prêt pour une piste imaginaire",
    points: 15,
    texte: "Masque de ski et bob en même temps.",
    quand: (t) => t.forme("lunettes_ski") && t.forme("bob"),
  },
  {
    id: "lunettes_de_nuit",
    nom: "Lunettes de soleil en intérieur",
    points: 15,
    texte: "Des lunettes de soleil, à l'intérieur.",
    quand: (t) => t.cat("visage_extra") && (t.decor === "decor_dortoir" || t.decor === "decor_starbucks"),
  },
  {
    id: "plage_a_derry",
    nom: "Vacances à Derry",
    points: 15,
    texte: "Tenue de plage sous la pluie de Derry.",
    quand: (t) => t.tag("plage") && t.decor === "decor_derry",
  },
  {
    id: "mulet_cuir",
    nom: "Le mulet et le cuir",
    points: 15,
    texte: "Mulet et cuir. Drew a l'air d'un souvenir de station-service.",
    quand: (t) => t.forme("mulet") && t.tag("cuir"),
  },
];

/* Les paliers, du plus sage au pire. main.js prend le dernier dont le
   seuil est atteint : ils doivent donc rester triés par seuil croissant.
   Les seuils sont posés sur la répartition réelle des tenues au hasard :
   les quatre premiers se traversent en jouant, les deux derniers ne
   tombent presque jamais par accident (moins de 1 % des tirages). */
const PALIERS = [
  { seuil: 0, titre: "Nu comme un ver", texte: "Il n'y a rien à commenter." },
  { seuil: 30, titre: "Étonnamment sobre", texte: "C'est presque portable." },
  { seuil: 70, titre: "Ça commence à piquer", texte: "Quelque chose se prépare." },
  { seuil: 115, titre: "Franchement discutable", texte: "On peut encore sortir avec Drew, en marchant à trois mètres." },
  { seuil: 160, titre: "Attentat visuel", texte: "Les gens se retournent dans la rue." },
  { seuil: 210, titre: "Danger public", texte: "Cette tenue devrait être signalée." },
  { seuil: 265, titre: "Crime contre la mode", texte: "Félicitations, personne ne s'en remettra." },
  { seuil: 320, titre: "Légende d'Augusta", texte: "On en parlera encore dans dix ans." },
];

/* --- Les commentaires -----------------------------------------------
   Rangés par ce qu'ils commentent, pour que le jeu réagisse à ce qui
   se passe et pas au hasard pur. */

/* Enfiler une pièce : trois tons, choisis d'après la laideur de la
   pièce (les seuils sont dans main.js, avec le reste de la mécanique). */
const PHRASES_ENFILE = {
  sobre: [
    "Sobre. Presque décevant.",
    "Drew enfile ça sans hésiter.",
    "Rien à redire.",
    "Ça se porte, tout simplement.",
    "Une pièce parfaitement normale.",
    "Drew trouve que ça lui va bien, et il a raison.",
  ],
  moyen: [
    "Enfilé en une seconde.",
    "Voilà, c'est fait.",
    "Ce choix sera commenté.",
    "Drew est ravi. Drew est seul à l'être.",
    "Aucune hésitation.",
    "Ça change tout.",
    "Drew hoche la tête devant le miroir.",
    "Noté.",
    "Ajouté à la tenue.",
  ],
  horrible: [
    "Drew se regarde et approuve.",
    "Ce vêtement attendait son heure.",
    "Drew appelle ça une signature.",
    "Personne n'avait encore osé mettre ça.",
    "Cette pièce était rangée tout au fond. Il y avait une raison.",
    "Le miroir vient de fermer les yeux.",
    "Il fallait oser. Drew a osé.",
  ],
};

const PHRASES_RETIRE = [
  "Drew récupère un peu de dignité.",
  "Retiré.",
  "Bien vu, ça n'allait avec rien.",
  "Une pièce en moins.",
  "Drew fait semblant de ne l'avoir jamais portée.",
  "Sage.",
  "Le miroir souffle.",
  "Rangé.",
  "Drew hésite, puis l'enlève.",
];

/* Retirer la pièce la plus laide de la tenue mérite mieux qu'un
   « bien vu » : c'est un renoncement. */
const PHRASES_RETIRE_TRESOR = [
  "Pas celle-là, c'était la meilleure idée de la tenue.",
  "Drew range la pièce maîtresse. Le Drewmètre le vit mal.",
  "Tu viens d'enlever ce qu'il fallait garder.",
];

const PHRASES_CHAOS = [
  "Drew pense que ça matche. Drew a tort.",
  "L'aigle regarde déjà cette tenue avec intérêt.",
  "Un crime de mode signé Drew.",
  "Drew a choisi tout seul.",
  "Même les mannequins de vitrine refuseraient ça.",
  "Le hasard a fait de son mieux.",
  "Drew sort comme ça et il assume.",
  "Trois styles se battent sur la même tenue.",
  "C'est audacieux. C'est surtout illégal dans quatre États.",
  "Le miroir a demandé une pause.",
  "On dirait une penderie qui a explosé.",
  "Drew appelle ça « une vibe ».",
  "Quelque part, un styliste vient de se réveiller en sueur.",
  "Personne n'a validé cette tenue.",
];

/* L'aigle parle deux fois : quand il fond sur Drew, puis quand il repart. */
const PHRASES_AIGLE_ARRIVEE = [
  "L'aigle a repéré la tenue. Il descend. 🦅",
  "Un cri dans le ciel. 🦅",
  "L'aigle plonge. 🦅",
  "Une ombre passe sur Drew. Ce n'est pas un nuage. 🦅",
  "L'aigle en a assez vu. 🦅",
  "Trop tard pour se changer, l'aigle est déjà en piqué. 🦅",
];

const PHRASES_AIGLE_BILAN = [
  "L'aigle a emporté toute la garde-robe. Drew est en caleçon. 🦅",
  "Tenue confisquée. Drew reste en caleçon, comme la dernière fois. 🦅",
  "L'aigle repart les serres pleines. 🦅",
  "Plus rien, à part le caleçon. 🦅",
  "Il ne reste que le caleçon. 🦅",
];

/* Battre son record est le seul moment où le jeu félicite pour de bon. */
const PHRASES_RECORD = [
  "NOUVEAU RECORD. Drew n'a jamais été aussi mal habillé. ★",
  "Record battu ! ★",
  "Meilleur score de mauvais goût à ce jour. ★",
];
