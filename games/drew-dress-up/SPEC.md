# Dress my Drew — Spec projet (pour Claude Code)

## Pitch
Jeu de "dress-up" façon site de filles 2012 (Stardoll, Dollmakers, Azaleas Dolls…),
kitsch et pixelisé, où on habille **Drew**, perso de JDR réputé pour son mauvais goût
vestimentaire. On choisit les vêtements dans une garde-robe, on habille la poupée,
et on peut **exporter le résultat en PNG**.

Angle : Drew a un mauvais goût légendaire → possibilité de tenues volontairement
horribles, bonus "chaos" (habillage aléatoire), petit ton humoristique/second degré
dans les textes UI.

## Stack technique recommandée
- **HTML / CSS / JS vanilla**, une seule page, pas de build (webpack/vite inutile ici).
  → Plus proche de l'esprit "site flash 2012", plus simple à faire tourner tel quel,
  plus facile à itérer avec Claude Code sans dépendances à gérer.
- **Canvas HTML5** pour l'export PNG (dessiner chaque calque image dans l'ordre puis
  `canvas.toDataURL()` + lien de téléchargement). Plus fiable que html2canvas pour
  des PNG avec transparence.
- Stockage local : `localStorage` pour sauvegarder une tenue (facultatif, phase avancée).
- Pas de backend nécessaire pour le MVP.

## Principe de base : poupée en calques (layers)
La poupée est une pile d'images PNG transparentes empilées dans un ordre fixe (z-index).
Chaque catégorie de vêtement correspond à un calque, et l'utilisateur choisit UN item
par catégorie (ou "rien").

### Ordre des calques (du fond vers le premier plan)
1. `background` (décor, optionnel)
2. `body` (base de Drew : silhouette/corps/visage neutre)
3. `bas` (pantalon, jupe, short)
4. `chaussures`
5. `haut` (t-shirt, chemise)
6. `veste_manteau`
7. `ceinture_accessoire_taille`
8. `bijoux`
9. `coiffure` (cheveux, séparé du visage pour permettre les chapeaux par-dessus)
10. `chapeau_couvre_chef`
11. `visage_extra` (lunettes, etc.)
12. `sticker_overlay` (option gadget rétro : étoiles, paillettes cliquables)

Cet ordre est **codé en dur dans un tableau JS** (`LAYER_ORDER`) pour que ce soit
trivial à modifier plus tard.

## Modèle de données : manifest des assets
Fichier `assets/manifest.json`, généré/édité à la main, qui liste les items par catégorie :

```json
{
  "bas": [
    { "id": "bas_01", "nom": "Jean moche", "fichier": "assets/bas/bas_01.png", "vignette": "assets/bas/thumbs/bas_01.png" }
  ],
  "haut": [
    { "id": "haut_01", "nom": "Chemise à carreaux douteuse", "fichier": "assets/haut/haut_01.png", "vignette": "assets/haut/thumbs/haut_01.png" }
  ]
}
```

- Une catégorie = une clé = un dossier `assets/<categorie>/`.
- Chaque item = un id unique, un nom (avec humour "mauvais goût" bienvenu), un chemin
  d'image pleine taille, un chemin de vignette pour la garde-robe.
- **Pendant le prototype (placeholders)** : le manifest pointe vers des formes générées
  (rectangles colorés en SVG inline ou PNG générés) au lieu de vraies images.
- **Passage aux vrais assets** : tu déposes tes PNG dans les bons dossiers avec les bons
  noms, tu mets à jour `manifest.json` → zéro changement de code nécessaire. C'est le
  point clé de l'architecture : le code ne connaît jamais le contenu artistique, juste
  le manifest.

### Convention pour tes futurs PNG
- Toutes les images au **même canvas de référence** (ex: 800×1200 px), fond transparent,
  perso centré/aligné pareil sur chaque calque, sinon les vêtements ne coïncideront pas
  avec le corps de base. À documenter/rappeler quand tu apporteras les vrais assets.

## Structure de fichiers du repo
```
dress-my-drew/
├── index.html
├── style.css
├── main.js              # logique principale, gestion d'état
├── layers.js            # LAYER_ORDER + logique de rendu/canvas
├── export.js            # génération PNG
├── assets/
│   ├── manifest.json
│   ├── body/
│   ├── bas/
│   ├── chaussures/
│   ├── haut/
│   ├── veste_manteau/
│   ├── ceinture_accessoire_taille/
│   ├── bijoux/
│   ├── coiffure/
│   ├── chapeau_couvre_chef/
│   ├── visage_extra/
│   └── sticker_overlay/
└── SPEC.md              # ce fichier
```

## Fonctionnalités — MVP (phases 1 à 3)
1. **Poupée centrale** qui affiche les calques empilés en direct.
2. **Garde-robe par onglets/catégories** (vignettes cliquables), une sélection à la fois
   par catégorie, re-clic = déshabiller (toggle).
3. **Bouton Export PNG** : aplati tous les calques visibles sur un canvas caché et
   télécharge l'image finale.

## Fonctionnalités — Rétro 2012 (phase 4, habillage visuel du site)
- Palette flashy (rose bonbon / violet / bleu ciel), dégradés, bordures en pointillés,
  coins arrondis façon widget MySpace/Stardoll.
- Police kitsch (type "Comic Sans" ou pixel font) pour les titres.
- Petits GIFs/étoiles animées CSS (`@keyframes` scintillement), curseur personnalisé.
- Bandeau "sous construction 🚧✨" ou compteur de visites factice, clin d'œil 2012.
- Bouton **"Chaos Drew"** : habille aléatoirement (parfait vu le thème du mauvais goût).
- Bouton **"🦅 Aigle"** : réinitialise tous les calques de vêtements à "rien" (ne garde
  que `body`). Lore : l'aigle de la fac vole les fringues moches de Drew.
  - Fonctionnellement, simple `resetOutfit()` qui vide la sélection de toutes les
    catégories sauf `body` → ne dépend pas des vrais assets, faisable dès la Phase 2/3.
  - Bonus visuel (Phase 4/5) : petite animation CSS d'un aigle (silhouette ou emoji 🦅)
    qui traverse l'écran en piqué au clic, + texte du style "L'aigle a fondu sur la
    garde-robe de Drew. Sa dignité vestimentaire est saine et sauve."
- Petits textes d'ambiance moqueurs générés selon la tenue (ex: "Drew pense que ça
  matche. Drew a tort.") — liste de phrases piochées au hasard.

## Fonctionnalités — bonus (phase 5+, optionnelles)
- Sauvegarde de tenue en `localStorage` + galerie de tenues sauvegardées.
- Import/export JSON de la tenue (liste des ids choisis) pour partager une combinaison
  sans exporter l'image.
- Livre d'or / guestbook factice (juste visuel, pas de vraie interactivité serveur).
- Musique de fond avec bouton mute (fichier libre de droits).

## Plan d'implémentation suggéré pour Claude Code (à donner tel quel en prompt)
1. **Phase 0** — Scaffolding : créer l'arborescence, `index.html` minimal, `manifest.json`
   vide, `LAYER_ORDER` défini dans `layers.js`.
2. **Phase 1** — Placeholders : générer des formes SVG colorées par catégorie (2-3 items
   par catégorie) pour avoir un prototype jouable sans art.
3. **Phase 2** — UI garde-robe + état de sélection + rendu en direct de la poupée.
4. **Phase 3** — Export PNG fonctionnel (bouton, canvas caché, téléchargement).
5. **Phase 4** — Habillage visuel rétro 2012 complet (CSS, police, animations, ton
   humoristique des textes).
6. **Phase 5** — Bonus (chaos, save/load, extras) si le temps/l'envie le permet.
7. **Phase 6** — Remplacement des placeholders par tes vrais PNG (juste toucher
   `manifest.json` + déposer les fichiers).

## Point d'attention pour la suite
Quand tu auras tes vrais PNG : vérifie qu'ils partagent tous le même cadrage/résolution
que le `body` de base, sinon il faudra un réglage d'offset par item (`decalage_x`,
`decalage_y` dans le manifest) — prévois ces deux champs optionnels dès maintenant dans
le JSON pour ne pas avoir à retoucher la structure plus tard.
