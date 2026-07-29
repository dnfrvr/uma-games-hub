# CLAUDE.md

Ce fichier donne le contexte permanent du projet à Claude Code. À lire avant toute
tâche. Les specs détaillées par jeu sont dans les fichiers `*-SPEC.md` à la racine.

## Le projet
**uma-games-hub** : un portail façon site de jeux 2012 (esprit girlsgogames) qui
regroupe 4 mini-jeux, un par personnage principal d'un JDR/univers narratif appelé
*IT: Welcome to UMA*. Chaque jeu est goofy et exploite un trait de personnalité, sans
raconter le lore/l'intrigue.

| Perso   | Jeu                          | Dossier                 | Statut          |
|---------|------------------------------|--------------------------|-----------------|
| Drew    | Dress-up (mauvais goût)      | `games/drew-dress-up/`   | Jouable         |
| Glinda  | Pep Rally Rhythm (rythme/QTE)| `games/glinda-cheer/`    | Jouable         |
| Elias   | Sanity Whack (whack-a-mole)  | `games/elias-whack/`     | Jouable         |
| Eoghan  | Kiss & Cache (infiltration)  | `games/eoghan-office/`   | Jouable         |

**Les 4 jeux sont finis et branchés au hub.** Ce qui reste est du contenu et du
polish, pas de la structure — voir « État d'avancement » en bas de ce fichier.

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
├── uma-games-hub-SPEC.md        # spec du hub + sidebar + manifest
├── dress-my-drew-SPEC.md        # spec du jeu de Drew
├── games-manifest.json          # source unique de vérité : liste des 4 jeux
├── index.html                   # page d'accueil / hub
├── style-hub.css
├── shared/
│   ├── style-tokens.css         # variables CSS (couleurs, police, ombres)
│   ├── components.css           # mobilier commun (fond, .shell, bandeau, footer…)
│   ├── perso.js                 # fabrique de personnages chibi (persoSVG, spectateurSVG)
│   ├── navbar.js / navbar.css   # barre de navigation permanente
│   ├── sidebar.js / sidebar.css # renderSidebar(currentGameId, targetElementId)
│   ├── sparkle.js               # paillettes du curseur + compteur de visites
│   └── vignettes/               # vignettes SVG des jeux (placeholders)
├── outils/                      # bancs d'essai Node (voir outils/LISEZMOI.md)
└── games/
    ├── drew-dress-up/           # index/style/main/layers/export/decors/silhouettes
    ├── glinda-cheer/            # index/style/main + charts.js (chorégraphies)
    ├── elias-whack/             # index/style/main + roster.js (casting dessiné)
    └── eoghan-office/           # index/style/main + decors.js (3 salles + mobilier)
```

Chaque jeu suit le même squelette de page : `#navbar` → `.page` (`.shell` du jeu +
`#sidebar-autres-jeux`) → scripts du jeu, puis `sparkle.js`, `navbar.js`, `sidebar.js`
et l'appel à `renderNavbar(id, "navbar")` / `renderSidebar(id, "sidebar-autres-jeux")`.

## Direction artistique (DA) commune
Tous les jeux + le hub partagent la même DA rétro 2012 kitsch via `shared/`.
- Importer **dans cet ordre**, dans le `<head>` de chaque page :
  ```html
  <link rel="stylesheet" href="../../shared/style-tokens.css" />
  <link rel="stylesheet" href="../../shared/components.css" />
  <link rel="stylesheet" href="style.css" /> <!-- spécifique au jeu -->
  ```
  (adapter le nombre de `../` selon la profondeur réelle du fichier)
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

## `games-manifest.json`
Source unique de vérité pour le hub ET la sidebar de chaque jeu. Champs par entrée :
`id`, `titre`, `perso`, `description`, `vignette`, `url` (relatif à la racine du repo,
ou `null` si pas encore disponible), `couleur`, `statut` (`"disponible"` ou `"bientot"`).
Ne jamais dupliquer ces infos ailleurs en dur — toujours lire ce fichier.

## Comment tester en local
```bash
python3 -m http.server 8000       # puis ouvrir http://localhost:8000
node outils/test-jeux.js          # 49 vérifications de règles, sans navigateur
```
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

### PROCHAINE ÉTAPE : remplacer tous les SVG par de vraies illustrations
C'est la priorité annoncée. Aujourd'hui **tout est dessiné en code** (SVG généré par
`shared/perso.js` et par les fichiers de données de chaque jeu) : c'était fait pour
tenir sans art, pas pour rester.

**Méthode à suivre** — la même que pour la garde-robe de Drew : le code ne doit jamais
connaître le contenu artistique. Pour chaque famille de dessins, on ajoute un champ
`image` à côté du champ `svg` existant, et le moteur affiche l'image **si elle
existe**, sinon il retombe sur le SVG. Ça permet de remplacer les dessins **un par
un**, sans jamais casser un jeu à moitié converti.

**Inventaire de ce qu'il y a à produire** (état au 2026-07-28) :

| Jeu | À dessiner | Nombre | Où le brancher |
|-----|-----------|--------|----------------|
| Kiss & Cache | mobilier (bureau, plante, casier, canapé, arbre, banc, enceinte, buvette) | 8 | `games/eoghan-office/decors.js` → `PROPS` |
| Kiss & Cache | garçons à embrasser | 10 (3 décors) | `decors.js` → `garcons[].look` |
| Kiss & Cache | PNJ avec téléphone | 11 | `decors.js` → `pnj[].look` |
| Kiss & Cache | Eoghan : debout, marche, accroupi, bisou | 4 états | `main.js` → `chargeDecor` / `tenteBisou` |
| Kiss & Cache | fonds de salle (ciel + 2 sols) | 3 décors | `style.css` → `.salle`, `.fond` |
| Sanity Whack | cibles (petit gris, ovni, silhouette, œil, chèvre, ombre, Pennywise, Slenderman) | 8 | `games/elias-whack/roster.js` → `CIBLES` |
| Sanity Whack | pièges (Toto, mamie, pizza, Drew, Eoghan, Glinda) | 6 | `roster.js` → `PIEGES` |
| Sanity Whack | avatar d'Elias | 6 expressions | `main.js` → `HUMEURS` |
| Pep Rally | Glinda et sa camarade | 5 poses chacune | `games/glinda-cheer/main.js` → `POSES_GLINDA` |
| Pep Rally | supporters de tribune | 3 variantes × 6 maillots | `shared/perso.js` → `spectateurSVG` |
| Pep Rally | décor du stade (ciel, tribune, pelouse, poteaux, panneau) | 5 morceaux | `style.css` + `index.html` |
| Hub | vignettes des 4 jeux | 4 | `games-manifest.json` → `vignette` (déjà prêt) |
| Hub | favicons | 4 | `<link rel="icon">` de chaque page |

**Conventions à fixer avant de dessiner** :
- **Personnages** : même cadrage et même hauteur d'un dessin à l'autre (le SVG actuel
  fait 48 × 72, pieds posés en bas du cadre). Fond transparent, PNG ou WebP.
- **Mobilier de Kiss & Cache** : chaque meuble a déjà une `largeur`/`hauteur` en unités
  de salle dans `PROPS` — l'image doit respecter ce ratio, posée au sol.
- **Créatures de Sanity Whack** : cadre carré (le SVG fait 64 × 64), le personnage
  sortant par le bas du trou.
- **Vignettes du hub** : 4/3, ~320 × 240, c'est le seul endroit déjà 100 % piloté par
  le manifest (changer le chemin suffit).

Tant que les images n'existent pas, **ne pas supprimer les SVG** : ils servent de
solution de repli et de référence de cadrage.

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
  sessions longues : ouvrir un nouvel onglet la remet d'aplomb.

### Repères d'équilibrage (à revérifier après toute retouche)
- **Glinda** : écart minimum entre deux notes ≥ 200 ms, rafale de 4 notes maximum
  suivie d'une respiration. Densité moyenne : 1,1 / 2,1 / 3,3 notes par seconde.
- **Elias** : vague 1 laisse 1,75 s pour viser, vague 8 tombe à 0,8 s. Série de bons
  coups : ×2 à 5 d'affilée, ×3 à 10, remise à zéro à la moindre bourde.
- **Eoghan** : part de la salle surveillée par les téléphones, en moyenne dans le
  temps — campus 24 %, soirée 48 %, vestiaire 56 %. Chaque décor doit rester
  au-dessus du précédent.

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
