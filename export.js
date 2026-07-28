/* Export PNG : on redessine la même pile de calques que celle affichée,
   dans le cadre de référence 400×600. Décor, corps et vêtements passent
   tous par une image (silhouette SVG aujourd'hui, tes PNG demain), donc
   ce fichier n'aura pas à changer quand tu apporteras les vrais assets. */

let exportEnCours = false;

async function exportDollAsPng() {
  if (exportEnCours) return; // un double-clic ne doit pas produire deux fichiers
  exportEnCours = true;
  const bouton = document.getElementById("btn-export");
  if (bouton) bouton.disabled = true;

  try {
    await genererPng();
    showFlavorText("Photo enregistrée. L'aigle en garde une copie.");
  } finally {
    exportEnCours = false;
    if (bouton) bouton.disabled = false;
  }
}

async function genererPng() {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#fdf3ff";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // 1. décor, cadré comme à l'écran
  await dessineDecor(ctx);

  // 2. corps de base
  await dessineCalque(ctx, urlCorps());

  // 3. vêtements, dans l'ordre d'empilement
  for (const cat of LAYER_ORDER) {
    if (cat === "body" || cat === "sticker_overlay") continue;
    const id = selection[cat];
    if (!id) continue;
    const item = findItem(cat, id);
    if (!item) continue;
    await dessineCalque(ctx, urlItem(cat, item), item.decalageX || 0, item.decalageY || 0);
  }

  const link = document.createElement("a");
  link.download = nomDuFichier();
  link.href = canvas.toDataURL("image/png");
  link.click();
}

/* Un nom par tenue plutôt que « dress-my-drew (3).png » à répétition. */
function nomDuFichier() {
  const d = new Date();
  const horodatage =
    d.getFullYear() +
    "-" + String(d.getMonth() + 1).padStart(2, "0") +
    "-" + String(d.getDate()).padStart(2, "0") +
    "-" + String(d.getHours()).padStart(2, "0") +
    String(d.getMinutes()).padStart(2, "0");
  return `drew-${sansAccent(trouveDecor(decorActuel).nom)}-${horodatage}.png`;
}

function sansAccent(texte) {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const DELAI_IMAGE = 8000; // ms

function chargeImage(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);

    // Une image qui ne se résout jamais bloquerait l'export — et donc le
    // bouton Photo, désactivé le temps de la génération. On tranche.
    let fini = false;
    const terminer = (valeur) => {
      if (fini) return;
      fini = true;
      clearTimeout(minuteur);
      resolve(valeur);
    };
    const minuteur = setTimeout(() => {
      console.warn("Calque ignoré, image trop lente :", url);
      terminer(null);
    }, DELAI_IMAGE);

    const img = new Image();
    img.onload = () => terminer(img);
    img.onerror = () => terminer(null); // un calque manquant ne casse pas l'export
    img.src = url;
  });
}

async function dessineCalque(ctx, url, dx = 0, dy = 0) {
  const img = await chargeImage(url);
  if (img) ctx.drawImage(img, dx, dy, CANVAS_W, CANVAS_H);
}

async function dessineDecor(ctx) {
  const img = await chargeImage(trouveDecor(decorActuel).url);
  if (!img) return;
  // Cadrage « cover » centré, identique au rendu à l'écran, pour que
  // tes propres images passent quel que soit leur ratio.
  const echelle = Math.max(CANVAS_W / img.width, CANVAS_H / img.height);
  const w = img.width * echelle;
  const h = img.height * echelle;
  ctx.drawImage(img, (CANVAS_W - w) / 2, (CANVAS_H - h) / 2, w, h);
}
