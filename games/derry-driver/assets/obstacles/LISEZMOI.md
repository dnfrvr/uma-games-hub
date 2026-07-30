# Véhicules et obstacles de Derry Driver

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

Vus de PROFIL, fond transparent. Les camions sont les trois chargements jouables.

## Les fichiers attendus

- `camionnette.png` — La camionnette (6 cartons)  _(véhicule)_
- `camion.png` — Le camion vert de Drew (10 cartons)  _(véhicule)_
- `semi.png` — La remorque pleine (16 cartons)  _(véhicule)_
- `nid-de-poule.png` — Un nid-de-poule  _(obstacle)_
- `plot.png` — Un plot de chantier  _(obstacle)_
- `barriere.png` — Une barrière de chantier  _(obstacle)_
- `colis.png` — Un colis égaré  _(bonus)_
- `jerrican.png` — Un jerrican  _(bonus carburant)_
- `carton.png` — Un carton qui tombe  _(cargaison)_

---

_Notice générée par `node outils/scan-assets.js --init`. Ne pas la
modifier à la main : la source est `outils/assets-familles.js`._
