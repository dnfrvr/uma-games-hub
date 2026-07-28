# UMA Games Hub — Spec projet (pour Claude Code)

## Vue d'ensemble
Un portail façon site 2012 (esprit girlsgogames/mini-clip) qui regroupe **4 mini-jeux**,
un par personnage principal, chacun exploitant un trait de personnalité goofy :

| Perso   | Jeu                                              | Statut |
|---------|---------------------------------------------------|--------|
| Drew    | Dress-up (mauvais goût vestimentaire)              | En cours, projet séparé `dress-my-drew` |
| Glinda  | **Pep Rally Rhythm** — jeu de rythme cheerleader   | À spec ci-dessous |
| Elias   | **Sanity Whack** — whack-a-mole aliens/creepypasta | À spec ci-dessous |
| Eoghan  | Office-kissing-like (embrasser des garçons discrètement) | À spec plus tard |

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

**Important droits d'auteur** : on n'utilise **aucun personnage creepypasta existant**
(pas de Slenderman, Jeff the Killer, etc. nommés ou dessinés à leur image) — on crée un
**casting original** dans le même esprit visuel (silhouette floue dans les bois, œil
géant dans le ciel, petit gris générique, ombre humanoïde, ovni, chèvre suspecte).

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

## Prochaine étape suggérée
Faire d'abord le **hub minimal** (Phase 0 du portail : `index.html` + `games-manifest.json`
avec seulement Drew "disponible" et les 3 autres en "bientôt") pour avoir un squelette
central tôt, puis brancher chaque jeu au fur et à mesure qu'il est prêt — plutôt que
d'attendre que les 4 jeux soient finis pour construire le hub.
