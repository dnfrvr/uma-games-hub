# Objets

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

Fond transparent, cadre carré, objet centré.

## Les fichiers attendus

- `camion.png` — Le camion vert de Drew  _(Memory (duo Drew))_
- `pompon.png` — Un pompon  _(Memory (duo Glinda), Pep Rally)_
- `carnet.png` — Le carnet à complots d'Elias  _(Memory (duo Elias))_
- `telephone.png` — Un téléphone qui filme  _(Memory (duo Eoghan))_
- `coeur.png` — Un cœur  _(Memory (duo Boq), Kiss & Cache)_
- `tomate.png` — Une tomate  _(Memory (duo Mads), Balance ta tomate)_
- `ballon.png` — Le ballon rouge  _(Memory (duo Pennywise))_
- `pizza.png` — Une part de pizza  _(Sanity Whack, Memory)_
- `champignon.png` — Un champignon  _(Memory (duo Lutin))_
- `gobelet.png` — Un gobelet renversé  _(Memory (duo Oiseau))_
- `vhs.png` — Une cassette VHS  _(Memory (duo Trophée))_
- `trophee.png` — Un trophée  _(Memory (duo VHS))_
- `dos-carte.png` — Le DOS d'une carte  _(UMA Memory (face cachée))_

---

_Notice générée par `node outils/scan-assets.js --init`. Ne pas la
modifier à la main : la source est `outils/assets-familles.js`._
