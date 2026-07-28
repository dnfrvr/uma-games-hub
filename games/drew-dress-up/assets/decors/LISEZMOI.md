# Décors

Dépose ici tes images de décor (PNG ou JPG), puis renseigne le champ `fichier`
du décor correspondant dans `decors.js` :

```js
{
  id: "decor_augusta",
  nom: "Université d'Augusta",
  fichier: "assets/decors/augusta.png",   // <— ton image
  ...
}
```

Tant que `fichier` est vide, c'est le décor vectoriel de secours (le SVG écrit
juste en dessous) qui s'affiche. Dès qu'il est rempli, ton image est utilisée
à l'écran **et** dans l'export PNG, sans autre changement.

## Format

- Idéal : **400 × 600 px**, le même cadre de référence que la poupée.
- Un autre ratio passe aussi : l'image est cadrée en « cover » et centrée,
  donc les bords qui dépassent sont rognés.
- Pense à laisser la zone centrale assez lisible : Drew se tient au milieu,
  entre y ≈ 50 et y ≈ 560.

## Ajouter un décor

Copie un bloc dans le tableau `DECORS` de `decors.js` avec un `id` unique, un
`nom`, ton `fichier`, et une `vignette` (couleur de repli de la miniature).
Le champ `svg` est facultatif si `fichier` est renseigné.
