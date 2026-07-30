# Mobilier de Kiss & Cache

Dépose ici tes images, **nommées exactement** comme la liste plus bas,
puis lance :

```bash
node outils/scan-assets.js
```

Tant qu'un fichier est absent, c'est le dessin SVG d'origine qui
s'affiche. Rien ne casse à moitié converti.

## Format

- Largeur attendue : **240 px** (export 2×).
- La hauteur suit le ratio propre à chaque élément, donné dans le
  fichier de données du jeu. Le scanner ne vérifie donc que la largeur.
- Formats acceptés : `.png`, `.webp`, `.jpg`.

## À savoir

Fond transparent, posé AU SOL (le bas du dessin est le bas du meuble). Le ratio de chaque meuble est donné par sa largeur/hauteur dans PROPS de decors.js — le scanner ne le vérifie donc pas ici.

## Les fichiers attendus

- `bureau.png` — Un bureau  _(coupe la vue)_
- `plante.png` — Une plante en pot  _(cachette)_
- `casier.png` — Une rangée de casiers  _(coupe la vue)_
- `canape.png` — Un canapé  _(coupe la vue)_
- `arbre.png` — Un arbre  _(coupe la vue)_
- `banc.png` — Un banc  _(cachette seulement)_
- `enceinte.png` — Une enceinte  _(cachette)_
- `buvette.png` — Une table de boissons  _(coupe la vue)_

---

_Notice générée par `node outils/scan-assets.js --init`. Ne pas la
modifier à la main : la source est `outils/assets-familles.js`._
