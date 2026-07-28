# UMA Games Hub — Spec projet (pour Claude Code)

## Vue d'ensemble
Un portail façon site 2012 (esprit girlsgogames/mini-clip) qui regroupe **4 mini-jeux**,
un par personnage principal, chacun exploitant un trait de personnalité goofy :

| Perso   | Jeu                                              | Statut |
|---------|---------------------------------------------------|--------|
| Drew    | Dress-up (mauvais goût vestimentaire)              | En cours, projet séparé `dress-my-drew` |
| Glinda  | **Pep Rally Rhythm** — jeu de rythme cheerleader   | À spec ci-dessous |
| Elias   | **Sanity Whack** — whack-a-mole aliens/creepypasta | À spec ci-dessous |
| Eoghan  | **Kiss & Cache** — infiltration/bisous en vue de côté | À spec ci-dessous |

Le **hub** (page d'accueil) affiche les 4 jeux en grille de vignettes façon site de jeux
2012. Sur **chaque page de jeu**, une **sidebar** liste les 3 autres jeux (vignette +
titre + lien), exactement comme sur girlsgogames/mini-clip ("Tu aimeras aussi...").

## Organisation recommandée (monorepo)
```
uma-games-hub/
├── index.html                 # page d'accueil / hub
├── style-hub.css
├── shared/
│   ├── games-manifest.json    # métadonnées des 4 jeux (source unique de vérité)
│   ├── sidebar.js             # composant réutilisable "autres jeux"
│   └── sidebar.css
├── games/
│   ├── drew-dress-up/         # copie/lien du repo dress-my-drew une fois prêt
│   ├── glinda-cheer/
│   ├── elias-whack/
│   └── eoghan-office/         # plus tard
└── SPEC.md                    # ce fichier
```
- Le **hub** et chaque jeu lisent tous `shared/games-manifest.json` pour ne jamais avoir
  à dupliquer titres/vignettes/liens à plusieurs endroits.
- Drew ayant déjà son propre repo en cours avec Claude Code, deux options simples :
  1. Une fois le jeu de Drew stable, **copier son dossier** dans `games/drew-dress-up/`
     de ce monorepo (le plus simple).
  2. Le garder en repo séparé et **héberger chaque jeu indépendamment** (ex: GitHub
     Pages par repo), auquel cas `games-manifest.json` pointe vers des URLs externes
     au lieu de chemins relatifs. À trancher plus tard, l'architecture des deux
     nouveaux jeux ci-dessous fonctionne dans les deux cas.

### `games-manifest.json` (format)
```json
[
  {
    "id": "drew",
    "titre": "Dress my Drew",
    "perso": "Drew",
    "description": "Habille Drew. Essaie de faire pire.",
    "vignette": "shared/vignettes/drew.png",
    "url": "games/drew-dress-up/index.html",
    "couleur": "#aa6caa",
    "statut": "disponible"
  },
  {
    "id": "glinda",
    "titre": "Pep Rally Rhythm",
    "perso": "Glinda",
    "description": "Mets le feu aux tribunes.",
    "vignette": "shared/vignettes/glinda.png",
    "url": "games/glinda-cheer/index.html",
    "couleur": "#e91e8c",
    "statut": "disponible"
  },
  {
    "id": "elias",
    "titre": "Sanity Whack",
    "perso": "Elias",
    "description": "Tape sur tout ce qui bouge avant de perdre la tête.",
    "vignette": "shared/vignettes/elias.png",
    "url": "games/elias-whack/index.html",
    "couleur": "#6672d0",
    "statut": "disponible"
  },
  {
    "id": "eoghan",
    "titre": "(à venir)",
    "perso": "Eoghan",
    "description": "Bientôt disponible.",
    "vignette": "shared/vignettes/eoghan.png",
    "url": null,
    "couleur": "#00d435",
    "statut": "bientot"
  }
]
```

## Hub (page d'accueil)
- Grille de 4 cartes cliquables (vignette + titre + description courte + petit badge
  couleur du perso), généré dynamiquement depuis `games-manifest.json`.
- Esthétique 2012 kitsch commune à tout le projet (voir le style déjà utilisé pour
  Drew : dégradés flashy, bordures pointillées, Comic Sans, ombres portées dures).
- Petits gadgets d'ambiance façon vrai site 2012 : compteur de visites factice, bandeau
  "nouveau !", étoiles clignotantes sur les jeux les plus récents.
- Un item avec `"statut": "bientot"` s'affiche grisé/non cliquable avec un badge
  "Bientôt disponible".

## Composant sidebar (`shared/sidebar.js`)
- Fonction unique `renderSidebar(currentGameId, targetElementId)` :
  1. Charge `games-manifest.json`.
  2. Filtre pour exclure `currentGameId`.
  3. Génère une liste de vignettes cliquables (titre + image + lien `url`).
- Chaque page de jeu inclut juste :
  ```html
  <div id="sidebar-autres-jeux"></div>
  <script src="../../shared/sidebar.js"></script>
  <script>renderSidebar("glinda", "sidebar-autres-jeux");</script>
  ```
- Ça permet d'ajouter/retirer un jeu du portail en ne touchant qu'un seul fichier JSON.

---

# Jeu Glinda — "Pep Rally Rhythm"

## Concept
Jeu de rythme simplifié (QTE) : une chorégraphie de pom-pom girl défile, il faut
appuyer sur la bonne touche au bon moment. Plus la séquence est réussie, plus la
foule dans le fond s'enflamme visuellement (jauge de **hype**).

## Mécanique
- 4 touches (flèches ← ↑ → ↓, ou correspondance clic sur 4 zones à l'écran pour mobile).
- Des **notes** tombent vers une ligne de jugement (comme un rythm-game classique,
  genre Guitar Hero/DDR simplifié) définies dans une **chart JSON** :
  ```json
  { "bpm": 128, "notes": [
      { "temps_ms": 0,    "touche": "haut" },
      { "temps_ms": 500,  "touche": "gauche" },
      { "temps_ms": 1000, "touche": "droite" }
    ]
  }
  ```
- Fenêtres de jugement : Parfait / Bien / Raté, selon l'écart entre l'appui et le
  temps prévu de la note.
- **Jauge de hype** : monte sur Parfait/Bien, descend sur Raté. Au-delà de certains
  seuils, la foule en fond change d'animation (silhouettes qui sautent plus fort,
  confettis CSS, texte d'ambiance qui s'affiche : "LA FOULE EST EN DÉLIRE 🔥").
- Combo : streak de réussites affiché à l'écran, avec petit multiplicateur de score.
- Fin de partie : score final + phrase goofy générée selon le niveau de hype atteint
  (ex: "Spirit level : LÉGENDAIRE 🏆" ou "Spirit level : sieste générale 😴").

## Assets nécessaires (prototype → placeholders d'abord)
- 4 icônes de touche (flèches ou pompons de couleur différente par direction).
- Silhouette(s) de foule en fond (peuvent rester des formes simples/placeholder au
  début, comme pour Drew).
- Sprite simple de Glinda qui fait le mouvement correspondant à chaque touche
  (peut être une simple image statique qui "pulse" au bon rythme en V1).

## Plan de phases
1. **Phase 0** — Scaffolding du dossier `games/glinda-cheer/`, structure HTML/CSS/JS.
2. **Phase 1** — Moteur de rythme minimal : chart JSON codée en dur, notes qui tombent,
   détection d'appui, jugement Parfait/Bien/Raté, score.
3. **Phase 2** — Jauge de hype + réactions visuelles de la foule + combo/multiplicateur.
4. **Phase 3** — Habillage rétro 2012 (déco tribune, confettis CSS, textes d'ambiance).
5. **Phase 4** — Ajout de 2-3 chorégraphies/chart supplémentaires (difficulté croissante).
6. **Phase 5** — Intégration au hub (sidebar, lien retour, manifest).

---

# Jeu Elias — "Sanity Whack"

## Concept
Whack-a-mole avec une jauge de **santé mentale (sanity)** : plus tu rates de cibles ou
tapes la mauvaise chose, plus l'écran déraille visuellement (tremblements, bruit VHS,
distorsion), dans l'esprit parano/creepypasta/complotiste d'Elias — le tout en mode
comique, jamais glauque.

Le casting est maison (silhouette floue dans les bois, œil géant dans le ciel, petit
gris générique, ombre humanoïde, ovni, chèvre suspecte), dessiné en SVG comme le reste
du portail.

## Mécanique
- Grille de trous/fenêtres (ex: 3×3 ou 4×3) façon whack-a-mole classique.
- Des créatures du roster apparaissent aléatoirement dans un trou pendant un court
  laps de temps ; clic dessus avant disparition = point.
- **Pièges goofy** : certains éléments qui popent ne sont PAS des menaces (le chat
  d'Elias, sa grand-mère, une pizza) — cliquer dessus = perte de points ET montée de
  la jauge de sanity (gag "il panique pour rien").
- **Jauge de sanity** : monte quand on rate une vraie créature ou qu'on tape un
  élément innocent ; descend/se stabilise sur les bons clics.
  - Sanity basse → écran normal.
  - Sanity moyenne → léger tremblement d'écran, filtre CSS discret.
  - Sanity haute → tremblement fort, effet "bruit VHS" (overlay de bruit animé en
    CSS/canvas), léger décalage chromatique (`filter: hue-rotate` ou double image
    décalée en rouge/cyan), vitesse de spawn des créatures qui augmente.
  - Si la jauge atteint le max : "Game Over" comique, ex: "Elias a rédigé un thread
    Reddit de 4000 mots. Personne ne l'a lu."
- Vagues/rounds avec vitesse croissante ; score cumulatif affiché.

## Roster original (placeholders → à styliser plus tard)
- 👽 Petit gris générique
- 🛸 Ovni
- 🌲 Silhouette floue dans les bois
- 👁️ Œil géant dans le ciel
- 🐐 Chèvre suspecte
- 👤 Ombre humanoïde dans un couloir
- (pièges, NE PAS taper) 🐈 Chat, 👵 Grand-mère, 🍕 Pizza

## Assets nécessaires (prototype → placeholders d'abord)
- Icônes/emoji ou formes simples pour chaque entrée du roster (V1 : emoji suffisent
  largement, cohérent avec l'esprit goofy).
- Overlay de bruit VHS (peut être généré en CSS avec un `background` bruité + opacité
  animée, pas besoin d'asset vidéo).

## Plan de phases
1. **Phase 0** — Scaffolding du dossier `games/elias-whack/`.
2. **Phase 1** — Grille de trous + spawn aléatoire + détection de clic + score de base
   (avec emoji comme placeholders visuels).
3. **Phase 2** — Ajout des pièges (éléments à ne pas taper) + jauge de sanity qui réagit.
4. **Phase 3** — Effets visuels de dégradation d'écran par palier de sanity (tremblement,
   bruit VHS, décalage chromatique) + textes de fin goofy.
5. **Phase 4** — Vagues/rounds avec vitesse croissante + habillage rétro 2012 (déco
   type Xfiles/complot).
6. **Phase 5** — Intégration au hub (sidebar, lien retour, manifest).

---

# Jeu Eoghan — "Kiss & Cache"

## Concept
Jeu d'infiltration comique **en vue de côté**, façon mini-jeu flash 2012 « vole un
bisou sans te faire voir ». La salle est vue de profil, sur deux rangées de
profondeur ; Eoghan marche de gauche à droite au milieu des PNJ qui regardent autour
d'eux, et doit embrasser un maximum de garçons **partants** avant la fin du chrono,
sans jamais être pris sur le fait.

Le trait exploité : Eoghan drague tout ce qui bouge et se croit d'une discrétion
absolue. Il ne l'est pas. Ton fun et bienveillant, jamais gênant : **seuls les garçons
qui affichent un cœur 💗 au-dessus de la tête sont partants** — ce sont les seules
cibles valides du jeu, et c'est aussi la règle de game design (voir Mécanique). Un
garçon sans cœur n'est pas une cible : l'approcher fait juste apparaître une réplique
goofy du style « Salut. Non. », sans pénalité.

Le genre est librement inspiré des vieux jeux flash de bisous ; le nom, les décors et
les personnages sont maison.

## Mécanique
- **Vue de côté**, salle d'un seul écran (pas de scrolling), avec deux **rangées de
  profondeur** : le premier plan (près de la caméra) et le fond. La rangée du fond est
  dessinée plus petite et plus haute, ce qui creuse la salle.
- **Déplacement** : ← → (ou Q/D) pour marcher, ↑ ↓ pour changer de rangée. Au doigt,
  on maintient à gauche ou à droite de l'écran. Une touche **« s'accroupir »** (Maj)
  ralentit Eoghan mais le rend invisible s'il est **planqué près d'un meuble**.
- **Meubles** : bureaux, casiers, canapés, arbres, enceintes… Les meubles hauts
  **coupent la ligne de vue** ; les meubles bas (bancs) ne la coupent pas mais servent
  de cachette quand on est accroupi.
- **PNJ et faisceaux de regard** : chaque PNJ regarde dans une direction, dans SA
  rangée uniquement, sur une certaine portée. Le faisceau est **toujours dessiné à
  l'écran** (rayures claires, bord vif au bout) : le jeu est un puzzle de timing, pas
  une devinette. Trois comportements :
  - `patrouille` — le PNJ va et vient et regarde devant lui ;
  - `tourne` — il reste en place et se retourne à intervalle régulier ;
  - `fixe` — il ne bouge jamais, mais sa portée est grande.
- **Embrasser** : se placer à côté d'un garçon partant (même rangée) et **maintenir la
  touche Espace** pendant une courte durée (0,6 à 1 s selon le décor). Une jauge
  circulaire se remplit, les deux personnages se penchent l'un vers l'autre, yeux
  fermés.
  - Pendant le bisou, Eoghan **ne peut pas bouger** : c'est le moment de vulnérabilité.
  - Bisou terminé sans être vu = **réussi**, le garçon passe en ✔ et sort de la liste
    des cibles (un bisou par garçon, pas de harcèlement de score).
- **Se faire repérer** : si un faisceau touche Eoghan **pendant un bisou**, ou s'il
  reste dans un faisceau plus de ~0,9 s en temps normal :
  - la **jauge de ragots** perd un cœur (elle ne se répare jamais) ;
  - le PNJ lâche une réplique goofy et **tous les PNJ se braquent sur Eoghan** pendant
    3 s : une bourde peut en déclencher une autre.
- **Fin de partie** :
  - **Game over** si la jauge de ragots est vidée (3 cœurs en Campus, 4 en Soirée, 2 en
    Vestiaire) → « Toute la fac est au courant. Eoghan trouve ça flatteur. »
  - **Victoire** si tous les garçons partants ont été embrassés avant la fin du chrono.
  - Fin du chrono sans game over = score final tel quel.
- **Score et combo** :
  - Bisou réussi = 100 pts, +50 par bisou enchaîné sans repérage entre-temps.
  - **Bonus discrétion** : +200 si un faisceau frôle Eoghan pendant le bisou sans le
    toucher (« bisou sous le nez »).
  - **Bonus rapidité** : temps restant × 5 en cas de victoire.
  - Rangs de fin : « Fantôme romantique 👻💗 » > « Discret… ish » > « Tout le monde a vu ».
- **Données** : chaque décor est une entrée de `decors.js` (palette, meubles, garçons,
  PNJ, chrono, seuil de ragots, gimmick). Les positions sont en unités de 0 à 1000 sur
  la largeur de la salle. Ajouter un décor = ajouter une entrée, **pas de code**.
  ```json
  {
    "id": "campus",
    "titre": "Le campus",
    "chrono_s": 90,
    "ragots_max": 3,
    "duree_bisou_ms": 800,
    "gimmick": null,
    "palette": { "fond": "…", "solArriere": "…", "solAvant": "…" },
    "eoghan": { "x": 80, "plan": 0 },
    "props":   [{ "type": "banc", "x": 300, "plan": 0 }],
    "garcons": [{ "x": 430, "plan": 0, "nom": "…", "replique": "…", "look": {} }],
    "pnj":     [{ "x": 260, "plan": 0, "nom": "…", "motif": "patrouille",
                  "de": 180, "a": 640, "vitesse": 78, "portee": 260, "look": {} }]
  }
  ```

## Décors
Trois décors au choix depuis un **écran de sélection de niveau** (trois vignettes façon
« choisis ton terrain »). Même moteur pour les trois, mais agencement, PNJ et rythme
différents — c'est ce qui fait la progression de difficulté.

### 1. Le campus ☀️ (facile, rythme lent)
- **Agencement** : grande pelouse ouverte, quelques bancs et arbres comme seuls
  abris. Peu d'obstacles, mais de la place pour contourner et changer de rangée.
- **Ambiance** : plein jour, oiseaux, affiches « CLUB DE THÉÂTRE : AUDITIONS ».
- **PNJ obstacles** : 📚 la bibliothécaire (cône lent en rotation continue), 🧹 l'agent
  d'entretien (va-et-vient sur une allée, cône court), 🐿️ l'écureuil (cône minuscule,
  se déplace au hasard — inoffensif seul, traître au mauvais moment).
- **Difficulté** : cônes lents, 3 crans de ragots, chrono confortable (90 s). C'est le
  décor d'apprentissage.

### 2. La soirée 🎉 (moyen, rythme irrégulier)
- **Agencement** : intérieur encombré — canapés, table de boissons, enceintes.
  Beaucoup d'abris, mais des passages obligés très surveillés.
- **Ambiance** : lumière tamisée traversée de flashs colorés, basses qui font vibrer
  l'écran. Toutes les ~10 s, un **flash de lumière** éclaire toute la pièce : pendant
  1,5 s, tous les cônes voient partout. C'est le gimmick du décor.
- **PNJ obstacles** : 🕺 le danseur (cône qui tourne en rythme, donc prévisible si on
  écoute), 🥤 le roi de la table de boissons (cône fixe, mais large), 📱 la fille qui
  filme des stories (son cône suit son téléphone, mouvements saccadés).
- **Difficulté** : 4 crans de ragots (on pardonne plus), mais mouvements irréguliers et
  flashs. Chrono 75 s, bisous un peu plus longs (1 s) : la musique déconcentre Eoghan.

### 3. Le vestiaire de sport 🏀 (difficile, rythme rapide)
- **Agencement** : rangées de casiers en fond de salle, bancs au premier plan.
  Cachettes nombreuses, mais le coach couvre toute la longueur.
- **Ambiance** : néons, buée, sifflet au loin. Un **compteur de douches** : toutes les
  20 s, un groupe traverse le couloir central de part en part — il faut être planqué.
- **PNJ obstacles** : 🏐 le coach (cône long et rapide, patrouille les couloirs),
  🧦 le capitaine d'équipe (immobile mais cône très large devant les casiers),
  🚿 le groupe de la douche (mur mouvant : ne « voit » pas, mais bloque le passage et
  pousse Eoghan hors de sa cachette).
- **Difficulté** : 2 crans de ragots seulement, chrono serré (60 s), cônes rapides,
  bisou raccourci (0,6 s) pour compenser. Décor le plus nerveux des trois.

### Roster minimal (placeholders V1)
- **Garçons partants (cibles, cœur 💗 au-dessus)** — 2 à 4 par décor, tirés d'un petit
  casting original : 🎸 le gars à la guitare, ♟️ le type du club d'échecs, 🧁 le gars
  qui a apporté les gâteaux, 🏊 le nageur, 🎨 l'artiste plein de peinture, 📖 le poète
  du fond de la salle. Chacun a une réplique de remerciement goofy après le bisou
  (« Cool. On refait ça jamais ? Si ? D'accord. »).
- **PNJ obstacles** — ceux listés par décor ci-dessus. Aucun n'est méchant : ils sont
  juste très, très bavards.

## Assets nécessaires (prototype → placeholders d'abord)
- Personnages : tous générés par `shared/perso.js`, la fabrique de personnages
  chibi commune au portail (peau, coiffure, tenue, regard, bouche, pose). Aucun
  fichier image : le dessin est du SVG paramétré.
- Un sprite/emoji par garçon du roster + une icône cœur 💗 clignotante au-dessus des
  cibles encore disponibles.
- Un sprite/emoji par PNJ obstacle (les emoji du roster suffisent en V1).
- **Cônes de vision** : générés en CSS/canvas (triangle semi-transparent, rouge quand le
  cône touche Eoghan) — aucun asset à produire.
- Tuiles de décor : aplats colorés + rectangles d'obstacles en V1, remplaçables plus
  tard par de vraies images sans toucher au code (mêmes conventions que Drew).
- Vignettes de sélection de niveau : réutiliser une capture de chaque décor.
- Jauge de ragots (barre segmentée) et jauge circulaire de bisou : CSS pur.

## Plan de phases
1. **Phase 0** — Scaffolding du dossier `games/eoghan-office/`, structure HTML/CSS/JS,
   format JSON d'un décor figé dans un fichier.
2. **Phase 1** — Moteur de base : grille, déplacement d'Eoghan, obstacles bloquants,
   rendu du **décor Campus** uniquement (placeholders colorés).
3. **Phase 2** — PNJ + cônes de vision (motifs rotation / va-et-vient / fixe), détection
   de repérage, jauge de ragots, game over.
4. **Phase 3** — Bisous : cibles avec cœur, maintien de touche, jauge circulaire, score,
   combo, bonus discrétion, écrans de fin goofy.
5. **Phase 4** — **Ajout des décors Soirée et Vestiaire** + écran de sélection de niveau.
   Le moteur étant piloté par le JSON depuis la phase 1, un décor devient du contenu :
   agencement, PNJ, chrono, seuil de ragots. On y ajoute les deux gimmicks propres
   (flash de lumière en Soirée, groupe de la douche au Vestiaire) et l'habillage
   rétro 2012 des trois décors.
6. **Phase 5** — Intégration au hub (sidebar, lien retour, manifest) + bonus éventuels
   (meilleur score en `localStorage`, réplique aléatoire des PNJ).

---

## Prochaine étape suggérée
Faire d'abord le **hub minimal** (Phase 0 du portail : `index.html` + `games-manifest.json`
avec seulement Drew "disponible" et les 3 autres en "bientôt") pour avoir un squelette
central tôt, puis brancher chaque jeu au fur et à mesure qu'il est prêt — plutôt que
d'attendre que les 4 jeux soient finis pour construire le hub.
