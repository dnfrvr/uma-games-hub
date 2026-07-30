# Vignettes du hub

Dépose ici tes images, **nommées exactement** comme la liste plus bas,
puis lance :

```bash
node outils/scan-assets.js
```

Tant qu'un fichier est absent, c'est le dessin SVG d'origine qui
s'affiche. Rien ne casse à moitié converti.

## Format

- Taille attendue : **640 × 480 px** (le cadre de référence est 320 × 240, export 2×).
- Le **ratio** est vérifié, la taille exacte non : un export en 1× ou 3×
  passe aussi, l'échelle est détectée et l'image s'affiche à la bonne
  taille. Un ratio faux est refusé, avec le détail à l'écran.
- Formats acceptés : `.png`, `.webp`, `.jpg`.

## À savoir

4/3 strict. C'est la miniature de la grille d'accueil, du classement et du rail « Tu aimeras aussi » : elle doit rester lisible à 90 px de large. Pas de texte fin.

## Les fichiers attendus

- `drew.png` — Dress my Drew  _(hub)_
- `glinda.png` — Pep Rally Rhythm  _(hub)_
- `elias.png` — Sanity Whack  _(hub)_
- `eoghan.png` — Kiss & Cache  _(hub)_
- `uma-bros.png` — UMA Bros  _(hub)_
- `memory.png` — UMA Memory  _(hub)_
- `glinda-run.png` — Run, Glinda, Run  _(hub)_
- `derry-driver.png` — Derry Driver  _(hub)_
- `love-tester.png` — Love Tester  _(hub)_
- `tomates.png` — Balance ta tomate  _(hub)_

---

_Notice générée par `node outils/scan-assets.js --init`. Ne pas la
modifier à la main : la source est `outils/assets-familles.js`._
