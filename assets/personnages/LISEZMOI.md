# Personnages

Dépose ici tes images, **nommées exactement** comme la liste plus bas,
puis lance :

```bash
node outils/scan-assets.js
```

Tant qu'un fichier est absent, c'est le dessin SVG d'origine qui
s'affiche. Rien ne casse à moitié converti.

## Format

- Taille attendue : **96 × 144 px** (le cadre de référence est 48 × 72, export 2×).
- Le **ratio** est vérifié, la taille exacte non : un export en 1× ou 3×
  passe aussi, l'échelle est détectée et l'image s'affiche à la bonne
  taille. Un ratio faux est refusé, avec le détail à l'écran.
- Formats acceptés : `.png`, `.webp`, `.jpg`.

## À savoir

Fond transparent. Pieds posés sur le bord BAS du cadre, tête proche du bord haut : c'est ce qui aligne tout le monde à la même hauteur d'un jeu à l'autre. Vu de face sauf mention contraire.

## Les fichiers attendus

- `drew.png` — Drew  _(partout)_
- `drew-court.png` — Drew — en train de courir  _(UMA Bros)_
- `drew-saut.png` — Drew — en saut  _(UMA Bros)_
- `glinda.png` — Glinda  _(partout)_
- `glinda-gauche.png` — Glinda — pompons à gauche  _(Pep Rally Rhythm)_
- `glinda-droite.png` — Glinda — pompons à droite  _(Pep Rally Rhythm)_
- `glinda-haut.png` — Glinda — pompons en haut  _(Pep Rally Rhythm)_
- `glinda-bas.png` — Glinda — pompons en bas  _(Pep Rally Rhythm)_
- `glinda-court.png` — Glinda — course  _(Run, Glinda, Run + UMA Bros)_
- `glinda-saut.png` — Glinda — saut  _(Run, Glinda, Run + UMA Bros)_
- `glinda-glisse.png` — Glinda — glissade  _(Run, Glinda, Run)_
- `elias.png` — Elias  _(partout)_
- `elias-court.png` — Elias — course  _(UMA Bros)_
- `elias-saut.png` — Elias — saut  _(UMA Bros)_
- `elias-calme.png` — Elias — visage : ça va  _(Sanity Whack (avatar))_
- `elias-nerveux.png` — Elias — visage : nerveux  _(Sanity Whack (avatar))_
- `elias-deraille.png` — Elias — visage : ça déraille  _(Sanity Whack (avatar))_
- `elias-bout.png` — Elias — visage : au bout  _(Sanity Whack (avatar))_
- `eoghan.png` — Eoghan  _(partout)_
- `eoghan-marche.png` — Eoghan — en marche  _(Kiss & Cache)_
- `eoghan-accroupi.png` — Eoghan — accroupi  _(Kiss & Cache)_
- `eoghan-bisou.png` — Eoghan — en train d'embrasser  _(Kiss & Cache)_
- `eoghan-court.png` — Eoghan — course  _(UMA Bros)_
- `eoghan-saut.png` — Eoghan — saut  _(UMA Bros)_
- `camarade.png` — La camarade de Glinda  _(Pep Rally Rhythm)_
- `camarade-gauche.png` — La camarade de Glinda — pompons à gauche  _(Pep Rally Rhythm)_
- `camarade-droite.png` — La camarade de Glinda — pompons à droite  _(Pep Rally Rhythm)_
- `camarade-haut.png` — La camarade de Glinda — pompons en haut  _(Pep Rally Rhythm)_
- `camarade-bas.png` — La camarade de Glinda — pompons en bas  _(Pep Rally Rhythm)_
- `boq.png` — Boq  _(UMA Memory, Love Tester)_
- `boq-court.png` — Boq — en train de poursuivre  _(Run, Glinda, Run)_
- `mads.png` — Mads Prout  _(Balance ta tomate, UMA Memory, Love Tester)_
- `mads-nargue.png` — Mads Prout — bras levés, fanfaron  _(Balance ta tomate)_
- `mads-planque.png` — Mads Prout — accroupi derrière un abri  _(Balance ta tomate)_
- `mads-touche.png` — Mads Prout — touché par une tomate  _(Balance ta tomate)_
- `nils.png` — Nils  _(UMA Bros, UMA Memory, Love Tester)_
- `elphie.png` — Elphie  _(UMA Bros, UMA Memory, Love Tester)_
- `mamie.png` — La grand-mère d'Elias  _(Sanity Whack, UMA Memory)_
- `lanceur.png` — Le lanceur de tomates (dos)  _(Balance ta tomate)_

---

_Notice générée par `node outils/scan-assets.js --init`. Ne pas la
modifier à la main : la source est `outils/assets-familles.js`._
