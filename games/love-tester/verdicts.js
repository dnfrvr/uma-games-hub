/* =========================================================
   Love Tester — tout ce que la machine a le droit de dire
   ---------------------------------------------------------
   Le moteur (main.js) ne contient AUCUN texte : il ne sait que lire ce
   fichier. Ajouter une tranche de verdict ou un personnage ne demande donc pas
   de toucher au code — c'est la convention du projet (charts.js pour Glinda,
   roster.js pour Elias, decors.js pour Eoghan).

   La machine est un appareil à TEXTE, sans aucun visage. Chaque personnage
   portait ici un `look` complet pour son portrait dessiné, et il fallait en
   plus une palette pour inventer une tête aux prénoms inconnus. Les deux sont
   partis : un prénom reconnu affiche sa mention, un prénom inconnu affiche
   « inconnu au bataillon », et c'est tout ce que la machine a besoin de dire
   d'une personne.

   Un seul global, `DONNEES_LOVE`, pour ne rien risquer.
   ========================================================= */

const DONNEES_LOVE = {
  /* =========================================================
     1. Le casting — les prénoms que la machine reconnaît
     ---------------------------------------------------------
     `nom` sert à la reconnaissance (insensible aux accents et à la casse, cf.
     hachage.js), `mention` est la petite ligne affichée sous le champ. Rien
     d'autre : le pourcentage ne dépend PAS d'être au casting, il ne dépend que
     des deux prénoms. Y figurer ne change que la légende.
     ========================================================= */
  CASTING: [
    {
      nom: "Drew",
      mention: "Dress my Drew",
    },
    {
      nom: "Glinda",
      mention: "Pep Rally Rhythm",
    },
    {
      nom: "Elias",
      mention: "Sanity Whack",
    },
    {
      nom: "Eoghan",
      mention: "Kiss & Cache",
    },
    {
      nom: "Nils",
      mention: "UMA Bros",
    },
    {
      nom: "Elphie",
      mention: "UMA Bros",
    },
    {
      /* Boq n'apparaît pour l'instant que dans une description de manifest
         (« Boq veut te parler. Cours. »). Le regard qui part sur le côté et
         la bouche en O, c'est tout son personnage : il attend une réponse. */
      nom: "Boq",
      mention: "il attend toujours",
    },
    {
      nom: "Mads Prout",
      mention: "l'ennemi",
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

};
