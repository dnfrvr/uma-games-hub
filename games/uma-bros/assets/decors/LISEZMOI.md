# Décors d'UMA Bros

Dépose ici tes images, **nommées exactement** comme la liste plus bas,
puis lance :

```bash
node outils/scan-assets.js
```

Tant qu'un fichier est absent, c'est le dessin SVG d'origine qui
s'affiche. Rien ne casse à moitié converti.

## Format

- Taille attendue : **2400 × 800 px** (le cadre de référence est 1200 × 400, export 2×).
- Le **ratio** est vérifié, la taille exacte non : un export en 1× ou 3×
  passe aussi, l'échelle est détectée et l'image s'affiche à la bonne
  taille. Un ratio faux est refusé, avec le détail à l'écran.
- Formats acceptés : `.png`, `.webp`, `.jpg`.

## À savoir

Fond de niveau, défile horizontalement. Se répète bien en largeur.

## Les fichiers attendus

- `universite.png` — L'université d'Augusta, plein jour  _(niveau 1)_
- `derry.png` — Derry, un soir de pluie  _(niveau 2)_
- `foret.png` — La forêt d'Augusta, nuit noire  _(niveau 3)_

---

_Notice générée par `node outils/scan-assets.js --init`. Ne pas la
modifier à la main : la source est `outils/assets-familles.js`._
