// Cadre de référence commun au corps, aux vêtements et aux décors.
// Tout est dessiné dedans, à l'écran comme dans l'export PNG.
const CANVAS_W = 400;
const CANVAS_H = 600;

// Ordre d'empilement des calques, du fond vers le premier plan.
// C'est le seul ordre qui compte pour le rendu ; l'ordre des onglets de la
// garde-robe est défini séparément par RAIL_ORDER dans main.js.
//
// `sticker_overlay` est réservé pour les paillettes cliquables prévues au
// SPEC : la clé existe mais aucune pièce n'est encore rendue.
const LAYER_ORDER = [
  "body",
  "calecon",
  "bas",
  "chaussures",
  "haut",
  "veste_manteau",
  "ceinture_accessoire_taille",
  "bijoux",
  "coiffure",
  "chapeau_couvre_chef",
  "visage_extra",
  "sticker_overlay",
];

// Repères du corps dans le cadre 400×600, pour dessiner une nouvelle pièce :
//   tête    cx 200, cy 98, rx 40, ry 48      épaules  y 168 (x 150 → 250)
//   taille  y 296 (x 162 → 238)              hanches  y 296 → 352
//   genoux  y 450                            chevilles y 552
// (rappelés aussi en tête de silhouettes.js, où se trouvent les tracés)
