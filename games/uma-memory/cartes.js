/* =========================================================
   UMA Memory — les données du jeu
   ---------------------------------------------------------
   Tout ce qui est CONTENU vit ici : le casting des cartes, les tailles de
   grille et le barème. `main.js` ne connaît aucun nom propre — ajouter une
   carte ou une grille ne demande pas d'y toucher.

   LE CASTING EST CELUI DE TOUT LE PORTAIL : les quatre têtes d'affiche, les
   personnages qu'on croise dans les autres jeux, et surtout TOUT CE QUI Y
   SERT D'ENNEMI — les créatures de Sanity Whack, le bestiaire d'UMA Bros,
   plus les objets qui traînent d'un jeu à l'autre. Un joueur du portail doit
   reconnaître chaque carte.

   La règle du jeu tient dans ce fichier autant que dans le moteur : les
   paires ne sont pas des doublons, ce sont des DUOS (voir `DUOS` plus bas).
   Aucune carte n'apparaît deux fois ; celle qu'il faut retrouver est celle
   qui va AVEC — le personnage et ce qui lui appartient.

   Le tirage se fait au hasard dans `DUOS` à chaque partie : les duos
   présents changent, et leurs places aussi. On n'apprend donc jamais un
   tapis par cœur, on apprend le monde — ce qui sert à toutes les parties.

   Tout est dessiné ici : les personnages sortent de `shared/perso.js`
   (jamais un autre style de dessin), les créatures sont redessinées dans le
   même vocabulaire — trait épais, aplats, aucune image externe — et recadrées
   au format des personnages pour qu'une carte ressemble à une carte.

   `test-memory.js`, à côté, relit ce fichier et vérifie que chaque grille
   est distribuable et que la difficulté monte vraiment.
   ========================================================= */

/* Le trait de tout le portail. Même valeur que dans shared/perso.js, pour
   qu'un cafard et une cheerleader se posent sur la même carte sans qu'on
   voie la couture. */
const TRAIT_CARTE = "#2b1a2e";

/* Les créatures partagent le cadre des personnages (48 × 72) : sur une
   carte, un ovni et Glinda occupent exactement la même place. C'est ce qui
   empêche de reconnaître une carte à sa silhouette au lieu de son dessin. */
function dessinCarte(contenu) {
  return (
    '<svg viewBox="0 0 48 72" xmlns="http://www.w3.org/2000/svg" ' +
    'stroke-linejoin="round" stroke-linecap="round" class="perso-svg">' +
    contenu +
    "</svg>"
  );
}

/* Alias court : il revient trois fois par dessin, et ces chaînes sont déjà
   assez longues comme ça. Nom en capitales pour qu'aucun autre fichier de la
   page ne redéclare la même variable globale par accident. */
const TR = TRAIT_CARTE;

/* =========================================================
   Le bestiaire — ce qui rôde dans les autres jeux
   ---------------------------------------------------------
   Recadré depuis Sanity Whack (créatures en 64 × 64) et UMA Bros (ennemis
   à taille variable) vers le cadre commun des cartes.
   ========================================================= */
const BESTIAIRE = {
  gris: dessinCarte(
    '<path d="M24 63C11 63 5 47 5 33 5 20 13 9 24 9s19 11 19 24c0 14-6 30-19 30z" fill="#b7e36b" stroke="' + TR + '" stroke-width="3.5"/>' +
    '<path d="M10 29c2-6 8-8 11-4 3 3 2 8-2 10-5 2-10-1-9-6z" fill="' + TR + '"/>' +
    '<path d="M38 29c-2-6-8-8-11-4-3 3-2 8 2 10 5 2 10-1 9-6z" fill="' + TR + '"/>' +
    '<path d="M18 48q6 5 12 0" fill="none" stroke="' + TR + '" stroke-width="3"/>'
  ),

  ovni: dessinCarte(
    '<path d="M14 32a10 10 0 0 1 20 0z" fill="#cfe9ff" stroke="' + TR + '" stroke-width="3"/>' +
    '<ellipse cx="24" cy="36" rx="21" ry="8" fill="#8fa4c4" stroke="' + TR + '" stroke-width="3"/>' +
    '<circle cx="10" cy="38" r="2.6" fill="#ffd84d" stroke="' + TR + '" stroke-width="1.8"/>' +
    '<circle cx="24" cy="40" r="2.6" fill="#ff3d9a" stroke="' + TR + '" stroke-width="1.8"/>' +
    '<circle cx="38" cy="38" r="2.6" fill="#4de0ff" stroke="' + TR + '" stroke-width="1.8"/>' +
    '<path d="M16 45l-5 19h26l-5-19z" fill="#ffd84d" opacity=".4"/>'
  ),

  silhouette: dessinCarte(
    '<path d="M3 66l6-27 5 11 5-21 6 18 5-15 6 20 6-13 3 27z" fill="#1f4d33" stroke="' + TR + '" stroke-width="2.6"/>' +
    '<path d="M24 66c-6 0-10-6-10-15 0-9 4-16 10-16s10 7 10 16c0 9-4 15-10 15z" fill="#14202a" stroke="' + TR + '" stroke-width="3"/>' +
    /* Les yeux sont la seule chose lisible d'une forme noire : à 2,6 de rayon
       ils disparaissaient sur une carte de 80 px de large. */
    '<circle cx="19.5" cy="44" r="3.4" fill="#ffe86b" stroke="' + TR + '" stroke-width="1.4"/>' +
    '<circle cx="28.5" cy="44" r="3.4" fill="#ffe86b" stroke="' + TR + '" stroke-width="1.4"/>'
  ),

  oeil: dessinCarte(
    '<path d="M2 36c9-13 14-18 22-18s13 5 22 18c-9 13-14 18-22 18S11 49 2 36z" fill="#ffffff" stroke="' + TR + '" stroke-width="3.5"/>' +
    '<circle cx="24" cy="36" r="12" fill="#4aa3d4" stroke="' + TR + '" stroke-width="3"/>' +
    '<circle cx="24" cy="36" r="5.5" fill="' + TR + '"/>' +
    '<circle cx="20.5" cy="32.5" r="2.2" fill="#ffffff"/>'
  ),

  /* Quatre signes, et seulement eux, font une chèvre : cornes recourbées vers
     l'arrière, oreilles tombantes sur les côtés, pupilles rectangulaires,
     barbiche. Sans ça, on obtient un lapin (cornes dressées) ou un cochon
     (museau rond). Les deux ont été essayés. */
  chevre: dessinCarte(
    '<path d="M17 20c-3-6-9-10-13-8 1 7 5 11 10 13M31 20c3-6 9-10 13-8-1 7-5 11-10 13" ' +
      'fill="#c9c2b4" stroke="' + TR + '" stroke-width="2.8"/>' +
    '<path d="M10 34c-4-2-8 0-8 3s5 5 9 4zM38 34c4-2 8 0 8 3s-5 5-9 4z" fill="#e2d8cc" stroke="' + TR + '" stroke-width="2.6"/>' +
    '<path d="M24 61c-9 0-15-8-15-19 0-10 6-17 15-17s15 7 15 17c0 11-6 19-15 19z" fill="#efe9dc" stroke="' + TR + '" stroke-width="3.2"/>' +
    '<ellipse cx="18" cy="37" rx="4.2" ry="3.2" fill="#ffffff" stroke="' + TR + '" stroke-width="2"/>' +
    '<ellipse cx="30" cy="37" rx="4.2" ry="3.2" fill="#ffffff" stroke="' + TR + '" stroke-width="2"/>' +
    '<rect x="16" y="36" width="4.4" height="2.4" rx="1" fill="' + TR + '"/>' +
    '<rect x="28" y="36" width="4.4" height="2.4" rx="1" fill="' + TR + '"/>' +
    '<circle cx="21.5" cy="47" r="1.3" fill="' + TR + '"/><circle cx="26.5" cy="47" r="1.3" fill="' + TR + '"/>' +
    '<path d="M20 52h8" stroke="' + TR + '" stroke-width="2.6"/>' +
    '<path d="M20 59c1 6 2 9 4 10 2-1 3-4 4-10z" fill="#efe9dc" stroke="' + TR + '" stroke-width="2.6"/>'
  ),

  ombre: dessinCarte(
    '<path d="M24 8c5 0 9 4 9 10 0 3-1 5-2 7 7 3 11 10 11 19v22H6V44c0-9 4-16 11-19-1-2-2-4-2-7 0-6 4-10 9-10z" ' +
      'fill="#241a35" stroke="' + TR + '" stroke-width="3"/>' +
    '<circle cx="20" cy="19" r="2.4" fill="#c6ff4d"/><circle cx="28" cy="19" r="2.4" fill="#c6ff4d"/>'
  ),

  /* Le clown du caniveau : ballon, collerette rousse, sourire fendu. */
  clown: dessinCarte(
    '<circle cx="40" cy="12" r="6" fill="#e0002b" stroke="' + TR + '" stroke-width="2.5"/>' +
    '<path d="M40 18c-2 5-2 10 0 14" fill="none" stroke="' + TR + '" stroke-width="1.8"/>' +
    '<path d="M9 43c-3-2-4-7-2-10 2 2 5 3 7 2M39 45c3-3 4-8 2-11-2 2-4 3-6 3" fill="#e8501e" stroke="' + TR + '" stroke-width="2.6"/>' +
    '<path d="M10 45c-2-7 3-13 7-15-5-5-3-13 2-14 3 5 10 7 15 3 3 5 8 7 12 5-2 7-5 11-9 13 4 4 5 9 3 13z" ' +
      'fill="#e8501e" stroke="' + TR + '" stroke-width="2.6"/>' +
    '<path d="M24 63c-10 0-16-8-16-18s6-17 16-17 16 8 16 17-6 18-16 18z" fill="#fdf3ee" stroke="' + TR + '" stroke-width="3.4"/>' +
    '<path d="M18 35l3 5M30 35l-3 5" stroke="#c22f52" stroke-width="2.6"/>' +
    '<circle cx="19" cy="42" r="2.6" fill="' + TR + '"/><circle cx="29" cy="42" r="2.6" fill="' + TR + '"/>' +
    '<circle cx="24" cy="47" r="3.4" fill="#e0002b" stroke="' + TR + '" stroke-width="2.2"/>' +
    '<path d="M15 49q9 12 18 0" fill="none" stroke="#c22f52" stroke-width="3"/>'
  ),

  /* Le grand type sans visage, en costume trop bien coupé. */
  grandType: dessinCarte(
    '<path d="M14 44c-5-4-8-14-6-21 3 4 6 6 8 9M34 44c5-4 8-14 6-21-3 4-6 6-8 9" fill="none" stroke="' + TR + '" stroke-width="2.6"/>' +
    '<path d="M24 68V34" stroke="' + TR + '" stroke-width="2.6"/>' +
    '<path d="M15 68V46c0-6 4-11 9-11s9 5 9 11v22z" fill="#1b1b22" stroke="' + TR + '" stroke-width="3"/>' +
    '<path d="M24 34l-4 9 4 5 4-5z" fill="#ffffff"/>' +
    '<ellipse cx="24" cy="20" rx="10" ry="13" fill="#f2f2f2" stroke="' + TR + '" stroke-width="3"/>'
  ),

  /* --- Le bestiaire d'UMA Bros --- */
  cafard: dessinCarte(
    '<g stroke="' + TR + '" stroke-width="2.6">' +
      '<path d="M16 48l-6 8M25 51v8M34 48l6 8M16 33L8 27M34 33l8-6"/>' +
    "</g>" +
    '<ellipse cx="25" cy="39" rx="17" ry="11" fill="#7a4a1e" stroke="' + TR + '" stroke-width="3"/>' +
    '<path d="M25 28v22" stroke="' + TR + '" stroke-width="2.2"/>' +
    '<circle cx="10" cy="26" r="6" fill="#5a3414" stroke="' + TR + '" stroke-width="2.8"/>' +
    '<path d="M6 21L3 14M14 21l3-7" stroke="' + TR + '" stroke-width="2.2"/>' +
    '<circle cx="9" cy="25" r="1.6" fill="#ffd84d"/>'
  ),

  /* De profil, une aile levée et un sourcil : deux ailes symétriques et une
     tête posée au milieu donnaient une motte grise qu'on ne lisait pas. */
  oiseau: dessinCarte(
    '<path d="M9 44L2 52l13-1z" fill="#6d7f8f" stroke="' + TR + '" stroke-width="2.6"/>' +
    '<ellipse cx="24" cy="47" rx="16" ry="10" fill="#93a6b6" stroke="' + TR + '" stroke-width="3"/>' +
    '<path d="M20 40c2-13 13-17 19-11-5 4-7 10-7 15z" fill="#6d7f8f" stroke="' + TR + '" stroke-width="2.8"/>' +
    '<circle cx="35" cy="39" r="8" fill="#93a6b6" stroke="' + TR + '" stroke-width="2.8"/>' +
    '<path d="M42 37l6 3-6 3z" fill="#ffb400" stroke="' + TR + '" stroke-width="2"/>' +
    '<circle cx="36" cy="37" r="1.8" fill="' + TR + '"/>' +
    '<path d="M31 32l7 3" stroke="' + TR + '" stroke-width="2.4"/>' +
    '<path d="M22 57l-2 7M29 57l-2 7" stroke="#ffb400" stroke-width="2.6"/>'
  ),

  lutin: dessinCarte(
    '<path d="M24 7l12 17H12z" fill="#2f9e44" stroke="' + TR + '" stroke-width="3"/>' +
    '<circle cx="24" cy="35" r="13" fill="#d9f0b8" stroke="' + TR + '" stroke-width="3"/>' +
    '<path d="M11 33l-6-4 6-3zM37 33l6-4-6-3z" fill="#d9f0b8" stroke="' + TR + '" stroke-width="2.6"/>' +
    '<circle cx="19" cy="33" r="2" fill="' + TR + '"/><circle cx="29" cy="33" r="2" fill="' + TR + '"/>' +
    '<path d="M19 40q5 4 10 0" fill="none" stroke="' + TR + '" stroke-width="2.4"/>' +
    '<path d="M13 49h22v13H13z" fill="#2f9e44" stroke="' + TR + '" stroke-width="3"/>'
  ),

  /* L'ange exact : des cercles concentriques et des pétales, rien qui
     ressemble à un visage. C'est bien le problème. */
  ange: dessinCarte(
    '<g fill="none" stroke="#ffd84d" stroke-width="3">' +
      '<circle cx="24" cy="36" r="21"/><circle cx="24" cy="36" r="13.5"/><circle cx="24" cy="36" r="6.5"/>' +
    "</g>" +
    '<g fill="#fff8dc" stroke="' + TR + '" stroke-width="2">' +
      '<ellipse cx="24" cy="17" rx="4.6" ry="3.2"/><ellipse cx="24" cy="55" rx="4.6" ry="3.2"/>' +
      '<ellipse cx="5" cy="36" rx="3.2" ry="4.6"/><ellipse cx="43" cy="36" rx="3.2" ry="4.6"/>' +
      '<ellipse cx="24" cy="29.5" rx="4.4" ry="3"/><ellipse cx="24" cy="42.5" rx="4.4" ry="3"/>' +
      '<ellipse cx="17.5" cy="36" rx="3" ry="4.4"/><ellipse cx="30.5" cy="36" rx="3" ry="4.4"/>' +
    "</g>" +
    '<circle cx="24" cy="36" r="2.6" fill="' + TR + '"/>'
  ),

  /* Toto, le perroquet : il répète tout, y compris ce qu'il ne faut pas. */
  perroquet: dessinCarte(
    '<path d="M13 64h22" stroke="' + TR + '" stroke-width="3.5"/>' +
    '<path d="M21 54v10M28 54v10" stroke="' + TR + '" stroke-width="3"/>' +
    '<path d="M31 33c8 6 11 16 8 22-6-1-11-8-12-15z" fill="#2f6f8f" stroke="' + TR + '" stroke-width="2.5"/>' +
    '<path d="M24 56c-9 0-15-8-15-18s6-16 15-16 15 6 15 16-6 18-15 18z" fill="#3faa5a" stroke="' + TR + '" stroke-width="3"/>' +
    '<path d="M17 30c-5 5-7 13-4 20 4 1 8-4 8-9z" fill="#c6ff4d" stroke="' + TR + '" stroke-width="2.5"/>' +
    '<circle cx="26" cy="19" r="11" fill="#ffd84d" stroke="' + TR + '" stroke-width="3"/>' +
    '<circle cx="23" cy="18" r="2.6" fill="' + TR + '"/><circle cx="24" cy="17" r="0.9" fill="#ffffff"/>' +
    '<path d="M34 16c5 1 7 5 4 9-3 3-6 1-7-3z" fill="#e8501e" stroke="' + TR + '" stroke-width="2.5"/>' +
    '<path d="M20 8c-1-4 2-6 4-4M27 6c0-4 4-5 6-2" fill="none" stroke="#e0002b" stroke-width="3"/>'
  ),
};

/* =========================================================
   Les objets qui traînent d'un jeu à l'autre
   ========================================================= */
const OBJETS = {
  camion: dessinCarte(
    '<rect x="3" y="22" width="27" height="22" rx="3" fill="#2f9e44" stroke="' + TR + '" stroke-width="3"/>' +
    '<path d="M30 26h7l8 10v8H30z" fill="#37b24d" stroke="' + TR + '" stroke-width="3"/>' +
    '<rect x="33" y="29" width="8" height="7" rx="1.5" fill="#bfe6ff" stroke="' + TR + '" stroke-width="2"/>' +
    '<path d="M6 30h18M6 36h18" stroke="#1f6b2f" stroke-width="2.4"/>' +
    '<circle cx="13" cy="50" r="7" fill="' + TR + '"/><circle cx="13" cy="50" r="2.6" fill="#d9d9d9"/>' +
    '<circle cx="37" cy="50" r="7" fill="' + TR + '"/><circle cx="37" cy="50" r="2.6" fill="#d9d9d9"/>'
  ),

  /* Un bord ébouriffé, pas des rayons : le cercle à rayons se lisait comme
     une roue de vélo, et des pointes trop longues comme une étoile. Douze
     bosses courtes, quelques fibres à l'intérieur, et c'est une touffe. */
  pompon: dessinCarte(
    '<path d="M24 44v20" stroke="#16255c" stroke-width="5"/>' +
    '<path d="M42 30L38.5 33.9 39.6 39 34.6 40.6 33 45.6 27.9 44.5 24 48 20.1 44.5 15 45.6 13.4 40.6 ' +
      '8.4 39 9.5 33.9 6 30 9.5 26.1 8.4 21 13.4 19.4 15 14.4 20.1 15.5 24 12 27.9 15.5 33 14.4 ' +
      '34.6 19.4 39.6 21 38.5 26.1Z" fill="#ffffff" stroke="' + TR + '" stroke-width="2.8"/>' +
    '<g stroke="#16255c" stroke-width="1.8" opacity=".8">' +
      '<path d="M24 30l-9 7M24 30l9 7M24 30l-10-4M24 30l10-4M24 30v-11M24 30v10"/>' +
    "</g>" +
    '<circle cx="24" cy="30" r="3.4" fill="#16255c"/>'
  ),

  carnet: dessinCarte(
    '<rect x="7" y="11" width="34" height="48" rx="3" fill="#f6efdc" stroke="' + TR + '" stroke-width="3"/>' +
    '<path d="M12 20h24M12 27h17M12 34h21" stroke="#8a7f6a" stroke-width="2"/>' +
    '<path d="M14 43l12 9 10-7" fill="none" stroke="#e0002b" stroke-width="2.4"/>' +
    '<circle cx="14" cy="43" r="3.2" fill="#e0002b" stroke="' + TR + '" stroke-width="2"/>' +
    '<circle cx="26" cy="52" r="3.2" fill="#e0002b" stroke="' + TR + '" stroke-width="2"/>' +
    '<circle cx="36" cy="45" r="3.2" fill="#e0002b" stroke="' + TR + '" stroke-width="2"/>'
  ),

  telephone: dessinCarte(
    '<rect x="12" y="9" width="24" height="54" rx="5" fill="#2b2b38" stroke="' + TR + '" stroke-width="3"/>' +
    '<rect x="16" y="16" width="16" height="38" rx="2" fill="#bfe6ff"/>' +
    '<circle cx="24" cy="58" r="2.2" fill="#8fa4c4"/>' +
    '<path d="M24 24l3.4 7.6L35 35l-7.6 3.4L24 46l-3.4-7.6L13 35l7.6-3.4z" fill="#ff3d9a"/>'
  ),

  tomate: dessinCarte(
    '<circle cx="24" cy="41" r="18" fill="#e03131" stroke="' + TR + '" stroke-width="3"/>' +
    '<path d="M24 24c-7 0-10-4-10-4 3-1 7 0 7 0-3-3-2-6-2-6 3 1 5 5 5 5s2-4 5-5c0 0 1 3-2 6 0 0 4-1 7 0 0 0-3 4-10 4z" ' +
      'fill="#2f9e44" stroke="' + TR + '" stroke-width="2.5"/>' +
    '<path d="M24 20v-6" stroke="#2f9e44" stroke-width="3"/>' +
    '<path d="M15 36q4-5 9-5" fill="none" stroke="#ffffff" stroke-width="3" opacity=".55"/>'
  ),

  pizza: dessinCarte(
    '<path d="M24 9l17 44H7z" fill="#f0c14b" stroke="' + TR + '" stroke-width="3"/>' +
    '<path d="M24 18l12 31H12z" fill="#e8a33a"/>' +
    '<circle cx="24" cy="32" r="4.2" fill="#c22f52" stroke="' + TR + '" stroke-width="2"/>' +
    '<circle cx="17" cy="44" r="3.6" fill="#c22f52" stroke="' + TR + '" stroke-width="2"/>' +
    '<circle cx="31" cy="44" r="3.6" fill="#c22f52" stroke="' + TR + '" stroke-width="2"/>' +
    '<path d="M7 53h34" stroke="' + TR + '" stroke-width="4"/>'
  ),

  ballon: dessinCarte(
    '<path d="M24 46c-9 0-16-8-16-19S15 8 24 8s16 8 16 19-7 19-16 19z" fill="#e0002b" stroke="' + TR + '" stroke-width="3"/>' +
    '<path d="M20 46h8l-4 6z" fill="#e0002b" stroke="' + TR + '" stroke-width="2"/>' +
    '<path d="M24 52c5 5-5 8 0 14" fill="none" stroke="' + TR + '" stroke-width="2.5"/>' +
    '<ellipse cx="17" cy="20" rx="3.5" ry="6" fill="#ffffff" opacity=".4" transform="rotate(-22 17 20)"/>'
  ),

  vhs: dessinCarte(
    '<rect x="4" y="17" width="40" height="38" rx="3" fill="#1b1b22" stroke="' + TR + '" stroke-width="3"/>' +
    '<rect x="9" y="21" width="30" height="12" rx="2" fill="#f2f2f2" stroke="' + TR + '" stroke-width="2"/>' +
    '<path d="M13 26h21M13 30h13" stroke="#8a8a96" stroke-width="2"/>' +
    '<rect x="9" y="37" width="30" height="13" rx="2" fill="#3a3a4a" stroke="' + TR + '" stroke-width="2"/>' +
    '<circle cx="18" cy="43.5" r="4.2" fill="#d9d9d9" stroke="' + TR + '" stroke-width="2"/>' +
    '<circle cx="30" cy="43.5" r="4.2" fill="#d9d9d9" stroke="' + TR + '" stroke-width="2"/>'
  ),

  coeur: dessinCarte(
    '<path d="M24 60S6 46 6 31c0-8 6-14 13-14 3.5 0 5 2 5 2s1.5-2 5-2c7 0 13 6 13 14 0 15-18 29-18 29z" ' +
      'fill="#ff3d9a" stroke="' + TR + '" stroke-width="3"/>' +
    '<path d="M15 28q1-6 7-7" fill="none" stroke="#ffffff" stroke-width="3.4" opacity=".6"/>'
  ),

  champignon: dessinCarte(
    '<path d="M5 34c0-13 9-22 19-22s19 9 19 22z" fill="#e0002b" stroke="' + TR + '" stroke-width="3"/>' +
    '<circle cx="15" cy="26" r="4.2" fill="#fff8f0"/>' +
    '<circle cx="30" cy="22" r="5" fill="#fff8f0"/>' +
    '<circle cx="36" cy="30" r="3" fill="#fff8f0"/>' +
    '<path d="M13 34h22v17c0 4-5 7-11 7s-11-3-11-7z" fill="#f6efdc" stroke="' + TR + '" stroke-width="3"/>' +
    '<circle cx="19" cy="43" r="2.2" fill="' + TR + '"/><circle cx="29" cy="43" r="2.2" fill="' + TR + '"/>' +
    '<path d="M21 49q3 3 6 0" fill="none" stroke="' + TR + '" stroke-width="2.2"/>'
  ),

  trophee: dessinCarte(
    '<path d="M13 10h22v15c0 8-5 13-11 13s-11-5-11-13z" fill="#ffd84d" stroke="' + TR + '" stroke-width="3"/>' +
    '<path d="M13 15H9c-3 0-4 4-1 7 2 2 4 3 6 3M35 15h4c3 0 4 4 1 7-2 2-4 3-6 3" fill="none" stroke="' + TR + '" stroke-width="3"/>' +
    '<path d="M21 38h6v9h-6z" fill="#ffd84d" stroke="' + TR + '" stroke-width="2.5"/>' +
    '<path d="M12 54h24l2 9H10z" fill="#8a5a2b" stroke="' + TR + '" stroke-width="3"/>' +
    '<path d="M24 15l2.2 5.4 5.8.5-4.4 3.8 1.3 5.7L24 27.4l-4.9 3 1.3-5.7L16 20.9l5.8-.5z" fill="#fff8d0"/>'
  ),

  gobelet: dessinCarte(
    '<path d="M13 21h22l-3 37c0 3-4 5-8 5s-8-2-8-5z" fill="#ffffff" stroke="' + TR + '" stroke-width="3"/>' +
    '<rect x="10" y="13" width="28" height="9" rx="2.5" fill="#e8e2ef" stroke="' + TR + '" stroke-width="3"/>' +
    '<path d="M29 13l4-9" stroke="#ff3d9a" stroke-width="4"/>' +
    '<rect x="13" y="33" width="21" height="13" rx="2" fill="#2f9e44" stroke="' + TR + '" stroke-width="2.5"/>' +
    '<circle cx="23.5" cy="39.5" r="4.2" fill="#ffffff" stroke="' + TR + '" stroke-width="2"/>'
  ),
};

/* =========================================================
   Le casting complet
   ---------------------------------------------------------
   `fond` teinte la face de la carte : deux cartes voisines ne se confondent
   pas d'un coup d'œil, même retournées vite.
   `famille` dit d'où sort la tête, et sert au récapitulatif de fin.
   Ce qu'un motif ne porte PAS : son partenaire. Le lien vit dans `DUOS`,
   plus bas — un motif ne sait pas avec qui il va, sinon changer un duo
   demanderait de retoucher deux entrées au lieu d'une ligne.
   ========================================================= */
const MOTIFS = [
  /* --- Les têtes d'affiche du portail --------------------------------- */
  {
    id: "drew",
    dossier: "personnages",
    nom: "Drew",
    famille: "Le casting",
    fond: "#f3e2f7",
    svg: persoSVG({
      id: "drew",
      peau: "#f8dcc0", cheveux: "long", couleurCheveux: "#8a5a2b",
      haut: "#aa6caa", bas: "#3a2b4e", bouche: "sourire", regard: "face",
    }),
  },
  {
    id: "glinda",
    dossier: "personnages",
    nom: "Glinda",
    famille: "Le casting",
    fond: "#ffe0ef",
    svg: persoSVG({
      id: "glinda",
      peau: "#f8dcc0", cheveux: "queue", couleurCheveux: "#e8b84b",
      haut: "#16255c", bas: "#16255c", jupe: "#ffffff", pompons: "#ffffff",
      accessoire: "noeud", couleurAccessoire: "#16255c", bouche: "sourire-large",
    }),
  },
  {
    id: "elias",
    dossier: "personnages",
    nom: "Elias",
    famille: "Le casting",
    fond: "#e2e6f8",
    svg: persoSVG({
      id: "elias",
      peau: "#f0c39a", cheveux: "court", couleurCheveux: "#2b1a2e",
      haut: "#6672d0", bas: "#2f3550", accessoire: "lunettes",
      bouche: "neutre", regard: "face",
    }),
  },
  {
    id: "eoghan",
    dossier: "personnages",
    nom: "Eoghan",
    famille: "Le casting",
    fond: "#ddf6e2",
    svg: persoSVG({
      id: "eoghan",
      peau: "#f0c39a", cheveux: "boucle", couleurCheveux: "#c98a3a",
      haut: "#00b32d", bas: "#2f3550", bouche: "sourire-large", regard: "face",
    }),
  },
  {
    id: "boq",
    dossier: "personnages",
    nom: "Boq",
    famille: "Le casting",
    fond: "#fff3d6",
    svg: persoSVG({
      id: "boq",
      peau: "#f8dcc0", cheveux: "frange", couleurCheveux: "#4a2c17",
      haut: "#ffd84d", bas: "#6b4a8a", bouche: "o", regard: "droite",
      pose: "bras-leves",
    }),
  },
  {
    id: "mads",
    dossier: "personnages",
    nom: "Mads Prout",
    famille: "Le casting",
    fond: "#ffe1de",
    svg: persoSVG({
      id: "mads",
      peau: "#d99a6c", cheveux: "crete", couleurCheveux: "#b03a3a",
      haut: "#e03131", bas: "#1b1b22", accessoire: "lunettes",
      bouche: "sourire-large", regard: "face",
    }),
  },
  {
    id: "mamie",
    dossier: "personnages",
    nom: "Mamie",
    famille: "Le casting",
    fond: "#f6e4ef",
    svg: persoSVG({
      id: "mamie",
      peau: "#f0c39a", cheveux: "boucle", couleurCheveux: "#d8d2c4",
      haut: "#b3477a", bas: "#6b4a8a", accessoire: "lunettes", bouche: "sourire",
    }),
  },
  {
    id: "nils",
    dossier: "personnages",
    nom: "Nils",
    famille: "Ceux qui te courent après",
    fond: "#e6e6ee",
    svg: persoSVG({
      id: "nils",
      peau: "#f3ddcb", cheveux: "frange", couleurCheveux: "#e8b84b",
      haut: "#22222a", bas: "#15151b", bouche: "neutre", regard: "gauche",
    }),
  },
  {
    id: "elphie",
    dossier: "personnages",
    nom: "Elphie",
    famille: "Ceux qui te courent après",
    fond: "#dceee6",
    svg: persoSVG({
      id: "elphie",
      peau: "#7a4a2b", cheveux: "long", couleurCheveux: "#1e1218",
      haut: "#2e7d5b", bas: "#1f2b3a", accessoire: "serretete",
      couleurAccessoire: "#e8b84b", bouche: "neutre", regard: "face",
    }),
  },

  /* --- Le bestiaire : tout ce qui sert d'ennemi ailleurs sur le site --- */
  {
    id: "gris",
    dossier: "creatures",
    nom: "Petit gris",
    famille: "Ce qui rôde",
    fond: "#e6f5d6",
    svg: BESTIAIRE.gris,
  },
  {
    id: "ovni",
    dossier: "creatures",
    nom: "Un ovni",
    famille: "Ce qui rôde",
    fond: "#e2effb",
    svg: BESTIAIRE.ovni,
  },
  {
    id: "silhouette",
    dossier: "creatures",
    nom: "La chose des bois",
    famille: "Ce qui rôde",
    fond: "#dfeade",
    svg: BESTIAIRE.silhouette,
  },
  {
    id: "oeil",
    dossier: "creatures",
    nom: "L'œil du ciel",
    famille: "Ce qui rôde",
    fond: "#e0f0f8",
    svg: BESTIAIRE.oeil,
  },
  {
    id: "chevre",
    dossier: "creatures",
    nom: "La chèvre suspecte",
    famille: "Ce qui rôde",
    fond: "#f2efe4",
    svg: BESTIAIRE.chevre,
  },
  {
    id: "ombre",
    dossier: "creatures",
    nom: "L'ombre du couloir",
    famille: "Ce qui rôde",
    fond: "#e4e0ec",
    svg: BESTIAIRE.ombre,
  },
  {
    id: "pennywise",
    dossier: "creatures",
    nom: "Pennywise",
    famille: "Ce qui rôde",
    fond: "#ffe6dc",
    svg: BESTIAIRE.clown,
  },
  {
    id: "slenderman",
    dossier: "creatures",
    nom: "Slenderman",
    famille: "Ce qui rôde",
    fond: "#e8e8ec",
    svg: BESTIAIRE.grandType,
  },
  {
    id: "cafard",
    dossier: "creatures",
    nom: "Cafard du campus",
    famille: "Ceux qui te courent après",
    fond: "#efe4d6",
    svg: BESTIAIRE.cafard,
  },
  {
    id: "oiseau",
    dossier: "creatures",
    nom: "Oiseau mal intentionné",
    famille: "Ceux qui te courent après",
    fond: "#e4ecf2",
    svg: BESTIAIRE.oiseau,
  },
  {
    id: "lutin",
    dossier: "creatures",
    nom: "Lutin de la fac",
    famille: "Ceux qui te courent après",
    fond: "#e4f2dd",
    svg: BESTIAIRE.lutin,
  },
  {
    id: "ange",
    dossier: "creatures",
    nom: "L'ange exact",
    famille: "Ce qui rôde",
    fond: "#fdf3d8",
    svg: BESTIAIRE.ange,
  },
  {
    id: "toto",
    dossier: "creatures",
    nom: "Toto",
    famille: "Ce qui rôde",
    fond: "#e2f5e6",
    svg: BESTIAIRE.perroquet,
  },

  /* --- Les objets qui traînent d'un jeu à l'autre ---------------------- */
  {
    id: "camion",
    dossier: "objets",
    nom: "Le camion vert",
    famille: "Pièces à conviction",
    fond: "#dff0e2",
    svg: OBJETS.camion,
  },
  {
    id: "pompon",
    dossier: "objets",
    nom: "Un pompon",
    famille: "Pièces à conviction",
    fond: "#e6f0ff",
    svg: OBJETS.pompon,
  },
  {
    id: "carnet",
    dossier: "objets",
    nom: "Le carnet à complots",
    famille: "Pièces à conviction",
    fond: "#f7f0dd",
    svg: OBJETS.carnet,
  },
  {
    id: "telephone",
    dossier: "objets",
    nom: "Un téléphone",
    famille: "Pièces à conviction",
    fond: "#e3f2ff",
    svg: OBJETS.telephone,
  },
  {
    id: "tomate",
    dossier: "objets",
    nom: "Une tomate",
    famille: "Pièces à conviction",
    fond: "#ffe3e0",
    svg: OBJETS.tomate,
  },
  {
    id: "pizza",
    dossier: "objets",
    nom: "Une part de pizza",
    famille: "Pièces à conviction",
    fond: "#fdeed2",
    svg: OBJETS.pizza,
  },
  {
    id: "ballon",
    dossier: "objets",
    nom: "Un ballon rouge",
    famille: "Pièces à conviction",
    fond: "#ffe0e4",
    svg: OBJETS.ballon,
  },
  {
    id: "vhs",
    dossier: "objets",
    nom: "Une cassette",
    famille: "Pièces à conviction",
    fond: "#e4e2ec",
    svg: OBJETS.vhs,
  },
  {
    id: "coeur",
    dossier: "objets",
    nom: "Un cœur",
    famille: "Pièces à conviction",
    fond: "#ffe2f0",
    svg: OBJETS.coeur,
  },
  {
    id: "champignon",
    dossier: "objets",
    nom: "Un champignon",
    famille: "Pièces à conviction",
    fond: "#ffe6e0",
    svg: OBJETS.champignon,
  },
  {
    id: "trophee",
    dossier: "objets",
    nom: "Le trophée",
    famille: "Pièces à conviction",
    fond: "#fff2cf",
    svg: OBJETS.trophee,
  },
  {
    id: "gobelet",
    dossier: "objets",
    nom: "Un gobelet",
    famille: "Pièces à conviction",
    fond: "#e6f6ea",
    svg: OBJETS.gobelet,
  },
];


/* =========================================================
   LES DUOS — la règle du jeu tient ici
   ---------------------------------------------------------
   Ce memory ne se joue PAS en doublons. Chaque carte est unique, et sa
   paire est une AUTRE carte : celle qui va avec. Drew et son camion, Glinda
   et son pompon, le clown et son ballon rouge.

   Pourquoi : un memory ordinaire ne demande que de retenir des positions,
   et n'importe quel dessin y ferait l'affaire — le casting du portail n'y
   servirait que de décor. En appariant par le lien, la mémoire des places
   ne suffit plus : il faut aussi savoir QUI va avec QUOI. Ça se sait mal la
   première partie, et beaucoup mieux la cinquième — c'est la raison de
   rejouer, et c'est ce que le jeu apprend en passant.

   Chaque duo porte la phrase qui explique le lien : elle s'affiche au
   moment où la paire tombe, donc on n'apprend jamais une règle, on la voit.

   Ajouter un duo = ajouter deux motifs et une ligne ici. Le moteur ne
   connaît ni les noms ni les liens.
   ========================================================= */
const DUOS = [
  { a: "drew", b: "camion",
    replique: "Drew et son camion vert. On entend arriver l'un avant de voir l'autre." },
  { a: "glinda", b: "pompon",
    replique: "Glinda et son pompon." },
  { a: "elias", b: "carnet",
    replique: "Elias et son carnet à complots. Tout y est noté, à l'heure près." },
  { a: "eoghan", b: "telephone",
    replique: "Eoghan et un téléphone braqué sur lui." },
  { a: "boq", b: "coeur",
    replique: "Boq et son cœur." },
  { a: "mads", b: "tomate",
    replique: "Mads Prout et la tomate. Le public a ses habitudes." },
  { a: "mamie", b: "toto",
    replique: "Mamie et Toto. Ils regardent la télé ensemble." },
  { a: "pennywise", b: "ballon",
    replique: "Le clown et son ballon rouge. Ne le prends pas." },
  { a: "slenderman", b: "silhouette",
    replique: "Le grand type et la silhouette des bois." },
  { a: "gris", b: "ovni",
    replique: "Le petit gris et sa soucoupe. Il est garé en double file." },
  { a: "oeil", b: "ange",
    replique: "L'œil du ciel et l'ange exact." },
  { a: "nils", b: "elphie",
    replique: "Nils et Elphie. Ils courent après la même personne." },
  { a: "cafard", b: "pizza",
    replique: "Le cafard du campus et la part de pizza. Il était là avant toi." },
  { a: "lutin", b: "champignon",
    replique: "Le lutin de la fac et son champignon." },
  { a: "oiseau", b: "gobelet",
    replique: "L'oiseau mal intentionné et le gobelet renversé." },
  { a: "chevre", b: "ombre",
    replique: "La chèvre suspecte et l'ombre du couloir. Elias est seul à les avoir vues." },
  { a: "vhs", b: "trophee",
    replique: "La cassette et le trophée. Augusta a gagné une fois, et c'est filmé." },
];

/* =========================================================
   Les grilles
   ---------------------------------------------------------
   Chaque duo occupe deux cases : `colonnes × rangees` doit donc valoir
   exactement `duos × 2`. Le banc d'essai le vérifie, ainsi que le fait
   qu'il reste assez de duos dans le casting pour remplir la plus grande.
   ========================================================= */
const NIVEAUX = [
  {
    id: "facile",
    nom: "Échauffement",
    detail: "12 cartes, 6 duos",
    colonnes: 4,
    rangees: 3,
    duos: 6,
    /* Temps de référence : en dessous, on touche le bonus de rapidité. */
    cible_s: 60,
  },
  {
    id: "moyen",
    nom: "Interrogation surprise",
    detail: "20 cartes, 10 duos",
    colonnes: 5,
    rangees: 4,
    duos: 10,
    cible_s: 120,
  },
  {
    id: "difficile",
    nom: "Conseil de discipline",
    detail: "30 cartes, 15 duos",
    colonnes: 6,
    rangees: 5,
    duos: 15,
    cible_s: 210,
  },
];

/* =========================================================
   Le barème
   ---------------------------------------------------------
   Volontairement lisible : un duo rapporte, une série rapporte plus, et
   finir vite rapporte une dernière fois. Rien ne retire de points — se
   tromper coûte déjà un coup et du temps, et un jeu de mémoire n'a pas
   besoin de punir en plus.
   ========================================================= */
const REGLAGES = {
  pointsDuo: 100,
  /* La série est le nombre de duos trouvés d'affilée sans se tromper. */
  bonusSerie: 40,
  serieMax: 6,
  /* Points par seconde gagnée sur le temps de référence de la grille. */
  bonusSeconde: 4,
  /* Combien de temps deux cartes qui ne vont pas ensemble restent visibles.
     Sous 700 ms on n'a pas le temps de lire la deuxième carte. */
  delaiRetour_ms: 950,
};

/* --- Ce que le carnet raconte pendant la partie ------------------------- */

const PHRASES_DEPART = [
  "Retourne deux cartes. On ne cherche pas deux fois la même.",
  "Chaque carte va avec une autre. À toi de trouver laquelle.",
  "Ici, les paires ne se ressemblent pas. Elles se connaissent.",
];

const PHRASES_RATE = [
  "Ces deux-là n'ont rien à voir.",
  "Pas ensemble. Retiens quand même les places.",
  "Non.",
  "Raté.",
  "Ils ne se connaissent même pas.",
];

/* --- Le mot de la fin ---------------------------------------------------
   Choisi d'après le nombre de coups rapporté au nombre de duos : un joueur
   qui connaîtrait déjà le tapis ET les duos finirait en `duos` coups. */
const MENTIONS = [
  { max: 1.6, titre: "Mémoire d'éléphant", mot: "Tu connais le monde par cœur." },
  { max: 2.2, titre: "Très bonne pioche", mot: "Tu savais qui allait avec qui." },
  { max: 3.0, titre: "Ça revient", mot: "Quelques allers-retours, mais tu as tenu le tapis." },
  { max: 4.2, titre: "Au flair", mot: "Beaucoup de cartes retournées pour arriver là." },
  { max: Infinity, titre: "Tu as tout retourné", mot: "Au moins, la table est propre." },
];
