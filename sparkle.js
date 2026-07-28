/* =========================================================
   Mobilier rétro : la traînée de paillettes du curseur
   et le compteur de visites du pied de page.
   Purement décoratif — aucun impact sur la poupée ni l'export.
   ========================================================= */

const PAILLETTES = ["✦", "✧", "★", "✿", "❀", "•"];
const COULEURS_PAILLETTES = ["#ffd84d", "#ff3d9a", "#4de0ff", "#c6ff4d", "#ffffff", "#9b4dff"];

function initPaillettes() {
  const calque = document.getElementById("sparkles");
  if (!calque) return;

  // Relu à chaque paillette : si le réglage système change en cours de route,
  // l'effet s'arrête sans qu'il faille recharger.
  const sobre = window.matchMedia("(prefers-reduced-motion: reduce)");
  let derniere = 0;

  document.addEventListener("pointermove", (e) => {
    if (sobre.matches) return;
    const maintenant = performance.now();
    if (maintenant - derniere < 45) return; // on limite la casse
    derniere = maintenant;

    const p = document.createElement("span");
    p.className = "paillette";
    p.textContent = PAILLETTES[Math.floor(Math.random() * PAILLETTES.length)];
    p.style.left = e.clientX + (Math.random() * 18 - 9) + "px";
    p.style.top = e.clientY + (Math.random() * 18 - 9) + "px";
    p.style.color = COULEURS_PAILLETTES[Math.floor(Math.random() * COULEURS_PAILLETTES.length)];
    p.style.fontSize = 9 + Math.random() * 12 + "px";
    calque.appendChild(p);
    p.addEventListener("animationend", () => p.remove());
  });
}

function initCompteur() {
  const el = document.getElementById("counter");
  if (!el) return;

  // Le stockage peut être bloqué (navigation privée stricte, cookies refusés).
  // Le compteur doit rester affiché malgré tout, quitte à ne pas progresser.
  const BASE = 13372;
  let n = BASE;
  try {
    n = (Number(localStorage.getItem("drew_visites")) || BASE) + 1;
    localStorage.setItem("drew_visites", String(n));
  } catch (e) {
    n = BASE + 1;
  }

  el.innerHTML = "";
  String(n)
    .padStart(6, "0")
    .split("")
    .forEach((chiffre) => {
      const c = document.createElement("span");
      c.textContent = chiffre;
      el.appendChild(c);
    });
}

document.addEventListener("DOMContentLoaded", () => {
  initPaillettes();
  initCompteur();
});
