# Créatures

Dépose ici tes images, **nommées exactement** comme la liste plus bas,
puis lance :

```bash
node outils/scan-assets.js
```

Tant qu'un fichier est absent, c'est le dessin SVG d'origine qui
s'affiche. Rien ne casse à moitié converti.

## Format

- Taille attendue : **128 × 128 px** (le cadre de référence est 64 × 64, export 2×).
- Le **ratio** est vérifié, la taille exacte non : un export en 1× ou 3×
  passe aussi, l'échelle est détectée et l'image s'affiche à la bonne
  taille. Un ratio faux est refusé, avec le détail à l'écran.
- Formats acceptés : `.png`, `.webp`, `.jpg`.

## À savoir

Fond transparent, cadre CARRÉ. La créature occupe le bas du cadre : dans Sanity Whack elle sort d'un trou, il faut donc que le haut du dessin soit la partie visible.

## Les fichiers attendus

- `gris.png` — Petit gris générique  _(Sanity Whack, Memory)_
- `ovni.png` — Ovni de tourisme  _(Sanity Whack, Memory)_
- `silhouette.png` — Silhouette floue dans les bois  _(Sanity Whack, Memory)_
- `oeil.png` — Œil géant dans le ciel  _(Sanity Whack, Memory)_
- `chevre.png` — Chèvre suspecte  _(Sanity Whack, Memory)_
- `ombre.png` — Ombre humanoïde du couloir  _(Sanity Whack, Memory)_
- `pennywise.png` — Pennywise  _(Sanity Whack, Memory, UMA Bros)_
- `slenderman.png` — Slenderman  _(Sanity Whack, Memory)_
- `cafard.png` — Cafard du campus  _(UMA Bros, Memory)_
- `oiseau.png` — Oiseau mal intentionné  _(UMA Bros, Memory)_
- `lutin.png` — Lutin de la fac  _(UMA Bros, Memory)_
- `ange.png` — Ange (exact)  _(UMA Bros, Memory)_
- `toto.png` — Toto, le perroquet d'Elias  _(Sanity Whack, Memory)_
- `aigle.png` — L'aigle qui fond sur la garde-robe  _(Dress my Drew)_

---

_Notice générée par `node outils/scan-assets.js --init`. Ne pas la
modifier à la main : la source est `outils/assets-familles.js`._
