# CLAUDE.md

Ce fichier donne le contexte permanent du projet à Claude Code. À lire avant toute
tâche. Les specs détaillées par jeu sont dans les fichiers `*-SPEC.md` à la racine.

## Le projet
**uma-games-hub** : un portail façon site de jeux 2012 (esprit girlsgogames) qui
regroupe 4 mini-jeux, un par personnage principal d'un JDR/univers narratif appelé
*IT: Welcome to UMA*. Chaque jeu est goofy et exploite un trait de personnalité, sans
raconter le lore/l'intrigue.

| Perso   | Jeu                          | Dossier                 | Statut       |
|---------|------------------------------|--------------------------|--------------|
| Drew    | Dress-up (mauvais goût)      | `games/drew-dress-up/`   | Prototype OK |
| Glinda  | Pep Rally Rhythm (rythme/QTE)| `games/glinda-cheer/`    | À faire      |
| Elias   | Sanity Whack (whack-a-mole)  | `games/elias-whack/`     | À faire      |
| Eoghan  | Kiss & Cache (infiltration)  | `games/eoghan-office/`   | Spécifié     |

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
└── games/
    ├── drew-dress-up/
    ├── glinda-cheer/
    ├── elias-whack/
    └── eoghan-office/
```

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
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

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
- [ ] Remplacer les vignettes SVG du hub par de vraies illustrations si l'envie vient
      (le manifest suffit, aucun code à toucher).

### Où en est chaque jeu par rapport à sa spec
- **Glinda** : phases 0 à 4 faites (moteur, hype, combo, habillage). Décor : stade de
  foot US en plein jour, tribune de 5 rangs, Glinda et sa camarade en uniforme
  d'Augusta (bleu marine et blanc) qui prennent la pose de la touche jouée.
- **Elias** : phases 0 à 4 faites. Son avatar commente en direct : le visage suit le
  palier de sanity et réagit à chaque bon coup, bourde ou créature manquée.
- **Eoghan** : phases 0 à 5 faites, les trois décors sont là dès le départ (le
  moteur est piloté par `decors.js`, ajouter un terrain ne demande aucun code).

Mets à jour cette liste à la fin de chaque tâche importante, pour que la prochaine
session Claude Code sache exactement où en est le projet sans qu'on ait à tout
réexpliquer.
