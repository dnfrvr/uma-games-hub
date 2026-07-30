# Obstacles de Run, Glinda, Run

Dépose ici tes images, **nommées exactement** comme la liste plus bas,
puis lance :

```bash
node outils/scan-assets.js
```

Tant qu'un fichier est absent, c'est le dessin SVG d'origine qui
s'affiche. Rien ne casse à moitié converti.

## Format

- Largeur attendue : **128 px** (export 2×).
- La hauteur suit le ratio propre à chaque élément, donné dans le
  fichier de données du jeu. Le scanner ne vérifie donc que la largeur.
- Formats acceptés : `.png`, `.webp`, `.jpg`.

## À savoir

Fond transparent. Chaque obstacle a déjà sa largeur et sa hauteur dans donnees.js : respecte SON ratio, pas un carré.

## Les fichiers attendus

- `sac.png` — Sac de sport  _(à sauter)_
- `poubelle.png` — Poubelle du campus  _(à sauter)_
- `banc.png` — Banc du parvis  _(à sauter)_
- `banderole.png` — Banderole des sélections  _(à glisser dessous)_
- `haie.png` — Haie taillée  _(à sauter)_
- `guirlande.png` — Guirlande de fanions  _(à glisser dessous)_
- `caddie.png` — Caddie abandonné  _(à sauter)_

---

_Notice générée par `node outils/scan-assets.js --init`. Ne pas la
modifier à la main : la source est `outils/assets-familles.js`._
