# Ajouter du contenu à Dress my Drew

Ce document explique comment ajouter **des vêtements**, **des décors** et
**la vraie poupée** sans toucher à la logique du jeu.

Le principe est toujours le même : le code ne connaît jamais le contenu
artistique, il lit seulement une liste (`assets/manifest.json` pour les
vêtements, `decors.js` pour les décors). Tu déposes un fichier, tu ajoutes une
ligne dans la liste, c'est fini.

---

## 0. Lancer le site en local

Le jeu lit `assets/manifest.json` par `fetch`, donc **il faut un serveur** —
un double-clic sur `index.html` ne suffit pas.

```
cd dress-my-drew
python serveur.py
```

Puis ouvre <http://localhost:8777/index.html>.

`serveur.py` est un `http.server` classique, avec l'en-tête qui interdit la
mise en cache. C'est important : avec `python -m http.server`, le navigateur
garde l'ancien `style.css` ou l'ancien `manifest.json` après une modification,
et on croit que le changement n'a pas été pris. Si tu utilises quand même un
autre serveur, recharge avec **Ctrl+Shift+R** après chaque modification.

---

## 1. Le cadre de référence

Tout est dessiné dans un cadre unique de **400 × 600 px**. Le corps de Drew,
chaque vêtement et chaque décor doivent partager ce cadre : c'est ce qui fait
que les calques se superposent correctement.

```
  0 ────────────────── 400
  0 ┌──────────────────┐
    │      décor       │   ← derrière tout
 50 │      ▄▄▄▄        │   ← chapeau / cheveux
    │     ██████       │
    │      body        │   ← corps de base
560 │     ▀▀▀▀▀▀       │   ← chaussures
600 └──────────────────┘
```

Règles pour tes PNG :

- taille exacte **400 × 600 px**, fond **transparent** ;
- Drew au même endroit sur **tous** les fichiers (ne recadre jamais un calque
  autour du vêtement seul, garde le cadre complet et laisse le reste vide) ;
- exporte en PNG-24 avec transparence, pas en PNG-8.

Si un fichier est légèrement décalé, tu peux le rattraper sans le rouvrir :
voir `decalageX` / `decalageY` au point 2.

---

## 2. Ajouter un vêtement

**En bref : tu déposes ton PNG dans le bon dossier, tu lances une commande,
c'est fini.**

```
python declarer_assets.py
```

Le script parcourt `assets/`, repère les images et écrit `assets/manifest.json`
à ta place. Tu n'as jamais à ouvrir le JSON.

| | |
|---|---|
| `python declarer_assets.py` | déclare ce qu'il trouve |
| `python declarer_assets.py --essai` | montre ce qu'il ferait, sans rien écrire |
| `python declarer_assets.py --nettoyer` | retire en plus les placeholders des catégories qui ont de vraies images |

Ce qu'il garantit :

- **le nom du fichier devient le nom de la pièce** — `chemise-hawaienne.png`
  donne « Chemise hawaienne ». Nomme donc tes fichiers comme tu veux les voir
  dans le jeu ;
- **tes retouches survivent** : si tu as renommé une pièce ou réglé un
  `decalageX` à la main, seul le champ `fichier` est mis à jour ;
- **rien n'est supprimé en silence** : une pièce dont le fichier a disparu est
  signalée, pas effacée ;
- `assets/body/` renseigne le corps de Drew et `assets/decors/` les décors,
  par le même chemin.

Les sections qui suivent détaillent ce que le script fait pour toi — utile si
tu veux ajuster quelque chose à la main.

### 2.1 Déposer le fichier

Un dossier par catégorie, déjà créés dans `assets/` :

| Catégorie (clé) | Dossier | Ce qu'on y met |
|---|---|---|
| `chapeau_couvre_chef` | `assets/chapeau_couvre_chef/` | casquettes, bonnets |
| `coiffure` | `assets/coiffure/` | cheveux |
| `visage_extra` | `assets/visage_extra/` | lunettes, maquillage |
| `bijoux` | `assets/bijoux/` | colliers, boucles |
| `haut` | `assets/haut/` | t-shirts, chemises |
| `veste_manteau` | `assets/veste_manteau/` | vestes, manteaux |
| `ceinture_accessoire_taille` | `assets/ceinture_accessoire_taille/` | ceintures |
| `calecon` | `assets/calecon/` | caleçons, boxers, slips |
| `bas` | `assets/bas/` | pantalons, jupes |
| `chaussures` | `assets/chaussures/` | chaussures |

Nomme le fichier `<categorie>_<numero>.png`, par exemple
`assets/haut/haut_03.png`.

### 2.2 Ce que contient une déclaration

C'est ce que le script écrit ; tu peux repasser derrière lui pour donner un nom
plus drôle ou corriger un décalage.

```json
"haut": [
  { "id": "haut_01", "nom": "Chemise à carreaux douteuse", "couleurPlaceholder": "#7E9680" },
  { "id": "haut_03", "nom": "Polo trois tailles trop grand", "fichier": "assets/haut/haut_03.png" }
]
```

| Champ | Obligatoire | À quoi ça sert |
|---|---|---|
| `id` | oui | identifiant unique dans tout le jeu |
| `nom` | oui | texte affiché sous la vignette (fais-toi plaisir, c'est Drew) |
| `fichier` | dès que tu as l'image | chemin du PNG 400 × 600 |
| `forme` | tant qu'il n'y a pas d'image | silhouette de secours (voir §2.4) |
| `couleurPlaceholder` | tant qu'il n'y a pas d'image | couleur de cette silhouette |
| `decalageX` / `decalageY` | non | décalage en px si le fichier est mal aligné |

Recharge la page : la pièce apparaît dans le rail, cliquable et glissable.

> Si ta modification n'apparaît pas, c'est le cache du navigateur : lance le
> site avec `serveur.py` (voir §0), ou recharge avec Ctrl+Shift+R.

### 2.4 Les silhouettes de secours

Tant qu'un item n'a pas de `fichier`, il est dessiné par une silhouette
définie dans `silhouettes.js`, teintée avec `couleurPlaceholder`. C'est ce qui
permet de se projeter avant d'avoir le moindre dessin.

Formes disponibles :

| Catégorie | Formes |
|---|---|
| `haut` | `tshirt` (défaut), `chemise` |
| `veste_manteau` | `veste` |
| `bas` | `pantalon` (défaut), `short`, `jupe` |
| `chaussures` | `baskets` (défaut), `tongs`, `sandales` |
| `ceinture_accessoire_taille` | `ceinture` |
| `calecon` | `calecon` (défaut), `slip` |
| `bijoux` | `collier` |
| `coiffure` | `bol` (défaut), `meche` |
| `chapeau_couvre_chef` | `casquette` (défaut), `casquette_envers` |
| `visage_extra` | `lunettes` |

Si tu omets `forme`, la forme par défaut de la catégorie est utilisée.

Pour en ajouter une, copie une entrée dans l'objet `FORMES` de
`silhouettes.js` : un `cadre` (le viewBox resserré utilisé pour la vignette de
la garde-robe) et un `dessin(couleur)` qui renvoie des tracés SVG placés dans
le cadre 400 × 600. Les repères du corps sont rappelés en tête du fichier
(épaules y 168, taille y 296, chevilles y 552…). Le helper `miroir()` duplique
un tracé de gauche en symétrie, pour les manches et les chaussures.

### 2.3 Ajouter une catégorie entière

Trois endroits, dans cet ordre :

1. `layers.js` → ajoute la clé dans `LAYER_ORDER`, **à la position où elle doit
   se superposer** (le tableau va du fond vers le premier plan).
2. `main.js` → ajoute la clé dans `RAIL_ORDER` (ordre d'affichage du rail, de la
   tête aux pieds), une icône dans `ICONE_CATEGORIE`, un libellé dans
   `labelCategorie()` et, si le nom est long, dans `labelCourt()`.
3. `assets/` → crée le dossier de la catégorie, du même nom que la clé.
   `declarer_assets.py` créera le tableau correspondant dans le manifest à son
   prochain passage.
4. `declarer_assets.py` → ajoute la clé dans `ORDRE` pour que le manifest reste
   lisible (facultatif, sans effet sur le jeu).

> `LAYER_ORDER` = ordre d'empilement à l'écran.
> `RAIL_ORDER` = ordre des onglets. Les deux sont volontairement séparés.

---

## 3. Ajouter ou remplacer un décor

Même geste que pour les vêtements : dépose l'image dans `assets/decors/` et
lance `python declarer_assets.py`.

- Le nom du fichier donne le nom du décor : `la-bibliotheque.png` devient
  « La bibliotheque » dans le rail.
- Pour **remplacer** un décor existant, nomme ton fichier avec son identifiant :
  `decor_augusta.png` remplace le décor vectoriel de l'Université d'Augusta.
  Les identifiants disponibles sont `decor_aucun`, `decor_augusta`,
  `decor_dortoir`, `decor_starbucks`, `decor_derry`, `decor_nature`.
- Tout autre nom **ajoute** un décor à la suite des six existants.

Les décors vectoriels de `decors.js` restent la solution de secours : ils ne
servent que tant qu'aucune image ne porte leur identifiant.

### 3.1 Format des décors

- Idéal : **400 × 600 px**.
- Un autre ratio passe : l'image est cadrée en « cover » et centrée, les bords
  qui dépassent sont rognés.
- Garde la zone centrale lisible, Drew se tient entre y ≈ 50 et y ≈ 560.

---

## 4. Ajouter la vraie poupée (le corps de Drew)

Le corps est pour l'instant une silhouette dessinée. Pour la remplacer par ton
propre Drew :

1. Dessine-le en **400 × 600 px**, fond transparent, dans une pose neutre et
   symétrique. C'est ce dessin qui fixe la position de tous les vêtements :
   fais-le en premier et n'y touche plus ensuite.
2. Dépose-le dans `assets/body/`.
3. Lance `python declarer_assets.py`.

C'est tout : l'affichage et l'export PNG passent par la même fonction
`urlCorps()`, qui prend la première image déclarée dans `body` et retombe sur
la silhouette dessinée s'il n'y en a aucune.

Ensuite, dessine chaque vêtement **par-dessus une copie de ce fichier** dans ton
logiciel de dessin, puis masque le calque du corps avant d'exporter. C'est la
seule façon fiable d'obtenir un alignement parfait.

### Et pour les vêtements en image ?

Rien à coder : `renderDoll()` et `exportDollAsPng()` passent déjà tous les deux
par `urlItem()`, qui prend `item.fichier` s'il existe et retombe sur la
silhouette sinon. Il suffit donc de remplir `fichier` dans le manifest
(voir §2.2). `decalageX` / `decalageY` sont appliqués des deux côtés.

Pour saisir une pièce sur Drew, le jeu lit la **transparence réelle** du calque
sous le pointeur, du vêtement le plus externe au plus interne. Il n'y a donc
aucune zone à régler : une pièce est attrapable exactement là où on la voit, et
une pièce entièrement cachée (un caleçon sous un pantalon) ne l'est pas — il
faut retirer ce qui la couvre, ou passer par sa vignette dans la garde-robe.

Cela vaut aussi pour tes PNG : leur canal alpha sert directement de zone
d'attrape. Seule exception, une image chargée depuis un autre domaine, dont le
navigateur interdit la lecture des pixels — garde tes fichiers dans `assets/`.

---

## 5. Vérifier après une modification

- [ ] la pièce apparaît dans le bon onglet du rail ;
- [ ] un clic l'enfile, un second la retire ;
- [ ] le glisser-déposer sur Drew fonctionne (souris **et** doigt) ;
- [ ] survoler une pièce portée l'entoure d'un halo, et un clic la retire ;
- [ ] glisser une pièce portée vers la garde-robe la retire ;
- [ ] sur mobile, la bande d'items défile bien au doigt ;
- [ ] le bouton 🦅 Aigle ne laisse que le caleçon — celui choisi par le joueur,
      ou un caleçon au hasard s'il n'en avait pas mis ;
- [ ] pendant le raid, Drew reste habillé tant que l'aigle descend : les pièces
      ne partent qu'au moment où il remonte, et elles s'envolent avec lui ;
- [ ] le bouton 🦅 est inactif le temps du raid, puis redevient cliquable ;
- [ ] le bouton 📸 Photo exporte un PNG où décor, corps et vêtements sont
      tous présents et bien alignés ;
- [ ] la page reste lisible en fenêtre étroite (le rail passe en bas).

---

## Où se trouve quoi

| Fichier | Rôle |
|---|---|
| `serveur.py` | serveur local, sans cache |
| `declarer_assets.py` | déclare les images déposées dans le manifest |
| `index.html` | structure de la page |
| `style.css` | tout l'habillage visuel |
| `layers.js` | cadre de référence, `LAYER_ORDER` (empilement) et repères du corps |
| `silhouettes.js` | corps de Drew + silhouettes de secours des vêtements |
| `decors.js` | liste des décors + leurs SVG de secours |
| `main.js` | état du jeu, garde-robe, glisser-déposer, rendu de la poupée |
| `export.js` | export PNG |
| `sparkle.js` | paillettes du curseur et compteur de visites |
| `assets/manifest.json` | liste des vêtements |
