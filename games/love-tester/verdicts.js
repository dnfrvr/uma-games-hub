/* =========================================================
   Love Tester — tout ce que la machine a le droit de dire
   ---------------------------------------------------------
   Le moteur (main.js) ne contient AUCUN texte et AUCUN visage : il ne sait
   que lire ce fichier. Ajouter une tranche de verdict, un couple préréglé ou
   un personnage ne demande donc pas de toucher au code — c'est la convention
   du projet (charts.js pour Glinda, roster.js pour Elias, decors.js pour
   Eoghan).

   Un seul global, `DONNEES_LOVE`, pour ne rien risquer : la page charge aussi
   shared/perso.js, qui pose ses propres constantes en tête de fichier.
   ========================================================= */

const DONNEES_LOVE = {
  /* =========================================================
     1. Le casting — les réglages viennent des jeux existants
     ---------------------------------------------------------
     Drew, Glinda, Elias, Eoghan, Nils et Elphie sont recopiés à l'identique
     depuis games/uma-bros/niveaux.js : un personnage doit avoir la même tête
     d'un jeu à l'autre du portail. Boq et Mads Prout n'avaient pas encore de
     réglages ; ils en reçoivent ici, dans la même fabrique (shared/perso.js)
     et donc dans le même style de dessin.
     ========================================================= */
  CASTING: [
    {
      nom: "Drew",
      mention: "Dress my Drew",
      look: {
        peau: "#f8dcc0", cheveux: "long", couleurCheveux: "#8a5a2b",
        haut: "#aa6caa", bas: "#3a2b4e", bouche: "sourire", regard: "face",
      },
    },
    {
      nom: "Glinda",
      mention: "Pep Rally Rhythm",
      look: {
        peau: "#f8dcc0", cheveux: "queue", couleurCheveux: "#e8b84b",
        haut: "#16255c", bas: "#16255c", jupe: "#ffffff", pompons: "#ffffff",
        accessoire: "noeud", couleurAccessoire: "#16255c", bouche: "sourire-large",
      },
    },
    {
      nom: "Elias",
      mention: "Sanity Whack",
      look: {
        peau: "#f0c39a", cheveux: "court", couleurCheveux: "#2b1a2e",
        haut: "#6672d0", bas: "#2f3550", accessoire: "lunettes",
        bouche: "neutre", regard: "face",
      },
    },
    {
      nom: "Eoghan",
      mention: "Kiss & Cache",
      look: {
        peau: "#f0c39a", cheveux: "boucle", couleurCheveux: "#c98a3a",
        haut: "#00b32d", bas: "#2f3550", bouche: "sourire-large", regard: "face",
      },
    },
    {
      nom: "Nils",
      mention: "UMA Bros",
      look: {
        peau: "#f3ddcb", cheveux: "frange", couleurCheveux: "#e8b84b",
        haut: "#22222a", bas: "#15151b", bouche: "neutre", regard: "gauche",
      },
    },
    {
      nom: "Elphie",
      mention: "UMA Bros",
      look: {
        peau: "#7a4a2b", cheveux: "long", couleurCheveux: "#1e1218",
        haut: "#2e7d5b", bas: "#1f2b3a", accessoire: "serretete",
        couleurAccessoire: "#e8b84b", bouche: "neutre", regard: "face",
      },
    },
    {
      /* Boq n'apparaît pour l'instant que dans une description de manifest
         (« Boq veut te parler. Cours. »). Le regard qui part sur le côté et
         la bouche en O, c'est tout son personnage : il attend une réponse. */
      nom: "Boq",
      mention: "il attend toujours",
      look: {
        peau: "#f3ddcb", cheveux: "frange", couleurCheveux: "#8a5a2b",
        haut: "#3f7d3f", bas: "#6b4a2b", bouche: "o", regard: "droite",
      },
    },
    {
      nom: "Mads Prout",
      mention: "l'ennemi",
      look: {
        peau: "#f0c39a", cheveux: "chauve", couleurCheveux: "#7a4a2b",
        haut: "#8b1e3f", bas: "#2b1a2e", accessoire: "lunettes",
        bouche: "sourire-large", regard: "face",
      },
    },
  ],

  /* =========================================================
     2. Les couples préréglés
     ---------------------------------------------------------
     Le clin d'œil à l'univers : un clic remplit les deux champs et lance le
     test. Ce sont les couples dont tout le monde parle dans les couloirs —
     la machine, elle, n'a pas d'avis avant d'avoir calculé.
     ========================================================= */

  /* =========================================================
     3. Les tranches de verdict
     ---------------------------------------------------------
     Sept paliers, du désastre au destin. `cran` est l'étiquette du voyant
     correspondant sur la colonne de la machine : les tranches et les voyants
     sont la même liste, sinon les deux se contrediraient au premier ajout.
     Chaque tranche a trois formulations — laquelle tombe dépend du couple,
     pas du hasard, donc elle non plus ne change pas d'un essai à l'autre.
     ========================================================= */
  TRANCHES: [
    {
      min: 0,
      cran: "Fuyez",
      titre: "La machine a fait un bruit inquiétant",
      textes: [
        "J'ai recommencé trois fois. La troisième, l'aiguille est partie dans l'autre sens.",
        "Ces deux prénoms ne devraient pas être saisis dans la même machine.",
        "Le résultat est négatif.",
      ],
    },
    {
      min: 9,
      cran: "Non",
      titre: "Non.",
      textes: [
        "Vous pouvez rester dans la même pièce.",
        "Il y a une étincelle. C'est un court-circuit, mais c'est une étincelle.",
        "Ça peut marcher.",
      ],
    },
    {
      min: 25,
      cran: "Amis",
      titre: "Amis, et rien de plus",
      textes: [
        "Amitié solide, romance nulle.",
        "Vous vous prêtez vos notes de cours.",
        "Le genre de duo qui se raconte tout, y compris ses rendez-vous ratés avec d'autres.",
      ],
    },
    {
      min: 42,
      cran: "Peut-être",
      titre: "Ça dépend des jours",
      textes: [
        "Pile au milieu.",
        "Ça marche les jours pairs.",
        "Cinquante-cinquante.",
      ],
    },
    {
      min: 58,
      cran: "Ça chauffe",
      titre: "Il se passe quelque chose",
      textes: [
        "Il se passe un truc. Tout le monde l'a remarqué sauf vous deux.",
        "Ça tient. Le campus a déjà parié dessus.",
        "L'aiguille a tremblé vers le haut.",
      ],
    },
    {
      min: 74,
      cran: "Sérieux",
      titre: "C'est très sérieux",
      textes: [
        "Prévoyez un anniversaire commun et une playlist partagée.",
        "C'est plus qu'un coup de cœur.",
        "Je recommande d'y aller. Je ne recommande jamais rien, alors profitez-en.",
      ],
    },
    {
      min: 90,
      cran: "Destin",
      titre: "Alerte rouge : c'est le destin",
      textes: [
        "J'ai grillé deux voyants et je ne regrette rien.",
        "C'est écrit en grand, en rose, et ça clignote.",
        "Mariez-vous. Je serai témoin, j'ai déjà le nœud papillon.",
      ],
    },
  ],

  /* =========================================================
     4. Les trois relevés annexes
     ---------------------------------------------------------
     Ils ne sont PAS une décomposition du pourcentage : chacun est tiré de son
     propre sel (voir hachage.js). C'est volontaire — une moyenne de trois
     nombres se tasserait autour de 50 %, et une machine qui affiche toujours
     « à peu près moyen » n'amuse personne. Résultat : les relevés
     contredisent parfois le verdict, ce qui est exactement ce qu'on attend
     d'un appareil qui n'a jamais été révisé.
     ========================================================= */
  AXES: [
    {
      nom: "Alchimie",
      sel: "alchimie",
      ecart: 20,
      commentaires: [
        "aucune réaction en éprouvette",
        "ça mousse un peu sur les bords",
        "l'éprouvette a fondu",
      ],
    },
    {
      nom: "Complicité",
      sel: "complicite",
      ecart: 24,
      commentaires: [
        "vous ne riez jamais aux mêmes blagues",
        "un fou rire par trimestre",
        "vous finissez les phrases de l'autre",
      ],
    },
    {
      nom: "Risque de drame",
      sel: "drame",
      ecart: 22,
      inverse: true,
      commentaires: [
        "personne ne pleurera",
        "une dispute pour une histoire de veste",
        "prévoyez des mouchoirs et un public",
      ],
    },
  ],

  /* Ce que la machine marmonne pendant qu'elle chauffe. Quatre lignes sont
     tirées par couple, toujours les mêmes pour un couple donné. */
  ETAPES: [
    "Comptage des voyelles communes",
    "Alignement des consonnes",
    "Consultation des archives d'Augusta",
    "Croisement avec les rumeurs du couloir C",
    "Vérification des signes astrologiques",
    "Chauffe du condensateur à cœur",
    "Interrogation du perroquet témoin",
    "Pesée des silences gênés",
    "Analyse spectrale des surnoms",
    "Second avis demandé à la machine du hall",
  ],

  /* Tout le monde tape deux fois le même prénom au bout de trois essais.
     Autant que la machine ait quelque chose à en dire. */
  AUTO_TEST:
    "Tu as saisi deux fois le même prénom. Le résultat est de 100 %, " +
    "forcément.",

  /* La petite ligne sous le cadran, celle qui décrédibilise tout le reste. */
  MENTIONS: [
    "La machine ne se trompe jamais. Elle a été vérifiée en 2009.",
    "Résultat identique à chaque essai.",
    "Aucun prénom n'a été blessé pendant l'analyse.",
    "Les réclamations se font auprès du club d'échecs de la fac.",
    "Ce verdict n'a aucune valeur juridique.",
    "Testé sur 4 000 lycéens.",
    "En cas de désaccord avec le résultat, c'est vous qui avez tort.",
    "Inverser les deux prénoms ne change rien.",
  ],

  /* =========================================================
     5. De quoi fabriquer un visage inconnu
     ---------------------------------------------------------
     Un prénom qui n'est pas au casting reçoit quand même un portrait, tiré
     de son propre hachage : « Camille » aura toujours la même tête, chez
     tout le monde et pour toujours. C'est le même contrat que le
     pourcentage, appliqué au dessin.
     ========================================================= */
  PALETTE: {
    peaux: ["#f8dcc0", "#f3ddcb", "#f0c39a", "#d99a6c", "#a9683f", "#7a4a2b"],
    cheveux: ["court", "boucle", "long", "frange", "queue", "crete", "couettes"],
    couleursCheveux: ["#2b1a2e", "#4a2c17", "#8a5a2b", "#c98a3a", "#e8b84b", "#b03a3a", "#6b4a8a"],
    hauts: ["#ff6b9d", "#4de0ff", "#c6ff4d", "#9b4dff", "#ffd84d", "#2e7d5b", "#e0446b", "#4ba3e3"],
    bas: ["#3a4a7a", "#3a2b4e", "#2f3550", "#6b4a2b", "#1f2b3a"],
    bouches: ["sourire", "neutre", "sourire-large", "o", "bisou"],
    accessoires: [null, null, "lunettes", "noeud", "serretete", "casquette"],
  },
};
