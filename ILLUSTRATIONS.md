# Remplacer les dessins par de vraies illustrations

Tout le portail est dessiné **en code** : les personnages sortent d'une fabrique
SVG paramétrable (`shared/perso.js`), les créatures et les décors sont écrits à
la main dans les fichiers de données de chaque jeu. C'était fait pour tenir sans
art, pas pour rester.

Ce document est le mode d'emploi du remplacement. **Il n'y a aucun code à
toucher** : tu déposes des fichiers, tu lances une commande.

---

## 1. La procédure, en trois gestes

```bash
# 1. Qu'est-ce qu'il y a à produire ?
node outils/scan-assets.js --liste

# 2. … tu dessines, tu exportes, tu déposes les fichiers dans les dossiers …

# 3. Indexe ce que tu viens de déposer
node outils/scan-assets.js
```

Puis recharge la page — **avec Ctrl+Maj+R**, le serveur local ne renvoie pas
d'en-tête anti-cache et le navigateur garde l'ancienne version.

Trois autres commandes utiles :

| Commande | Ce qu'elle fait |
|---|---|
| `node outils/scan-assets.js --manque` | seulement ce qui reste à dessiner |
| `node outils/scan-assets.js --init` | (re)crée les dossiers et leurs notices |
| `node outils/test-assets.js` | vérifie que toute la chaîne tient |

### Ce que le scan te répond

```
Indexé 3 image(s) :
  ✓ assets/personnages/drew.png     96×144
  ✓ assets/creatures/ovni.png       128×128
  ✓ assets/vignettes/drew.png       640×480

Rejeté 1 fichier(s) :
  ✗ assets/personnages/boq.png
      mauvais ratio — 50×70 au lieu d'un multiple de 48×72 (attendu 96×144)

Ignoré — nom inconnu, probablement une faute de frappe :
  ? assets/creatures/soucoupe.png

assets/index.js écrit — 3 / 128 image(s) en ligne (2 %), 125 encore en SVG.
```

**Un fichier rejeté ou ignoré n'est pas perdu** : il reste sur le disque, il
n'est simplement pas affiché. Corrige et relance.

---

## 2. Ce qu'il ne faut PAS faire

- **Ne modifie pas `assets/index.js`.** C'est un fichier généré ; le prochain
  scan écrasera tout.
- **N'oublie pas de relancer le scan.** C'est le seul piège du dispositif :
  déposer un fichier ne suffit pas, rien ne se voit avant l'indexation. Si ton
  dessin n'apparaît pas, c'est presque toujours ça.
- **Ne supprime pas les SVG.** Ils sont le repli permanent et la référence de
  cadrage. Un dessin absent, rejeté, ou une image qui ne charge pas : le SVG
  reprend la main, silencieusement.

---

## 3. La nomenclature

### Le nom du fichier EST la clé

Un fichier est reconnu par son nom, pas par un réglage. `assets/creatures/ovni.png`
devient automatiquement le dessin de l'ovni — partout où il apparaît.

- **minuscules**, sans accent, sans espace, sans majuscule ;
- le **tiret** sépare les mots : `nid-de-poule.png`, `dos-carte.png` ;
- l'extension : `.png` (recommandé), `.webp` ou `.jpg` ;
- **un nom inconnu est ignoré** et signalé — c'est le garde-fou contre les
  fautes de frappe.

La liste exacte des noms attendus est donnée par `--liste`, et rappelée dans le
`LISEZMOI.md` de chaque dossier.

### Les variantes : `personnage-variante`

Un personnage a un dessin de base et des variantes :

```
drew.png              le dessin de base
drew-court.png        en train de courir
drew-saut.png         en saut
eoghan-accroupi.png   accroupi
elias-panique.png     visage paniqué
```

**Une cascade fait qu'un seul fichier de base suffit pour commencer.** Si
`eoghan-accroupi.png` n'existe pas, le jeu utilise `eoghan.png`. S'il n'existe
pas non plus, il dessine. Autrement dit : **livre un dessin par personnage, tu
les verras tous à l'écran immédiatement**, et affine les poses ensuite.

La cascade coupe au dernier tiret, une fois par essai :
`elias-visage-panique` → `elias-visage` → `elias`.

### Les dossiers

Les personnages, créatures, objets et vignettes sont **partagés par tout le
portail** — un seul `drew.png` sert dans quatre jeux. Le reste est propre à un
jeu.

```
assets/
├── personnages/     39 fichiers   partagé
├── creatures/       14            partagé
├── objets/          13            partagé
├── vignettes/       10            partagé (miniatures du hub)
└── index.js         ← GÉNÉRÉ, ne pas toucher

games/<jeu>/assets/  décors, mobilier, obstacles propres au jeu
```

---

## 4. Les formats

### L'échelle : exporte en 2×

Le **cadre de référence** est la taille que le dessin occupe à l'écran. Les
fichiers se livrent au **double**, pour rester nets sur téléphone et écran
Retina.

| Famille | Cadre à l'écran | À livrer (2×) |
|---|---|---|
| Personnages | 48 × 72 | **96 × 144** |
| Créatures | 64 × 64 | **128 × 128** |
| Objets | 64 × 64 | **128 × 128** |
| Vignettes du hub | 320 × 240 | **640 × 480** |
| Décors de Drew | 400 × 600 | **800 × 1200** |
| Fonds de Kiss & Cache | 1000 × 420 | **2000 × 840** |
| Ciels et parallaxes | 1200 × 400 | **2400 × 800** |

**1× et 3× passent aussi.** Le scanner détecte l'échelle réelle et l'image
s'affiche à la bonne taille — un fichier en 3× ne sera pas trois fois trop
grand. Tu peux donc livrer en 2× par défaut et monter en 3× sur un décor que tu
veux plus fin.

### Le ratio, lui, n'est pas négociable

C'est la seule contrainte dure. Un `50 × 70` à la place d'un `48 × 72`
déformerait le personnage : le scanner le refuse et te dit quoi corriger. La
tolérance est de 2 %, de quoi absorber un arrondi d'export, pas une erreur de
cadrage.

Trois familles ont un **ratio libre**, parce que leur forme est donnée par le
jeu et non par la famille : le mobilier de Kiss & Cache, les obstacles de Run
Glinda Run et ceux de Derry Driver. Là, seule la largeur compte.

### Le cadrage

- **Personnages** — fond transparent, **pieds posés sur le bord bas** du cadre,
  tête près du bord haut. C'est ce qui aligne tout le monde à la même hauteur
  d'un jeu à l'autre. De face, sauf mention contraire.
- **Créatures** — fond transparent, cadre **carré**, la bête occupant le bas :
  dans Sanity Whack elle sort d'un trou, seul le haut du dessin se voit.
- **Objets** — fond transparent, centré.
- **Mobilier** — fond transparent, **posé au sol** (le bas du dessin est le bas
  du meuble).
- **Vignettes** — 4/3 strict, et **lisible à 90 px de large** : c'est la taille
  réelle dans le rail « Tu aimeras aussi ». Pas de texte fin.
- **Décors et fonds** — pas besoin de transparence, ils passent derrière tout.
  Les couches de parallaxe de Run Glinda Run doivent **se raccorder à
  elles-mêmes** horizontalement (bord droit collé au bord gauche), sinon la
  boucle se voit.

---

## 5. Ce qui n'aura jamais d'image

Deux cas, et ce n'est pas un oubli.

**Les silhouettes de foule** (`shared/perso.js` → `spectateurSVG`). La tribune
de Pep Rally est remplie de variantes combinatoires — 3 formes × 6 maillots,
réparties au hasard sur cinq rangs — vues à 20 px de haut. 18 dessins pour un
gain nul.

**Le Love Tester n'a plus aucun dessin.** C'était le seul cas que ce dispositif
ne savait pas résoudre : la machine inventait un visage pour un prénom inconnu,
tiré du hachage du prénom, et l'ensemble des prénoms possibles est infini. Les
portraits ont donc été **retirés** : le gadget est redevenu ce qu'il était en
2012 — deux champs, une aiguille, un verdict. Du texte, et rien d'autre.

---

## 6. Comment ça marche, si tu veux le savoir

Trois pièces.

**`outils/assets-familles.js`** — la liste de référence. C'est la source unique :
le scanner y lit les noms attendus, les cadres, les notes. **Il n'y a pas de
liste recopiée ailleurs**, parce que l'inventaire qui vivait dans `CLAUDE.md`
avait été écrit quand le portail avait quatre jeux et était faux dès le sixième.

**`outils/scan-assets.js`** — le scanner. Il lit les dimensions directement dans
l'en-tête des fichiers (PNG, WebP, JPEG), sans aucune dépendance — installer une
bibliothèque pour lire quatre octets aurait été le premier `npm install` d'un
dépôt qui n'en a aucun. Il écrit `assets/index.js`.

**`shared/images.js`** — le résolveur. Il expose quatre fonctions que les jeux
appellent :

| Fonction | Pour quoi |
|---|---|
| `umaDessin(famille, id, svg)` | le cas courant : rend une balise `img`, ou le SVG |
| `umaFond(famille, id)` | un fond CSS (`url(...)`), ou `null` |
| `umaVignette(idJeu)` | la miniature d'un jeu, ou `null` |
| `umaImageCanvas(famille, id)` | une `Image` prête pour `drawImage`, ou `null` |

### Pourquoi un index, et pourquoi en `.js`

Le code doit savoir si un fichier existe. Trois façons, une seule tient :

- **tenter l'image et retomber sur l'erreur** — zéro configuration, mais un 404
  par dessin manquant : plus de deux cents dans la console tant que la
  production n'est pas finie. Déboguer autre chose devient impossible.
- **un champ à remplir à la main** dans chaque fichier de données — explicite,
  mais c'est 128 éditions réparties dans onze fichiers.
- **un index généré** — une commande après chaque lot. C'est le choix.

Et l'index est un `.js`, pas un `.json`, parce que les jeux dessinent **au
chargement** : un `fetch` arriverait après le premier rendu, il faudrait tout
redessiner, et plusieurs jeux mesurent leur scène au démarrage. Un `<script>`
posé avant ceux du jeu est lu de façon synchrone. Bonus : ça marche même en
ouvrant le fichier sans serveur.

L'index absent, vide ou périmé n'est **jamais** une erreur : tout retombe sur
les SVG, c'est-à-dire sur ce que le site affiche aujourd'hui.

### Le point de plus fort levier

`persoSVG` dessine **tous** les personnages du portail. Elle seule branche donc
les 39 dessins partout à la fois. Deux champs optionnels sur le `look` :

```js
persoSVG({ id: "eoghan", asset: "eoghan-accroupi", ...réglages })
//         ^ le personnage   ^ la variante voulue (facultatif)
```

`asset` existe parce que `pose` ne pouvait pas servir de clé : son vocabulaire
est celui du dessin (`bras-leves`) et il est réutilisé pour des choses
différentes d'un jeu à l'autre — la même pose sert au saut de Glinda et à la
fanfaronnade de Mads. En déduire un nom de fichier revenait à deviner.

---

## 7. Ajouter une famille ou un dessin à la liste

Ouvre `outils/assets-familles.js`, ajoute l'entrée, puis :

```bash
node outils/scan-assets.js --init     # crée le dossier et sa notice
node outils/test-assets.js            # vérifie que la famille est câblée
```

Le banc d'essai **refuse une famille que personne n'appelle** : si tu déclares
un dossier sans brancher son affichage, il te le dit. C'était le piège le plus
probable de tout ce dispositif — un scanner qui annonce « indexé » pendant que
l'écran continue d'afficher le SVG, sans que rien ne signale l'écart.

---

## 8. Si ça ne marche pas

| Symptôme | Cause presque certaine |
|---|---|
| Le dessin n'apparaît pas | le scan n'a pas été relancé, ou pas de Ctrl+Maj+R |
| « mauvais ratio » | l'export n'est pas au ratio du cadre (voir §4) |
| « nom inconnu » | faute de frappe ; `--liste` donne les noms exacts |
| Deux fois trop grand | ne devrait plus arriver ; vérifie que `echelle` est bien dans `assets/index.js` |
| Tout est redevenu du SVG | `assets/index.js` a été supprimé ou vidé — relance le scan |
