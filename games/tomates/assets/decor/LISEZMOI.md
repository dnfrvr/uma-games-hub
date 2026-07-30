# Décor de Balance ta tomate

Dépose ici tes images, **nommées exactement** comme la liste plus bas,
puis lance :

```bash
node outils/scan-assets.js
```

Tant qu'un fichier est absent, c'est le dessin SVG d'origine qui
s'affiche. Rien ne casse à moitié converti.

## Format

- Largeur attendue : **320 px** (export 2×).
- La hauteur suit le ratio propre à chaque élément, donné dans le
  fichier de données du jeu. Le scanner ne vérifie donc que la largeur.
- Formats acceptés : `.png`, `.webp`, `.jpg`.

## À savoir

Fête foraine : estrade, rideau de velours, herbe piétinée, fanions. Le monde du jeu fait 160 × 100 unités — respecte ce cadrage large.

## Les fichiers attendus

- `scene.png` — L'estrade et son rideau  _(fond)_
- `tonneau.png` — Un tonneau  _(abri)_
- `caisse.png` — Une caisse  _(abri)_
- `pancarte.png` — Une pancarte  _(abri)_

---

_Notice générée par `node outils/scan-assets.js --init`. Ne pas la
modifier à la main : la source est `outils/assets-familles.js`._
