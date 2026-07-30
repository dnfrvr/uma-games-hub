# CLAUDE.md

Ce fichier donne le contexte permanent du projet à Claude Code. À lire avant toute
tâche. Les specs détaillées par jeu sont dans les fichiers `*-SPEC.md` à la racine.

## Le projet
**uma-games-hub** : un portail façon **site de jeux Flash de 2012** — la référence
n'est pas seulement girlsgogames mais aussi Miniclip, Kongregate, Armor Games, Y8 —
qui regroupe des mini-jeux, un par personnage principal d'un JDR/univers narratif
appelé *IT: Welcome to UMA*. Chaque jeu est goofy et exploite un trait de
personnalité, sans raconter le lore/l'intrigue.

| Perso | Jeu | Dossier | Genre |
|-------|-----|---------|-------|
| Drew | **Dress my Drew** | `games/drew-dress-up/` | habillage, score de mauvais goût |
| Glinda | **Pep Rally Rhythm** | `games/glinda-cheer/` | rythme, 4 chorégraphies |
| Elias | **Sanity Whack** | `games/elias-whack/` | whack-a-mole, difficulté sans plafond |
| Eoghan | **Kiss & Cache** | `games/eoghan-office/` | infiltration, 4 décors |
| Au choix | **UMA Bros** | `games/uma-bros/` | plateforme, 3 niveaux, 7 ennemis |
| Glinda | **Run, Glinda, Run** | `games/glinda-run/` | course sans fin, Boq poursuit |
| Drew | **Derry Driver** | `games/derry-driver/` | conduite de profil, relief et élan |
| Mads Prout | **Balance ta tomate** | `games/tomates/` | tir à trajectoire, cible qui esquive |
| Tout le monde | **UMA Memory** | `games/uma-memory/` | paires par duos, pas par doublons |
| Tout le monde | **Love Tester** | `games/love-tester/` | gadget, verdict déterministe |

**Les dix jeux sont finis, jouables et branchés au hub.** Chacun a son propre
habillage (voir la règle des habillages plus bas) et, pour la plupart, son banc
d'essai dans son dossier ou dans `outils/`. Ce qui reste est du contenu et du
polish — voir « État d'avancement » en bas de ce fichier.

**Aucun des jeux récents n'a été vu à l'œil en écran étroit ni en plein écran.**
Ils ont été construits en parallèle par des agents dont l'onglet de navigateur
était en arrière-plan, ce qui y gèle `requestAnimationFrame` : toute leur
logique est éprouvée en Node, leur ALLURE ne l'est pas. C'est la première chose
à reprendre.

Voir `uma-games-hub-SPEC.md` pour l'architecture du hub/sidebar, et les fichiers
`dress-my-drew-SPEC.md` / futures specs Glinda-Elias pour le détail de chaque jeu.

## Règles générales
- **Aucun build step** : HTML/CSS/JS vanilla partout, pas de React/webpack/vite.
  Chaque page doit pouvoir être servie telle quelle avec `python3 -m http.server`.
- **Chemins relatifs uniquement** dans chaque jeu, pour rester déplaçable/robuste.
- Ne jamais casser la mécanique d'un jeu existant pour une tâche d'intégration
  visuelle/architecture — si un changement de logique de jeu est nécessaire, le
  signaler avant de le faire plutôt que de le faire silencieusement.

## Structure du repo
```
uma-games-hub/
├── CLAUDE.md                   # ce fichier
├── ILLUSTRATIONS.md             # mode d'emploi du remplacement des SVG
├── uma-games-hub-SPEC.md        # spec du hub + sidebar + manifest
├── dress-my-drew-SPEC.md        # spec du jeu de Drew
├── games-manifest.json          # source unique de vérité : la liste des jeux
├── pubs.json                    # les annonceurs d'Augusta (régie publicitaire)
├── index.html                   # page d'accueil / hub
├── style-hub.css
├── shared/
│   ├── style-tokens.css         # variables CSS (couleurs, polices, ombres)
│   ├── components.css           # mobilier commun (fond, .shell, bandeau, footer…)
│   ├── portail.css              # LA COQUE : barre de service, annonces, fil
│   │                            #   d'Ariane, pubs, notes, lecteur, pied de page
│   ├── skins.css                # un habillage de bandeau-titre PAR JEU
│   ├── perso.js                 # fabrique de personnages chibi (persoSVG, spectateurSVG)
│   ├── navbar.js / navbar.css   # en-tête du site (service + navigation + annonces)
│   ├── sidebar.js / sidebar.css # renderSidebar(currentGameId, targetElementId)
│   ├── lecteur.js               # renderLecteur(gameId) : habillage d'une page de jeu
│   ├── pub.js                   # renderPubs(...) : la régie, créations en rotation
│   ├── pied.js                  # renderPied(...) : LE pied de page, celui du site
│   ├── favoris.js               # umaFavoris : le ★ des jeux, en localStorage
│   ├── sparkle.js               # paillettes du curseur + compteur de visites
│   └── vignettes/               # vignettes SVG des jeux (placeholders)
├── outils/                      # bancs d'essai Node (voir outils/LISEZMOI.md)
└── games/
    ├── drew-dress-up/           # index/style/main/layers/export/decors/silhouettes
    ├── glinda-cheer/            # index/style/main + charts.js (chorégraphies)
    ├── elias-whack/             # index/style/main + roster.js (casting dessiné)
    └── eoghan-office/           # index/style/main + decors.js (3 salles + mobilier)
```

Squelette d'une page de jeu — le jeu est **encastré dans un lecteur**, comme sur
un portail Flash de l'époque :

```
#navbar                          ← en-tête du site, injecté par renderNavbar
.page
├── .colonne-jeu
│   ├── #fil-ariane              ← Accueil » Catégorie » Jeu
│   ├── .lecteur
│   │   ├── #lecteur-chargement  ← la jauge « chargement… prêt »
│   │   ├── .lecteur-scene       ← le bezel sombre
│   │   │   └── .shell           ← le jeu lui-même, inchangé
│   │   └── #lecteur-outils      ← note, favori, plein écran, recommencer
│   └── #fiche-jeu               ← « À propos de ce jeu »
└── #sidebar-autres-jeux
```

Scripts, dans cet ordre : ceux du jeu, puis `favoris.js`, `sparkle.js`,
`navbar.js`, `sidebar.js`, `lecteur.js`, puis les appels `renderNavbar(id,
"navbar")` / `renderSidebar(id, "sidebar-autres-jeux")` / `renderLecteur(id)`.
`favoris.js` doit passer **avant** `navbar.js` et `lecteur.js`, qui s'en servent.

Le squelette du lecteur est en dur dans le HTML et **jamais construit à
l'exécution** : déplacer le jeu dans le DOM après le chargement de ses scripts
casserait les mesures que plusieurs font au démarrage (le cadrage de Drew,
notamment).

## Direction artistique (DA) commune
Tous les jeux + le hub partagent la même DA rétro 2012 kitsch via `shared/`.
- Importer **dans cet ordre**, dans le `<head>` de chaque page :
  ```html
  <link rel="stylesheet" href="../../shared/style-tokens.css" />
  <link rel="stylesheet" href="../../shared/components.css" />
  <link rel="stylesheet" href="../../shared/navbar.css" />
  <link rel="stylesheet" href="../../shared/sidebar.css" />
  <link rel="stylesheet" href="../../shared/portail.css" />
  <link rel="stylesheet" href="../../shared/skins.css" />
  <link rel="stylesheet" href="style.css" /> <!-- spécifique au jeu, en dernier -->
  ```
  (adapter le nombre de `../` selon la profondeur réelle du fichier)

### RÈGLE : le site ne parle jamais de lui comme d'un chantier
Le bandeau d'annonces, les anecdotes et les étiquettes sont écrits **dans la voix
d'un portail de 2012 qui tourne**, pas dans celle de qui le fabrique. Un jeu qui
n'est pas sorti est une **prochaine sortie**, jamais un « jeu pas fini » ni un jeu
« en chantier » ; l'étiquette sur sa vignette dit « Prochainement ». Les annonces
se déduisent du manifest (dernière sortie, tête du classement, mieux noté, nombre
de jeux, liste des sorties à venir) : elles restent donc vraies quand le catalogue
bouge, sans qu'on ait une ligne à réécrire.

### La navigation haute liste les CATÉGORIES, pas les jeux
Un onglet par jeu tenait à quatre jeux ; à neuf, le ruban devient un mur de
pastilles où plus rien ne se lit. La barre liste donc les catégories, chacune
pointant vers `index.html?categorie=…` que le hub sait filtrer. L'onglet allumé
est celui de la catégorie du jeu ouvert (et prend la couleur du perso), ou celui
qu'on filtre sur l'accueil ; sinon c'est « Accueil ». Rien n'est écrit en dur :
les catégories et leurs comptes se déduisent du manifest.

### Un seul pied de page, et des pubs partout
Les jeux avaient chacun leur pied de page avec son compteur de visites : ça
faisait deux pieds empilés sur une page de jeu, et autant de compteurs que de
jeux, ce qui ne veut rien dire. Il n'y en a plus qu'UN, celui du site
(`shared/pied.js`), sur les cinq pages, avec **un seul** compteur (`uma_visites`).
Le rendu est synchrone et appelé en fin de `<body>` : le compteur existe donc
avant que `sparkle.js` ne le remplisse au DOMContentLoaded.

La régie tourne aussi sur les pages de jeu — bannière sous le fil d'Ariane,
pavé sous le rail « jeux similaires » — avec la même rotation qu'à l'accueil.

**Lisibilité des titres.** Le contour du WordArt était à 5–9 px : à cette
épaisseur il bouche les contre-formes et le titre devient un pâté. Il est à
2–4 px, l'ombre portée est passée de 4/5 px durs à 2/3 px doux, et le
remplissage doré a perdu ses arrêts blancs — le balayage de brillance effaçait
les lettres au passage. Ne pas les remonter.

### La coque et la feuille — la hiérarchie visuelle
La référence n'est pas seulement girlsgogames mais **les portails Flash de 2012
en général** (Miniclip, Kongregate, Armor Games, Y8). Ce qu'ils avaient tous, et
qui manquait ici : une **coque sombre** (barre de service, en-tête, cadre du
lecteur, pied de page) qui enveloppe une **feuille claire** portant le contenu.
Avant, tout portait le même trait de 3 px et la même ombre dure : rien ne
reculait, et la page se lisait comme un tas d'autocollants plutôt que comme un
site. La règle, désormais :

| Couche | Rôle | Traitement |
|--------|------|------------|
| Coque (`--coque`, `--coque-clair`) | en-tête, lecteur, pied de page | dégradé sombre, filet `--coque-bord`, **ombre dure** |
| Feuille (`--feuille`) | blocs de contenu, cartes, listes | blanc, filet d'un cheveu `--reglure-forte`, ombre douce |
| Accent (`--bonbon`, `--or`) | boutons, soulignés de rubrique, notes | le rose bonbon joue ici le rôle que l'orange tenait chez Kongregate |

Le relief se fabrique toujours pareil, « biseauté Web 2.0 » : dégradé vertical
clair→sombre, filet blanc translucide en haut, filet sombre en bas.

- **L'en-tête est sombre de bout en bout.** Une version intermédiaire gardait le
  dégradé bonbon/lilas/piscine sur la rangée de navigation entre deux bandes
  sombres : ça se lisait comme une hésitation, pas comme un choix, et ça cassait
  la hiérarchie qu'on venait d'installer. Les trois bandes se distinguent par
  leur seule **valeur** (la navigation est la plus claire), et le dégradé bonbon
  reste là où il veut dire quelque chose : le bandeau-titre **dans** chaque jeu.
- **Un seul système de formes.** Avant, la même page mélangeait des pilules
  (999 px) et des angles à 3, 4, 5, 6, 8, 10, 12 et 14 px. Désormais trois
  jetons, et rien d'autre : `--radius-etiquette` (3 px, ce qui ne se clique
  pas), `--radius-controle` (4 px, **tout** ce qui se clique), `--radius-bloc`
  (5 px, les boîtes). Les pilules `--radius-button` et `--radius-panel` restent
  définies mais ne servent plus qu'à **l'intérieur** des jeux.
- **Un seul contour.** Tout ce qui est posé sur le papier peint — en-tête, blocs,
  lecteur, pied de page — porte le même filet d'un cheveu et la même
  `--ombre-bloc`. La hiérarchie ne passe plus par l'épaisseur du cadre mais par
  la valeur : coque sombre contre feuille blanche. Seul le bouton JOUER garde une
  ombre dure, parce que c'est l'action principale de la page.

- **Deux polices, deux rôles.** `--font-title` (Comic Sans) porte la
  personnalité : titres de jeux, texte d'ambiance, boutons de jeu.
  `--font-ui` (Tahoma/Verdana) porte le **mobilier** : menus, notes, votes,
  compteurs, mentions. À 11 px Comic Sans devient illisible, et surtout ce
  n'est pas ce que les vrais sites employaient — leur interface était en
  Tahoma/Verdana/Arial. Ne pas écrire de métadonnée en Comic Sans.
- **On ne sélectionne pas le texte.** `components.css` pose `user-select: none`
  sur le `body` (plus la coupure du halo bleu au tap et du menu d'appui long) :
  un site de jeux ne doit pas se manipuler comme un document. Les `input` et
  `textarea` sont rendus à leur métier juste après, sinon la recherche devient
  inutilisable. Et `body` porte `min-height: 100%`, **pas** `height` : avec une
  hauteur fixe, sa boîte s'arrête au bas de la fenêtre et le `padding-bottom`
  se dessine au milieu de la page — la marge sous le pied de page disparaît.
- **Attention aux collisions de classes.** Le CSS n'a qu'un seul espace de
  noms et le style d'un jeu est chargé **après** la coque : un nom commun et
  c'est le jeu qui gagne. Déjà vécu — `.note` (les notes qui tombent chez
  Glinda) écrasait la note sur 10 du lecteur, renommée `.notation`.
  `node outils/test-collisions.js` monte la garde.
- Chaque page de jeu ajoute une classe thème sur `<body>` : `theme-drew`,
  `theme-glinda`, `theme-eoghan`, `theme-elias` → applique automatiquement la bonne
  couleur d'accent partout où `var(--accent)` est utilisé.
- **Couleurs d'accent par perso** (reprises du lore, déjà dans `style-tokens.css`) :
  - Drew : `#aa6caa`
  - Glinda : `#e91e8c`
  - Eoghan : `#00d435`
  - Elias : `#6672d0`
- Le `style.css` propre à un jeu ne doit contenir QUE ce qui est spécifique à ce jeu
  (mise en page de la scène de jeu, animations propres). Toute couleur/police/ombre
  générique doit passer par une variable de `shared/style-tokens.css`.
- **Les personnages de tous les jeux sortent de `shared/perso.js`** : `persoSVG({...})`
  dessine un chibi paramétrable (peau, coiffure, tenue, jupe, pompons, regard, bouche,
  pose, accessoire) et `spectateurSVG()` une silhouette allégée pour les foules. Un
  nouveau personnage = de nouvelles options, jamais un nouveau style de dessin.

### RÈGLE : un habillage complet par jeu
**Chaque jeu a son propre habillage** — écran-titre ET interface — pour qu'on
sache d'un coup d'œil sur lequel on est. C'est ce que faisaient les portails
Flash : le site avait sa coque, mais chaque jeu arrivait avec sa police, ses
couleurs et ses boutons.

Tout se joue dans `shared/skins.css`, qui ne contient **que des variables**
posées sur la classe de thème du `<body>` :

| Famille | Variables | Ce que ça rhabille |
|---------|-----------|--------------------|
| Bandeau | `--banner-fond`, `--banner-trait` | le fond de l'écran-titre |
| Titre | `--titre-police`, `-graisse`, `-style`, `-taille`, `-casse`, `-espacement`, `-cerne`, `-cerne-epaisseur`, `-remplissage` | le WordArt |
| Accroche | `--tagline-*` | la ligne sous le titre |
| Panneaux | `--panel-bg`, `--trait`, `--radius-panel` | les encadrés et le HUD du jeu |
| Boutons | `--btn-fond`, `-cadre`, `-encre`, `-rayon`, `-ombre`, `-police`, `-casse`, `-espacement`, `-fond-primaire`, `-encre-primaire` | `.fun-btn` |
| Pied de jeu | `--footer-fond` | le pied de page DANS le cadre du jeu |

Les règles qui les consomment sont dans `components.css`, avec les valeurs de
Drew en repli. **Attention à `--panel-bg`** : les thèmes le réhabillent, donc
le mobilier de portail qui s'en servait (pastilles de navigation, survol du
rail) pointe désormais sur `--chrome-panel`, figé. Sans ça la coque changeait
de couleur d'un jeu à l'autre.

| Jeu | Habillage | Titre | Boutons |
|-----|-----------|-------|---------|
| Drew | carnet à stickers, dégradé bonbon | Comic Sans cerné, doré scintillant | pilules roses à ombre dure (la référence) |
| Glinda | tribune d'Augusta, bleu marine à bandes obliques | Impact capitales, blanc sur or | marine cerclés d'or, capitales |
| Elias | dossier classé, bande vidéo et lignes de balayage | Courier vert moniteur | ardoise en Courier, le principal en rouge REC |
| Eoghan | couverture de magazine à potins, rose vers vert, semé de cœurs | Georgia italique | blancs cerclés de vert épais, encre rose |

**Deux polices d'affiche, deux portées.** `--font-enseigne` (Lobster) est
l'enseigne du SITE : le logo de l'en-tête et le héros de l'accueil, et rien
d'autre. Elle est **figée**, aucun thème n'y touche — sinon la marque changerait
de tête d'un jeu à l'autre. `--font-deco` est la police d'affiche **à l'intérieur
d'un jeu** : son titre, mais aussi les titres de ses écrans et de ses panneaux.
Chaque thème la remplace par la sienne, donc aucun jeu ne sonne comme son voisin.
Avant, une seule variable servait aux deux rôles et tout le site parlait Lobster.

Deux garde-fous en ajoutant un jeu :
1. **La coque du portail ne bouge pas.** En-tête, lecteur, fil d'Ariane, pied de
   page et colonne latérale restent identiques partout : c'est ce qui fait qu'on
   reste sur le même site. Seul l'INTÉRIEUR du cadre change.
2. **On reste en 2012.** Des polices présentes sur les machines de l'époque
   (Impact, Courier New, Georgia) ou déjà chargées (Lobster), des contours
   épais, des dégradés verticaux. Pas de subtilité typographique.

Un remplissage plat s'écrit en dégradé d'une seule couleur
(`linear-gradient(0deg, #x, #x)`) : la machinerie de brillance reste en place,
elle n'a simplement plus rien à faire scintiller.

## `games-manifest.json`
Source unique de vérité pour le hub, l'en-tête, la sidebar ET le lecteur.
Champs par entrée :

| Champ | Sert à |
|-------|--------|
| `id`, `titre`, `perso`, `description` | partout |
| `vignette`, `url` (relatif à la racine, `null` si absent), `couleur` | partout |
| `statut` | `"disponible"` ou `"bientot"` |
| `categorie` | **la navigation haute**, le fil d'Ariane, la liste des catégories, le rail « jeux similaires » |
| | Ce sont de **larges paniers**, façon portail : Action, Habillage, Rapidité, Réflexion. Une catégorie par jeu ne fait pas un rail de catégories — quand chaque compteur vaut 1, autant ne rien afficher. Aventure et Course ont été refondues dans Action, Rythme dans Rapidité, pour cette raison. |
| `note` (sur 10), `votes` | les étoiles, le tri « les mieux notés » |
| `parties` | le classement, la barre d'outils, le total de l'en-tête |
| `ajoute_le` (`AAAA-MM-JJ`) | le tri « nouveautés » et le choix du **jeu à la une** |
| `controles` | la fiche du jeu |

Un jeu `"statut": "bientot"` n'a ni `url`, ni `note`, ni `votes`, ni `parties`, ni
`ajoute_le` — il n'est pas sorti, il n'a rien à afficher. Le hub le gère :
il est écarté de la une, du classement et des réclames, ses étoiles ne sont pas
rendues (cinq étoiles grises se liraient comme un zéro) et il **passe toujours en
fin de liste**, quel que soit le tri. Il suffit donc d'ajouter une entrée et une
vignette pour annoncer un jeu, sans écrire une ligne de moteur.

## `pubs.json` — la régie
Les annonceurs d'Augusta, affichés dans les emplacements publicitaires du hub.
Champs : `id`, `annonceur`, `titre`, `accroche`, `bouton`, `glyphe`, `couleur`,
`couleur2`, `encre`. Pas d'`url` : ce sont des décors, donc **aucun lien mort** —
seules les réclames maison (fabriquées depuis le manifest par `shared/pub.js`)
sont cliquables, et elles mènent au jeu.

Les emplacements **tournent** : une création toutes les 7 s, en fondu, comme
n'importe quelle régie de l'époque. La rotation se met en pause quand l'onglet
est masqué et ne démarre pas du tout si le système demande moins d'animation.
Quand de vraies images d'annonceurs existeront, ajouter un champ `image` à
l'entrée : le rendu la prendra si elle est là, sinon il retombe sur la création
dessinée en CSS — la même méthode que pour le reste de l'art.

Ne jamais dupliquer ces infos ailleurs en dur — toujours lire ce fichier. Les
chiffres (`note`, `votes`, `parties`) sont de la fiction d'ambiance, assumée :
c'est un portail imaginaire. Mais rien ne doit être écrit en dur dans une page —
le total de parties de l'en-tête, les comptes par catégorie et le classement se
recalculent tous depuis ce fichier.

## Comment tester en local
```bash
python3 -m http.server 8000       # puis ouvrir http://localhost:8000
node outils/test-jeux.js          # 59 vérifications de règles, sans navigateur
node outils/test-collisions.js    # aucun nom de classe partagé coque ↔ jeux
node outils/test-assets.js        # 67 vérifications de la chaîne d'images
node outils/scan-assets.js        # indexe les illustrations déposées
```
Note : `http.server` est **mono-thread**. Il suffit pour jouer, mais il se bloque
dès qu'on charge plusieurs pages en parallèle (banc d'essai qui ouvre des iframes
à différentes largeurs) : passer alors par `ThreadingHTTPServer`.
Les jeux eux-mêmes n'ont **aucune dépendance** : Node ne sert qu'aux bancs d'essai.
Penser au **rechargement forcé** (Ctrl+Maj+R) après une modif de CSS/JS : le serveur
Python ne renvoie pas d'en-tête anti-cache et le navigateur garde l'ancienne version.

## Convention de commit
Commits courts en français, à l'impératif : `Ajoute la sidebar`, `Corrige le rendu du hub`,
`Intègre la DA sur le jeu d'Elias`.

## État d'avancement (à tenir à jour)
- [x] Jeu de Drew : prototype fonctionnel (placeholders), importé dans le monorepo.
- [x] Hub minimal (index.html + games-manifest.json).
- [x] Sidebar partagée branchée sur le jeu de Drew.
- [x] DA de Drew refactorée pour utiliser `shared/` (et DA commune alignée sur celle
      de Drew : `components.css` porte désormais le fond, le cadre, le bandeau, le
      pied de page et les paillettes).
- [x] Jeu d'Eoghan : spécifié (« Kiss & Cache », voir `uma-games-hub-SPEC.md`).
- [x] Jeu de Glinda (Pep Rally Rhythm) : prototype jouable — 3 chorégraphies,
      jugement Parfait/Bien/Raté, jauge de hype, combo, son synthétisé (WebAudio).
- [x] Jeu d'Elias (Sanity Whack) : prototype jouable — grille 4×3, pièges,
      jauge de sanity, dégradation VHS par palier, vagues.
- [x] Jeu d'Eoghan (Kiss & Cache) : prototype jouable — 3 décors, cônes de vision,
      bisous à maintien de touche, jauge de ragots, score/combo.
- [x] Les 4 jeux sont branchés au hub (manifest « disponible », navbar, sidebar).
- [x] Passe visuelle : plus aucun emoji comme personnage. Tout est dessiné en SVG
      via `shared/perso.js` — cheerleaders d'Augusta et tribune pleine pour Glinda,
      créatures et avatar réactif d'Elias, casting complet de Kiss & Cache.
- [x] Kiss & Cache repassé **en vue de côté** (deux rangées de profondeur, faisceaux
      de regard, meubles qui coupent la vue) pour coller aux jeux de bisous d'époque.
- [x] Équilibrage : la finale de Glinda était injouable (101 ms entre deux notes)
      et le niveau 3 d'Eoghan plus sûr que le niveau 1. Les deux sont mesurés
      maintenant (densité de notes, part de salle surveillée) et la courbe monte.
- [x] Dialogues de Sanity Whack à la première personne (c'est Elias qui parle),
      casting élargi : Pennywise et Slenderman à taper, Drew/Eoghan/Glinda et
      Toto le perroquet à éviter.
- [x] Bancs d'essai rangés dans `outils/` : ils tournent sans navigateur et
      remplacent ce que les captures d'écran ne savent pas vérifier.
- [x] Barre de navigation retravaillée pour le téléphone (sous 720 px) : deux
      rangées au lieu de trois (marque + « Au hasard ! » en haut, ruban d'onglets
      en dessous), pastilles à 35 px de haut au lieu de 22, ascenseur du ruban
      repeint aux couleurs du site, bords en fondu du côté où il reste des jeux,
      et l'onglet de la page courante est amené sous les yeux au chargement.
- [x] **Le site ressemble enfin à un portail Flash de 2012**, pas seulement à
      une page rose. Ce qui a été ajouté, et qui manquait :
      - la **coque sombre** et sa hiérarchie (voir la DA plus haut) ;
      - une **barre de service** (recherche qui filtre pour de vrai, compteur de
        favoris) et un **bandeau d'annonces** déroulant, injectés par `navbar.js`
        donc présents sur les 5 pages ;
      - des **emplacements publicitaires** aux formats de l'époque (728×90 et
        300×250), remplis de réclames maison pour les jeux du site ;
      - des **notes sur 10**, des compteurs de parties, un **classement**, une
        liste de **catégories**, un tri (nouveautés / notes / parties / A→Z) ;
      - un **jeu à la une** = le dernier arrivé d'après `ajoute_le` ;
      - le **lecteur** sur les pages de jeu : bezel, jauge de chargement, barre
        d'outils (note, favori, plein écran, recommencer) et fiche « à propos » ;
      - des **favoris** en localStorage, vraiment fonctionnels ;
      - le rail « Tu aimeras aussi » redessiné en liste dense avec catégories.
      Le grand titre WordArt du hub a disparu au passage : un vrai portail
      n'avait pas de titre de page géant, il avait un **logo** dans son en-tête.
      C'est ce qu'est devenue la marque (`.marque-nom` + `.marque-slogan`).
- [x] Deux jeux annoncés en placeholders : **UMA Memory** et **Run, Glinda, Run**
      (course sans fin, Boq la poursuit). Entrées de manifest + vignettes SVG,
      aucun moteur.
- [x] **Régie publicitaire** (`pubs.json` + `shared/pub.js`) : cinq annonceurs
      d'Augusta (le Starbucks du campus, le club d'échecs de la fac, l'Instagram
      de @glindatheverygood, le SoundCloud de @eoghanmasuda, l'appel à témoins
      sur les disparitions) mélangés aux réclames maison, en rotation toutes les
      7 s. Les deux emplacements d'une page ne montrent jamais la même chose.
- [x] **Passe d'écriture sur tous les textes des jeux (2026-07-30).** Le défaut
      était de rythme, pas de vocabulaire : presque chaque réplique du projet
      était bâtie sur le même moule — une phrase de mise en place, puis une
      chute pince-sans-rire. Enchaînées par centaines, elles donnaient au site
      un ton de stand-up épuisant, parce qu'aucune ligne n'avait le droit
      d'être plate. **La règle désormais : une vanne sur trois ou quatre
      lignes, les autres constatent.** Une bonne chute isolée porte ; la même
      cadence répétée vingt fois ne porte plus rien.
      À proscrire quand tu ajoutes du texte : le doublet « X. Y. » systématique,
      la formule « ce n'est pas X, c'est Y », les triades (« Il salue, il rentre,
      il recommencera demain »), la reprise en écho (« Toutes. », « Personne. »,
      « Techniquement. ») et le mot seul en fin de phrase pour appuyer
      (« Vraiment. », « Franchement. », « Bravo. »).
      Ce qui a été **gardé volontairement** : les vannes qui tiennent en une
      seule phrase (« Une tenue de soirée. Il est quatorze heures. »), la voix
      paniquée d'Elias, le cabotinage de Mads, et **tout le pastiche 2012 du
      hub** — livre d'or fautes comprises, anecdotes, bandeau d'annonces,
      slogans de pubs — qui n'a pas été touché, sur décision explicite.

- [x] **Passe mobile sur les dix jeux (2026-07-30).** Deux problèmes, mesurés au
      navigateur à 390 × 844 avant de toucher à quoi que ce soit.
      1. **La coque mangeait l'écran.** Le terrain de jeu commençait entre 471 et
         524 px sur 840 de haut, soit à 56–62 % de la hauteur : il fallait
         scroller à chaque partie pour voir ce qu'on jouait. Récupéré ~210 px en
         écran étroit (`portail.css` §9, `components.css`) — la bannière 728 × 90
         est masquée sous 860 px (elle n'a jamais tenu à cette largeur, et le
         pavé 300 × 250 de la colonne reste, donc la régie tourne toujours), la
         barre de service passe sur UNE ligne (la salutation et le compte
         anonyme sont des ornements d'accueil), la jauge de chargement est
         masquée (c'est un décor, cf. `lecteur.js`), et l'accroche du
         bandeau-titre part sous 640 px (on vient de la lire sur la vignette).
         Résultat : le jeu commence à 264–309 px et **9 jeux sur 10 tiennent
         entièrement dans l'écran**. Drew a fallu descendre `.doll-fit` à
         `min(42vh, 360px)` — il finissait à 914 px.
      2. **Kiss & Cache était amputé au doigt.** Taper dans la salle savait
         marcher et embrasser, mais **s'accroupir (Maj) et changer de rangée
         (↑ ↓) n'existaient qu'au clavier** — deux mécaniques centrales, et le
         bal de promo (dont la seule parade contre le projecteur est de
         s'accroupir) était infaisable sur téléphone. Ajout d'un pavé
         `.tactile`/`.tact` à deux rangées (◀ ▶ ⇅ RANGÉE / ACCROUPI 💗 BISOU),
         au même motif que les quatre jeux qui en avaient déjà un.
      Au passage : plancher `min-height: 46px` sur les quatre pavés existants
      (celui de Derry Driver tombait à 43), `touch-action: none` sur la salle
      d'Eoghan (un tremblement du doigt faisait défiler la page au lieu de
      jouer), `touch-action: manipulation` sur `.fun-btn` et les cartes de
      Memory (les ~300 ms d'attente de double-tap se sentent comme une commande
      morte), et la notice de Drew dit enfin qu'on **touche** une pièce pour
      l'enfiler — c'était déjà vrai (`toggleItem`), mais elle ne parlait que de
      glisser, le geste le plus dur au doigt.

      **Le banc d'essai sait maintenant tester une commande.** `fakeEl()` dans
      `outils/test-jeux.js` mémorise ses écouteurs et expose
      `declenche("pointerdown")` : 10 vérifications tiennent le pavé d'Eoghan
      (49 → 59 au total). C'était nécessaire, pas décoratif — voir la limite
      ci-dessous.

### EN COURS : remplacer les SVG par de vraies illustrations

**La plomberie est posée et éprouvée ; il ne manque que les dessins.** Déposer
un fichier au bon nom suffit à le voir en jeu — aucun code à toucher.

```bash
node outils/scan-assets.js --liste    # tout ce qu'il y a à produire
node outils/scan-assets.js --manque   # ce qui reste
node outils/scan-assets.js            # indexe ce qui est déposé
node outils/scan-assets.js --init     # (re)crée les dossiers et leurs notices
```

**La liste ne vit PAS dans ce fichier.** Elle vit dans
`outils/assets-familles.js`, d'où le scanner l'imprime. C'est délibéré :
l'inventaire qui était ici avait été écrit quand le portail avait quatre jeux,
et il était faux dès le sixième. Une liste recopiée dérive toujours.

**128 fichiers**, en 14 familles, export **2×** (un personnage se livre en
96 × 144 et s'affiche dans 48 × 72). Le scanner vérifie le **ratio** de chaque
fichier, détecte l'échelle réelle (1×, 2× ou 3× passent), rejette ce qui est
déformé en disant pourquoi, et signale les noms inconnus — presque toujours une
faute de frappe.

**Comment ça marche.** `shared/images.js` expose `umaDessin(famille, id, svg)` :
il rend l'image si elle est indexée, le SVG d'origine sinon. Rien n'est jamais
cassé à moitié converti. L'index est `assets/index.js`, un fichier **généré** —
en `.js` et non en `.json` parce que les jeux dessinent au chargement : un
`fetch` arriverait trop tard, et plusieurs jeux mesurent leur scène au démarrage.
Les deux `<script>` passent donc avant ceux du jeu, dans les 11 pages.

**Le point de plus fort levier**, c'est `persoSVG` : elle dessine TOUS les
personnages du portail, donc elle seule branche les 39 dessins de personnages
partout à la fois. Deux champs sur le `look` :

  - `id` — le personnage (« drew »), suffit pour le voir partout ;
  - `asset` — la variante voulue (« eoghan-accroupi »), facultative.

`asset` existe parce que `pose` ne pouvait pas servir de clé : son vocabulaire
est celui du dessin (« bras-leves ») et il est réutilisé pour des choses
différentes d'un jeu à l'autre — la même pose sert au saut de Glinda et à la
fanfaronnade de Mads. En déduire un nom de fichier revenait à deviner. Une
**cascade** fait qu'un seul `eoghan.png` répond déjà à « eoghan-accroupi » :
on livre un dessin par personnage, on affine les poses ensuite.

**Le Love Tester n'a plus aucun dessin, et c'est une décision.** C'était le seul
cas que ce dispositif ne savait pas résoudre : la machine inventait un visage
pour un prénom inconnu, tiré du hachage du prénom, et l'ensemble des prénoms
possibles est infini — aucun jeu de PNG fini ne pouvait le couvrir. Les
portraits ont donc été retirés (avec `PALETTE`, les `look` du casting, les
styles et la dépendance à `perso.js`) : le gadget est redevenu ce qu'il était en
2012, deux champs, une aiguille, un verdict. Du texte, et rien d'autre. Deux
vérifications de `test-machine.js` interdisent qu'un dessin revienne par
distraction.

**Les silhouettes de foule restent en SVG** : la tribune de Pep Rally est
remplie de variantes combinatoires (3 formes × 6 maillots sur cinq rangs) vues à
20 px de haut. 18 dessins pour un gain nul.

`node outils/test-assets.js` tient l'ensemble (67 vérifications) : il fabrique
de vrais PNG, les fait passer par le scanner, et exige que chaque jeu rende une
balise `img` quand l'image existe. Sans ça, on ne saurait qu'en regardant
l'écran — et seulement pour le jeu regardé.

**Les 14 familles sont câblées** : personnages (via `persoSVG`, donc partout à
la fois), créatures, objets, vignettes du hub, mobilier et fonds de Kiss &
Cache, décors de Drew, d'UMA Bros, de Derry Driver, du stade de Pep Rally, de
Balance ta tomate, couches de parallaxe et obstacles de Run Glinda Run,
obstacles de Derry Driver. Déposer un fichier et lancer le scan suffit.

Derry Driver dessine au canvas et non en HTML : `umaImageCanvas` lui rend un
objet `Image` déjà chargé, parce que `drawImage` sur une image non chargée ne
dessine rien — sans erreur — et l'obstacle disparaîtrait une frame sur deux. Le
premier appel lance le chargement et rend `null` (le tracé habituel est peint),
les suivants rendent l'image.

**Le banc d'essai refuse une famille que personne n'appelle.** C'était le piège
le plus probable du dispositif : déclarer un dossier, valider les fichiers
déposés, et n'appeler le résolveur nulle part — le scan annonce « indexé »
pendant que l'écran affiche toujours le SVG, et rien ne signale l'écart.
`node outils/test-assets.js` cherche le nom de chaque famille dans le code qui
tourne. Il a servi tout de suite : les fonds de parcours de Derry étaient
oubliés.

**Le mode d'emploi complet est dans `ILLUSTRATIONS.md`** — procédure,
nomenclature, formats, cadrage, dépannage.

**Conventions de dessin** : fond transparent (sauf décors), personnage aux pieds
posés sur le bord bas du cadre, créature occupant le bas d'un cadre carré. Le
détail par famille est dans le `LISEZMOI.md` de chaque dossier, lui aussi
généré.

### Le reste, ensuite (par ordre d'intérêt)
- [ ] **Musique** pour Pep Rally Rhythm. Aujourd'hui : métronome + blips synthétisés
      en WebAudio, aucun fichier audio. Une vraie piste demanderait de caler les
      `temps_ms` des charts dessus (`games/glinda-cheer/charts.js`).
- [ ] **Sauvegarde des meilleurs scores** en `localStorage` (aucun jeu n'en garde),
      et éventuellement un tableau des records sur le hub.
- [ ] **Habillage « dossier secret »** plus poussé pour Sanity Whack (phase 4 de sa
      spec) : le VHS et le tremblement sont là, la déco type complot non.
- [ ] **Décors supplémentaires** pour Kiss & Cache : le moteur est piloté par
      `decors.js`, un nouveau terrain ne demande aucune ligne de code.

### Points non vérifiés / limites connues
- Le **glisser-déposer de Drew** et le **maintien de touche** (bisou d'Eoghan, jeu au
  doigt) ne sont pas testables en automatisation : les événements synthétiques ne
  reproduisent pas la séquence `pointer*` attendue. À vérifier à la main.
- Le rendu **en écran étroit** est contrôlé depuis le 2026-07-29 : aucune des 5 pages
  ne déborde horizontalement entre 360 px et 1440 px. Piège à connaître si tu touches
  à la mise en page : `.shell` porte `margin: 0 auto`, et sous 1180 px `.page` passe en
  colonne — deux marges auto sur l'axe transversal **annulent l'étirement** d'un item
  flex, qui se met alors à la taille de son contenu (jamais sous sa largeur min-content).
  C'est ce qui coupait le jeu de Drew en deux sur mobile. D'où le `width: 100%` sur
  `.page > .shell` dans `shared/components.css` : ne pas le retirer.
- L'extension Chrome de capture d'écran tombe régulièrement en panne pendant les
  sessions longues : ouvrir un nouvel onglet la remet d'aplomb. Et quand la
  fenêtre passe en arrière-plan (`document.visibilityState === "hidden"`),
  Chrome **suspend le chargement des iframes** : le banc d'essai qui mesure
  plusieurs largeurs d'un coup reste bloqué à « loading » sans erreur. Il faut
  la fenêtre au premier plan.
- **La coque du portail (2026-07-29) n'a été contrôlée visuellement qu'en large
  (~1000 px et plus).** Les règles pour écran étroit existent — `portail.css` §9
  (860 et 460 px), `style-hub.css` (900 et 460 px), `navbar.css` (720 et 380 px)
  — mais n'ont pas été vues à l'œil : la fenêtre de test était maximisée et
  refusait de se redimensionner. À reprendre en priorité au prochain passage.
- **Une commande qui dépend de la boucle de jeu ne se vérifie PAS au
  navigateur, dans aucun montage** (constaté le 2026-07-30, plusieurs essais).
  Ni dans une iframe de test, ni dans l'onglet de premier plan : dès que l'outil
  JS de l'extension reprend la main, `requestAnimationFrame` s'arrête net — le
  chrono se figeait sur 1,2 s d'attente, et un `rAF` posé à la main dans la page
  n'est jamais revenu (le renderer a fini par être déclaré gelé). Conséquence
  pratique : tout ce qui est **synchrone** se vérifie très bien à l'écran
  (changement de rangée, accroupissement, mise en page, tailles de cibles), tout
  ce qui passe **par la boucle** ne se vérifie que dans `outils/test-jeux.js`.
  C'est pour ça que `fakeEl()` mémorise ses écouteurs : la marche au doigt
  d'Eoghan est prouvée là (x 200 → 284) et nulle part ailleurs. Ne pas perdre de
  temps à retenter au navigateur.
- **La rotation des pubs n'a pas été observée en direct**, pour la même raison :
  elle se met volontairement en pause quand l'onglet est masqué, et l'onglet de
  test l'était. Le rendu des deux créations de départ, lui, est vérifié.

### Repères d'équilibrage (à revérifier après toute retouche)
- **Glinda** : écart minimum entre deux INSTANTS de jeu ≥ 200 ms, 2 pompons
  simultanés au maximum, et **rafale de 4 notes maximum suivie d'une
  respiration**. Cette dernière règle était ambiguë et a été précisée : une
  rafale, ce sont des notes espacées de **260 ms ou moins** (donc collées au
  plancher), et la respiration qui la suit fait **au moins 400 ms**. Le seuil
  compte : trois chorégraphies sur quatre n'enchaînent jamais plus de 4 notes
  quel que soit le seuil, mais « Encore ! Encore ! » aligne 9 notes en 2,6 s à
  327 ms d'écart moyen — légal parce que ses écarts alternent au-dessus de
  260 ms, et cohérent avec les 3,10 notes/s que la finale tient déjà de bout en
  bout. Densité moyenne : **1,1 / 2,1 / 3,1 / 3,2** notes par seconde.
  Plafond mathématique de la règle : 4 notes + 400 ms de respiration = 3,33
  notes/s — c'est pourquoi une chorégraphie plus dure que la finale ne peut
  pas être plus DENSE, seulement plus retorse (contretemps, notes doubles).
  `node outils/test-jeux.js` vérifie les trois règles sur chaque chart.
- **Elias** : la difficulté ne doit **jamais plafonner**. L'ancienne courbe était
  une droite bornée qui atteignait son minimum à la vague 11 (88 s de jeu) :
  passé là, un expert ne mourait plus jamais. Trois leviers la remplacent, qui
  saturent à des moments différents — la vitesse (fenêtre 1750 → 420 ms, cadence
  1150 → 330 ms), puis les **salves multiples** à partir de la vague 9 quand la
  vitesse sature, puis la part de pièges (18 → 42 %). Une vague dure une **durée**
  (~12 s) et non un nombre d'apparitions, sinon le compteur s'emballe avec elle.
  Repères : vague 1 laisse 1,75 s pour viser, vague 8 tombe à 0,80 s, vague 20 à
  0,46 s avec 6,8 créatures/s. Le plancher de 420 ms est assumé : en dessous le
  jeu ne serait plus difficile, il serait aléatoire. Série de bons coups : ×2 à 5
  d'affilée, ×3 à 10, remise à zéro à la moindre bourde.
  `node outils/test-serie-elias.js` interdit tout plateau jusqu'à la vague 60.
- **Eoghan** : part de la salle surveillée par les téléphones, en moyenne dans le
  temps — campus 24 %, soirée 47 %, vestiaire 57 %, bal de promo 64 %. Chaque
  décor doit rester au-dessus du précédent, et `node outils/mesure-difficulte-eoghan.js`
  lit désormais `DECORS` : un 5e terrain se mesure sans toucher au banc d essai.

### Où en est chaque jeu par rapport à sa spec
- **Glinda** : phases 0 à 4 faites (moteur, hype, combo, habillage). Décor : stade de
  foot US en plein jour, tribune de 5 rangs, Glinda et sa camarade en uniforme
  d'Augusta (bleu marine et blanc) qui prennent la pose de la touche jouée.
- **Elias** : phases 0 à 4 faites. Son avatar commente en direct : le visage suit le
  palier de sanity et réagit à chaque bon coup, bourde ou créature manquée.
- **Eoghan** : phases 0 à 5 faites, les trois décors sont là dès le départ (le
  moteur est piloté par `decors.js`, ajouter un terrain ne demande aucun code).
  Les PNJ ne portent pas de lampe : ils tiennent un téléphone et prennent un snap
  quand ils cadrent Eoghan.

Mets à jour cette liste à la fin de chaque tâche importante, pour que la prochaine
session Claude Code sache exactement où en est le projet sans qu'on ait à tout
réexpliquer.
