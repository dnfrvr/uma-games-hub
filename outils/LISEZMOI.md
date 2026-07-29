# Outils de vérification

Des scripts Node qui chargent les jeux dans un **faux DOM** et vérifient leurs
règles sans navigateur. Ils ne font pas partie des jeux : **aucun build, aucune
dépendance**, les pages restent du HTML/CSS/JS servis tels quels.

Pourquoi : l'automatisation de navigateur ne sait pas simuler un maintien de
touche ni un glisser-déposer, et les captures d'écran ne disent rien du score
ou d'une fenêtre de jugement. Ces scripts, si.

À lancer depuis la **racine du dépôt** :

```bash
node outils/test-jeux.js              # 49 vérifications sur les 3 jeux + la fabrique de personnages
node outils/test-collisions.js        # aucun nom de classe CSS partagé entre la coque et les jeux
node outils/test-uma-bros.js         # les 3 niveaux d UMA Bros sont-ils franchissables ?
node outils/test-serie-elias.js       # la série de bons coups et la courbe de vagues de Sanity Whack
node outils/mesure-difficulte-eoghan.js   # ~2 min : mesure la difficulté des 3 décors de Kiss & Cache
```

## Ce que vérifie `test-collisions.js`

Le CSS n'a qu'un seul espace de noms, et le style d'un jeu est chargé **après**
les feuilles partagées : un nom de classe commun, et c'est le jeu qui gagne
silencieusement. C'est arrivé — `.note` désigne les notes qui tombent chez
Glinda ; la note sur 10 du lecteur, qui portait la même classe, s'est retrouvée
projetée en haut de la page en énorme. Elle s'appelle `.notation` depuis.

Le script compare les classes de `shared/*.css` + `style-hub.css` à celles des
quatre `games/*/style.css`. Les points d'extension volontaires (`.fun-btn`,
`.tab-btn`, `.active`, `.primary`) sont déclarés dans le script ; **tout autre
nom partagé fait échouer**. Si un jour un partage devient intentionnel, l'ajouter
à `PARTAGEES_VOLONTAIREMENT` avec un commentaire qui dit pourquoi.

## Ce que mesure `mesure-difficulte-eoghan.js`

Pour chaque décor, il échantillonne toute la salle (deux rangées, tous les
25 points, 20 fois par seconde sur la durée du chrono) et compte la part du
temps où une position est dans le champ d'un téléphone. C'est une propriété du
**décor seul**, indépendante de la façon de jouer.

Repère actuel — la courbe doit rester croissante :

| Décor      | Salle surveillée | Chrono | Ragots |
|------------|------------------|--------|--------|
| Campus     | ~24 %            | 100 s  | 3      |
| Soirée     | ~48 %            | 80 s   | 3      |
| Vestiaire  | ~56 %            | 55 s   | 2      |

C'est ce test qui a montré que le vestiaire (3,6 %) était plus sûr que le
campus (12,9 %) : les casiers alignés au fond coupaient toutes les lignes de vue.

## Densité des chorégraphies de Glinda

```bash
node -e "const fs=require('fs'),vm=require('vm');const c={Math,console};vm.createContext(c);
vm.runInContext(fs.readFileSync('games/glinda-cheer/charts.js','utf8'),c);
for(const ch of vm.runInContext('CHARTS',c)){const n=ch.notes;let m=1e9;
for(let i=1;i<n.length;i++){const d=n[i].temps_ms-n[i-1].temps_ms;if(d>0)m=Math.min(m,d);}
console.log(ch.nom, n.length+' notes, pas mini '+m+' ms');}"
```

Règle : **jamais moins de 200 ms entre deux notes**, rafale de 4 notes maximum
suivie d'une respiration. En dessous, la chorégraphie devient injouable à la
main (la finale était à 101 ms avant correction).

## Ce que vérifie `test-uma-bros.js`

Un jeu de plateforme se casse en silence : un trou trois pixels trop large et
le niveau devient infranchissable, sans aucune erreur nulle part. Le script
relit `games/uma-bros/niveaux.js` et vérifie, **pour chacun des quatre
personnages** (ils n ont ni la même détente ni la même foulée) : que chaque
trou se saute, que chaque plateforme est atteignable, qu aucun ennemi terrestre
ne patrouille au-dessus du vide, que le drapeau est posé sur du sol et que le
chrono laisse le temps de traverser.

Les formules sortent de la physique du moteur, qui lit les mêmes constantes
(`PHYSIQUE` dans `niveaux.js`) : changer la gravité ou la vitesse rejoue donc
la vérification sur les trois niveaux. Repère actuel — le plus grand trou par
niveau : 100 px, 112 px, 120 px, pour une portée sûre de 125 px chez le plus
lent (Elias).
