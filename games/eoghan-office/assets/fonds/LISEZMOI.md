# Fonds de salle de Kiss & Cache

Dépose ici tes images, **nommées exactement** comme la liste plus bas,
puis lance :

```bash
node outils/scan-assets.js
```

Tant qu'un fichier est absent, c'est le dessin SVG d'origine qui
s'affiche. Rien ne casse à moitié converti.

## Format

- Taille attendue : **2000 × 840 px** (le cadre de référence est 1000 × 420, export 2×).
- Le **ratio** est vérifié, la taille exacte non : un export en 1× ou 3×
  passe aussi, l'échelle est détectée et l'image s'affiche à la bonne
  taille. Un ratio faux est refusé, avec le détail à l'écran.
- Formats acceptés : `.png`, `.webp`, `.jpg`.

## À savoir

Vue de CÔTÉ, deux rangées de profondeur. Le haut de l'image est le fond de la salle, le bas le sol de la rangée avant. Aujourd'hui c'est un dégradé CSS en trois bandes (fond, sol arrière, sol avant).

## Les fichiers attendus

- `campus.png` — Le campus, plein jour  _(décor 1)_
- `soiree.png` — La soirée, lumière tamisée  _(décor 2)_
- `vestiaire.png` — Le vestiaire de sport  _(décor 3)_
- `bal.png` — Le bal de promo  _(décor 4)_

---

_Notice générée par `node outils/scan-assets.js --init`. Ne pas la
modifier à la main : la source est `outils/assets-familles.js`._
