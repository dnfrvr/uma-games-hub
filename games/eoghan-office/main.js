/* =========================================================
   Kiss & Cache — moteur de jeu (vue de côté)
   ---------------------------------------------------------
   La salle fait LARGEUR_SALLE unités de large et compte deux plans de
   profondeur : 0 = devant (près de la caméra), 1 = derrière. Eoghan marche
   de gauche à droite et change de plan avec ↑/↓.

   Chaque PNJ tient son téléphone et cadre dans une direction, dans SON plan
   uniquement, sur une certaine portée. Le champ de la caméra est toujours
   dessiné à l'écran : c'est un jeu de timing, jamais une devinette. Si
   Eoghan y reste, le snap part — et avec lui un cran de ragots.
   ========================================================= */

const VITESSE = 210;        // unités par seconde
const VITESSE_ACCROUPI = 95;
const PORTEE_BISOU = 78;    // distance à laquelle on peut embrasser
const EXPOSITION_MAX = 900; // temps toléré dans un faisceau, hors bisou
const ALERTE_MS = 3000;
const RAYON_CACHETTE = 90;  // distance à un meuble pour s'y planquer accroupi

/* Le projecteur du bal : un rond de lumière qui balaie la piste. Valeurs de
   repli si le décor n'en donne pas. */
const PROJECTEUR = { largeur: 170, vitesse: 200 };

const RECORDS_CLE = "uma_eoghan_records";

const RANGS = [
  { min: 900, texte: "Fantôme romantique 👻💗" },
  { min: 500, texte: "Discret… ish" },
  { min: 1, texte: "Tout le monde a vu" },
  { min: 0, texte: "Personne n'a rien vu. Il ne s'est rien passé non plus." },
];

const $ = (id) => document.getElementById(id);

const elements = {
  salle: $("salle"),
  fond: $("fond"),
  props: $("props"),
  acteurs: $("acteurs"),
  faisceaux: $("faisceaux"),
  alerte: $("alerte"),
  projecteur: $("projecteur"),
  chrono: $("chrono"),
  score: $("score"),
  combo: $("combo"),
  restants: $("restants"),
  ragots: $("ragots"),
  ambiance: $("ambiance"),
  commentaire: $("commentaire"),
  ecran: $("ecran"),
  ecranTitre: $("ecran-titre"),
  ecranTexte: $("ecran-texte"),
  ecranDecors: $("ecran-decors"),
};

/* =========================================================
   État
   ========================================================= */

const etat = {
  decor: null,
  eoghan: { x: 80, plan: 0, dir: 1, accroupi: false, el: null, marche: false },
  garcons: [],
  pnj: [],
  props: [],
  enCours: false,
  boucle: null,
  dernierTemps: 0,
  finChrono: 0,
  score: 0,
  combo: 0,
  ragots: 0,
  exposition: 0,
  bisou: null,
  vu: false,
  photographe: null,
  cache: false,
  alerteJusqua: 0,
  flashJusqua: 0,
  prochainGimmick: 0,
  douche: null,
  projecteur: null,
  touches: new Set(),
};

/* =========================================================
   Construction de la scène
   ========================================================= */

function pourcent(x) {
  return (x / LARGEUR_SALLE) * 100;
}

/* Le plan arrière est plus haut à l'écran et légèrement plus petit :
   c'est ce qui donne la profondeur de la salle. */
function ancrage(plan) {
  return plan === 1 ? { bas: 46, echelle: 0.82 } : { bas: 8, echelle: 1 };
}

function poseActeur(el, x, plan, dir, echelleSup) {
  const a = ancrage(plan);
  el.style.left = pourcent(x) + "%";
  el.style.bottom = a.bas + "%";
  el.style.transform =
    "translateX(-50%) scale(" + (a.echelle * (echelleSup || 1)) * (dir < 0 ? -1 : 1) + "," +
    a.echelle * (echelleSup || 1) + ")";
  el.style.zIndex = plan === 1 ? 2 : 5;
}

function chargeDecor(decor) {
  etat.decor = decor;
  etat.garcons = [];
  etat.pnj = [];
  etat.props = [];

  elements.salle.dataset.decor = decor.id;
  elements.salle.style.setProperty("--fond", decor.palette.fond);
  elements.salle.style.setProperty("--sol-arriere", decor.palette.solArriere);
  elements.salle.style.setProperty("--sol-avant", decor.palette.solAvant);
  elements.salle.style.setProperty("--bandeau", decor.palette.bandeau);

  elements.props.innerHTML = "";
  elements.acteurs.innerHTML = "";
  elements.faisceaux.innerHTML = "";

  // --- Mobilier
  decor.props.forEach((modele) => {
    const modeleProp = PROPS[modele.type];
    const el = document.createElement("div");
    el.className = "prop prop-" + modele.type;
    el.innerHTML = modeleProp.svg;
    el.style.width = pourcent(modeleProp.largeur) + "%";
    const a = ancrage(modele.plan);
    el.style.left = pourcent(modele.x) + "%";
    el.style.bottom = a.bas + "%";
    el.style.transform = "translateX(-50%) scale(" + a.echelle + ")";
    el.style.zIndex = modele.plan === 1 ? 1 : 6;
    elements.props.appendChild(el);

    etat.props.push({ ...modele, ...modeleProp, el });
  });

  // --- Garçons
  decor.garcons.forEach((modele) => {
    const el = persoElement({ ...modele.look, bouche: "sourire" }, "acteur acteur-garcon");
    const coeur = document.createElement("span");
    coeur.className = "coeur-cible";
    coeur.textContent = "💗";
    el.appendChild(coeur);
    elements.acteurs.appendChild(el);
    const g = { ...modele, embrasse: false, el, dir: -1 };
    poseActeur(el, g.x, g.plan, 1);
    etat.garcons.push(g);
  });

  // --- PNJ
  decor.pnj.forEach((modele) => {
    const el = persoElement({ ...modele.look, bouche: "neutre", telephone: true }, "acteur acteur-pnj");
    el.title = modele.nom;
    elements.acteurs.appendChild(el);

    const faisceau = document.createElement("div");
    faisceau.className = "faisceau";
    elements.faisceaux.appendChild(faisceau);

    const p = {
      ...modele,
      dir: modele.dir || 1,
      el,
      faisceau,
      compte: 0,
      zoomCompte: 0,
      distraitCompte: 0,
      facteurZoom: 1,
      aveugle: false,
    };
    poseActeur(el, p.x, p.plan, p.dir, modele.petit ? 0.72 : 1);
    etat.pnj.push(p);
  });

  // --- Eoghan
  etat.eoghan.x = decor.eoghan.x;
  etat.eoghan.plan = decor.eoghan.plan;
  etat.eoghan.dir = 1;
  etat.eoghan.accroupi = false;
  etat.eoghan.el = persoElement(
    { peau: "#f0c39a", cheveux: "boucle", couleurCheveux: "#c98a3a", haut: "#00b32d", bas: "#2f3550", bouche: "sourire" },
    "acteur acteur-eoghan"
  );
  elements.acteurs.appendChild(etat.eoghan.el);
  poseActeur(etat.eoghan.el, etat.eoghan.x, etat.eoghan.plan, 1);

  elements.ambiance.textContent = decor.emoji + " " + decor.ambiance;
}

/* Redessine le visage d'un personnage (regard, bouche) sans tout reconstruire. */
function visage(acteur, look, options) {
  acteur.el.innerHTML = persoSVG({ ...look, ...options });
  if (acteur.coeurEl) acteur.el.appendChild(acteur.coeurEl);
}

/* =========================================================
   Partie
   ========================================================= */

function demarre(decor) {
  chargeDecor(decor);

  etat.score = 0;
  etat.combo = 0;
  etat.ragots = 0;
  etat.exposition = 0;
  etat.bisou = null;
  etat.alerteJusqua = 0;
  etat.flashJusqua = 0;
  etat.douche = null;
  /* Le projecteur, lui, ne s'allume pas par intermittence : il tourne du
     début à la fin de la partie, comme dans une vraie salle de bal. */
  etat.projecteur =
    decor.gimmick === "projecteur"
      ? {
          x: LARGEUR_SALLE / 2,
          dir: 1,
          largeur: (decor.projecteur && decor.projecteur.largeur) || PROJECTEUR.largeur,
          vitesse: (decor.projecteur && decor.projecteur.vitesse) || PROJECTEUR.vitesse,
        }
      : null;
  document.body.classList.toggle("projecteur-actif", !!etat.projecteur);
  etat.enCours = true;
  etat.dernierTemps = performance.now();
  etat.finChrono = etat.dernierTemps + decor.chrono_s * 1000;
  etat.prochainGimmick = etat.dernierTemps + (decor.gimmick === "flash" ? 10000 : 20000);

  elements.ecran.classList.remove("visible");
  commente("Vas-y. Discrètement.");
  majTableau();

  cancelAnimationFrame(etat.boucle);
  etat.boucle = requestAnimationFrame(boucle);
}

function termine(titre, texte, gagne) {
  if (!etat.enCours) return;
  etat.enCours = false;
  cancelAnimationFrame(etat.boucle);
  annuleBisou();
  document.body.classList.remove("repere", "flash", "projecteur-actif");
  etat.projecteur = null;
  if (elements.alerte) elements.alerte.classList.remove("vu", "planque");

  const restant = Math.max(0, Math.ceil((etat.finChrono - performance.now()) / 1000));
  if (gagne) etat.score += restant * 5;

  const rang = RANGS.find((r) => etat.score >= r.min);
  const decor = etat.decor;
  const fini = etat.garcons.length > 0 && etat.garcons.every((g) => g.embrasse);
  const med = medaille(decor, etat.score, fini);
  const marque = enregistreRecord(decor, etat.score, fini);

  /* Le bilan dit toujours ce qu'il manquait pour le palier au-dessus : c'est
     ce qui donne envie de refaire un décor déjà réussi. */
  let bilan;
  if (!fini) {
    bilan = "Il restait " + etat.garcons.filter((g) => !g.embrasse).length +
      " garçon(s) à embrasser : pas de médaille cette fois.";
  } else if (med.rang === "or") {
    bilan = "🥇 Médaille d'or. Personne ne fera mieux. Enfin, personne d'autre.";
  } else {
    const objectifs = decor.objectifs || { argent: 0, or: 0 };
    const cible = med.rang === "argent" ? objectifs.or : objectifs.argent;
    const suivante = med.rang === "argent" ? "l'or" : "l'argent";
    bilan = med.icone + " Médaille de " + med.nom.toLowerCase() + " — " +
      (cible - etat.score) + " points de plus et c'était " + suivante + ".";
  }

  elements.ecranTitre.textContent = titre;
  elements.ecranTexte.innerHTML =
    texte +
    "<br /><br /><b>" + etat.score + " points</b>" +
    (gagne ? " (dont " + restant * 5 + " de bonus rapidité)" : "") +
    "<br />" + rang.texte +
    "<br />" + bilan +
    (marque.nouveau
      ? "<br /><b>✨ Nouveau record sur ce terrain !</b>"
      : marque.record ? "<br />Ton record ici : " + marque.record + " points." : "");
  elements.ecran.classList.add("visible");
  construitMenu(); // les records affichés dans le menu viennent de changer
  majTableau();
}

/* =========================================================
   Records et médailles — la raison de refaire un décor
   ---------------------------------------------------------
   Tout est rangé dans le navigateur du joueur, sous une seule clé. Si le
   stockage est refusé (navigation privée), le jeu continue sans rien dire :
   un tableau des records n'est pas une raison de ne pas pouvoir jouer.
   ========================================================= */

function medaille(decor, score, fini) {
  if (!fini) return null;
  const objectifs = (decor && decor.objectifs) || {};
  if (score >= objectifs.or) return { rang: "or", icone: "🥇", nom: "Or" };
  if (score >= objectifs.argent) return { rang: "argent", icone: "🥈", nom: "Argent" };
  return { rang: "bronze", icone: "🥉", nom: "Bronze" };
}

function litRecords() {
  try {
    return JSON.parse(localStorage.getItem(RECORDS_CLE)) || {};
  } catch (e) {
    return {};
  }
}

function enregistreRecord(decor, score, fini) {
  if (!decor) return { nouveau: false, record: 0 };
  const records = litRecords();
  const ancien = records[decor.id];
  /* Une partie abandonnée d'entrée ne vaut pas un record : le terrain reste
     marqué « jamais joué » plutôt que d'afficher un zéro. */
  if (!ancien && score <= 0) return { nouveau: false, record: 0 };
  const nouveau = !!ancien && score > ancien.score;

  records[decor.id] = {
    score: Math.max(score, (ancien && ancien.score) || 0),
    fini: fini || !!(ancien && ancien.fini),
  };
  try {
    localStorage.setItem(RECORDS_CLE, JSON.stringify(records));
  } catch (e) {
    /* Stockage refusé : on joue quand même, simplement sans mémoire. */
  }

  return { nouveau, record: records[decor.id].score };
}

/* =========================================================
   Boucle de jeu
   ========================================================= */

function boucle(maintenant) {
  if (!etat.enCours) return;

  const dt = Math.min(0.05, (maintenant - etat.dernierTemps) / 1000);
  etat.dernierTemps = maintenant;

  const restant = Math.max(0, (etat.finChrono - maintenant) / 1000);
  elements.chrono.textContent = restant.toFixed(1) + " s";
  if (restant <= 0) {
    termine("Temps écoulé", "La soirée continue sans toi.", false);
    return;
  }

  gereGimmick(maintenant, dt);
  bougeEoghan(dt);
  etat.pnj.forEach((p) => bougePnj(p, dt, maintenant));
  dessineFaisceaux(maintenant);
  if (etat.bisou) avanceBisou(dt * 1000);
  gereDetection(maintenant, dt);

  etat.boucle = requestAnimationFrame(boucle);
}

/* =========================================================
   Eoghan
   ========================================================= */

function bougeEoghan(dt) {
  const e = etat.eoghan;
  if (etat.bisou) return; // pendant un bisou, on ne bouge pas

  let dx = 0;
  if (etat.touches.has("gauche")) dx -= 1;
  if (etat.touches.has("droite")) dx += 1;

  const marche = dx !== 0;
  if (marche) {
    e.dir = dx;
    e.x = Math.max(30, Math.min(LARGEUR_SALLE - 30, e.x + dx * (e.accroupi ? VITESSE_ACCROUPI : VITESSE) * dt));
  }

  if (marche !== e.marche) {
    e.marche = marche;
    e.el.classList.toggle("marche", marche);
  }

  poseActeur(e.el, e.x, e.plan, e.dir);
}

function changePlan(delta) {
  const e = etat.eoghan;
  if (etat.bisou) return;
  const nouveau = Math.max(0, Math.min(1, e.plan + delta));
  if (nouveau === e.plan) return;
  e.plan = nouveau;
  poseActeur(e.el, e.x, e.plan, e.dir);
}

/* L'abri utilisable ici et maintenant : le meuble de SA rangée dont Eoghan
   est assez près. On le renvoie (et pas un simple oui/non) pour pouvoir
   l'entourer à l'écran : le rayon de cachette était jusqu'ici une règle
   invisible, on s'accroupissait au jugé. */
function abriProche() {
  return etat.props.find(
    (p) => p.cache && p.plan === etat.eoghan.plan && Math.abs(p.x - etat.eoghan.x) < RAYON_CACHETTE
  );
}

/* Accroupi : Eoghan devient invisible s'il est planqué derrière un meuble.
   Un flash de lumière annule toutes les cachettes. */
function estCache(maintenant) {
  if (maintenant < etat.flashJusqua) return false;
  if (!etat.eoghan.accroupi) return false;
  return !!abriProche();
}

/* =========================================================
   PNJ et faisceaux de regard
   ========================================================= */

function bougePnj(p, dt, maintenant) {
  /* Pendant une alerte, tout le monde se braque sur Eoghan : c'est la
     punition d'une première bourde. Même celui qui scrollait relève le nez. */
  if (maintenant < etat.alerteJusqua) {
    p.dir = etat.eoghan.x >= p.x ? 1 : -1;
    p.aveugle = false;
    p.el.classList.remove("distrait");
    poseActeur(p.el, p.x, p.plan, p.dir, p.petit ? 0.72 : 1);
    return;
  }

  if (p.motif === "patrouille") {
    p.x += p.dir * p.vitesse * dt;
    if (p.x <= p.de) { p.x = p.de; p.dir = 1; }
    if (p.x >= p.a) { p.x = p.a; p.dir = -1; }
    p.el.classList.add("marche");
  } else if (p.motif === "tourne") {
    p.compte += dt * 1000;
    if (p.compte >= p.periode) {
      p.compte = 0;
      p.dir *= -1;
    }
  }

  /* --- Deux modulations qui se posent sur N'IMPORTE quel motif : c'est ce
     qui casse le métronome des rondes sans avoir à inventer un déplacement
     de plus. Les deux ne dépendent que du temps, jamais de la position
     d'Eoghan — sinon la difficulté d'un décor ne serait plus mesurable. --- */

  /* Distraction : il surveille, puis se perd dans ses notifications. Pendant
     sa pause il ne cadre plus rien : c'est la fenêtre de tir du joueur, et
     elle se lit gratuitement puisque son faisceau disparaît de l'écran. */
  if (p.distraction) {
    p.distraitCompte += dt * 1000;
    const cycle = p.distraction.regarde + p.distraction.pause;
    if (p.distraitCompte >= cycle) {
      p.distraitCompte -= cycle;
      if (p.distraction.alterne) p.dir *= -1; // il ne repart pas du même côté
    }
    p.aveugle = p.distraitCompte >= p.distraction.regarde;
    p.el.classList.toggle("distrait", p.aveugle);
  }

  /* Zoom : la portée respire au lieu de rester figée. Un téléphone qui zoome
     voit plus loin par à-coups — un danger qui a un tempo, sans que le PNJ
     ait besoin de bouger d'un pouce. */
  if (p.zoom) {
    p.zoomCompte = (p.zoomCompte + dt * 1000) % p.zoom_ms;
    const phase = (p.zoomCompte / p.zoom_ms) * Math.PI * 2;
    p.facteurZoom = 1 + p.zoom * (0.5 - 0.5 * Math.cos(phase));
    p.el.classList.toggle("zoome", p.facteurZoom > 1 + p.zoom * 0.6);
  }

  poseActeur(p.el, p.x, p.plan, p.dir, p.petit ? 0.72 : 1);
}

/* La portée réellement dangereuse à cet instant. Tout ce qui module la vue
   d'un PNJ passe par ici, pour que l'affichage du faisceau et la détection ne
   puissent jamais raconter deux histoires différentes. */
function porteeVue(p) {
  if (p.aveugle) return 0;
  return p.portee * (p.facteurZoom || 1);
}

/* Un meuble bloque la vue s'il est entre le PNJ et le point regardé,
   dans le même plan. */
function vueBloquee(p, cibleX) {
  const min = Math.min(p.x, cibleX);
  const max = Math.max(p.x, cibleX);
  return etat.props.some(
    (prop) => prop.bloqueVue && prop.plan === p.plan && prop.x > min + 10 && prop.x < max - 10
  );
}

function porteeReelle(p) {
  /* Le faisceau s'arrête au premier meuble opaque rencontré. */
  let portee = porteeVue(p);
  etat.props.forEach((prop) => {
    if (!prop.bloqueVue || prop.plan !== p.plan) return;
    const d = (prop.x - p.x) * p.dir;
    if (d > 0) portee = Math.min(portee, d);
  });
  return Math.max(20, portee);
}

function dessineFaisceaux(maintenant) {
  const flash = maintenant < etat.flashJusqua;

  etat.pnj.forEach((p) => {
    const eteint = p.aveugle && !flash;
    const portee = flash ? LARGEUR_SALLE : porteeReelle(p);
    const debut = p.dir > 0 ? p.x : p.x - portee;
    const a = ancrage(p.plan);

    p.faisceau.style.left = pourcent(debut) + "%";
    p.faisceau.style.width = pourcent(portee) + "%";
    p.faisceau.style.bottom = a.bas + "%";
    p.faisceau.classList.toggle("vers-gauche", p.dir < 0);
    p.faisceau.style.zIndex = p.plan === 1 ? 1 : 4;
    /* Le champ de la rangée du fond est dessiné plus bas et plus pâle : sans
       ça, deux faisceaux superposés donnent l'impression d'être en danger
       dans une rangée où personne ne regarde. */
    p.faisceau.style.setProperty("--echelle", a.echelle);
    p.faisceau.classList.toggle("arriere", p.plan === 1);
    p.faisceau.classList.toggle("eteint", eteint);
    /* Rouge UNIQUEMENT pour celui qui cadre Eoghan. Avant, tous les faisceaux
       viraient au rouge en même temps : impossible de savoir qui t'avait vu,
       donc impossible d'apprendre de sa bourde. */
    p.faisceau.classList.toggle("danger", etat.photographe === p);
    p.el.classList.toggle("reperage", etat.photographe === p);
    p.porteeAffichee = portee;
  });
}

/* =========================================================
   Détection
   ========================================================= */

function gereDetection(maintenant, dt) {
  const flash = maintenant < etat.flashJusqua;
  const e = etat.eoghan;
  const cache = estCache(maintenant);
  etat.cache = cache;

  /* On retient QUI cadre Eoghan : c'est ce PNJ qui déclenchera le snap, et
     c'est son faisceau à lui qui vire au rouge. */
  const photographe = cache
    ? null
    : etat.pnj.find((p) => {
        if (p.plan !== e.plan) return false; // chacun cadre son plan
        const d = (e.x - p.x) * p.dir;
        if (d < 0) return false;             // il vise ailleurs
        if (d > (flash ? LARGEUR_SALLE : porteeVue(p))) return false;
        return flash || !vueBloquee(p, e.x);
      });

  /* Le projecteur ne trie pas les rangées et se moque des meubles hauts —
     mais il passe au-dessus de qui est accroupi derrière un abri. */
  const sousProjecteur =
    !cache && !!etat.projecteur && Math.abs(etat.projecteur.x - e.x) <= etat.projecteur.largeur / 2;

  const vu = !!photographe || sousProjecteur;
  etat.photographe = photographe;
  etat.sousProjecteur = sousProjecteur;
  etat.vu = vu;
  document.body.classList.toggle("repere", vu);
  majAlerte(vu, cache);
  majAbris(cache);

  if (!vu) {
    etat.exposition = Math.max(0, etat.exposition - dt * 1000);
    return;
  }

  /* On nomme le coupable : « je ne sais pas ce qui m'est arrivé » n'apprend
     rien au joueur. Le nom ouvre la phrase, donc majuscule. */
  const nom = sousProjecteur ? "le projecteur" : photographe.nom || "quelqu'un";
  const qui = nom.charAt(0).toUpperCase() + nom.slice(1);

  /* Se faire voir pendant un bisou, c'est immédiat : c'est LE moment de
     vulnérabilité du jeu. */
  if (etat.bisou) {
    annuleBisou();
    bourde("📸 SNAP ! " + qui + " a tout pris. La photo part dans le groupe.");
    return;
  }

  etat.exposition += dt * 1000;
  if (etat.exposition >= EXPOSITION_MAX) {
    etat.exposition = 0;
    bourde("📸 Snap ! " + qui + " : « Regardez qui traîne ici. »");
  }
}

/* Le compte à rebours avant le snap, au-dessus de la tête d'Eoghan. Sans lui,
   la seconde de tolérance était une règle invisible : on ramassait un cran de
   ragots sans avoir jamais su qu'on avait failli s'en sortir. Le même
   marqueur, en vert, confirme qu'une cachette prend bien. */
function majAlerte(vu, cache) {
  const el = elements.alerte;
  if (!el) return;
  const a = ancrage(etat.eoghan.plan);
  el.style.left = pourcent(etat.eoghan.x) + "%";
  el.style.bottom = (a.bas + 29 * a.echelle).toFixed(1) + "%";
  el.style.setProperty("--part", Math.min(1, etat.exposition / EXPOSITION_MAX).toFixed(2));
  el.classList.toggle("vu", vu);
  el.classList.toggle("planque", !vu && cache);
}

/* Le meuble à portée s'entoure de pointillés (« accroupis-toi ici ») et se
   remplit quand la cachette est effective. */
function majAbris(cache) {
  const abri = abriProche();
  etat.props.forEach((p) => {
    p.el.classList.toggle("abri-proche", p === abri && !cache);
    p.el.classList.toggle("abri-actif", p === abri && cache);
  });

  /* Planqué, Eoghan repasse DERRIÈRE le meuble. Dans la rangée du fond les
     acteurs sont dessinés par-dessus le mobilier : sans ça, on se cachait
     debout sur le canapé, ce qui n'a jamais rassuré personne. */
  if (etat.eoghan.el) {
    etat.eoghan.el.style.zIndex = cache && etat.eoghan.plan === 1 ? 0 : etat.eoghan.plan === 1 ? 2 : 5;
  }
}

/* Le snap : le téléphone du PNJ crache son flash, l'écran blanchit une
   fraction de seconde. C'est la sanction, et elle doit se voir. */
function snap() {
  const p = etat.photographe;
  if (p) {
    p.el.classList.remove("snap");
    void p.el.offsetWidth;
    p.el.classList.add("snap");
    setTimeout(() => p.el.classList.remove("snap"), 500);
  }
  document.body.classList.add("snap-flash");
  setTimeout(() => document.body.classList.remove("snap-flash"), 260);
}

function bourde(replique) {
  snap();
  etat.ragots++;
  etat.combo = 0;
  etat.alerteJusqua = performance.now() + ALERTE_MS;
  commente(replique);
  majTableau();

  if (etat.ragots >= etat.decor.ragots_max) {
    termine("Game over", "Toute la fac est au courant. Eoghan trouve ça flatteur.", false);
  }
}

/* =========================================================
   Bisous
   ========================================================= */

function garconProche() {
  return etat.garcons.find(
    (g) => !g.embrasse && g.plan === etat.eoghan.plan && Math.abs(g.x - etat.eoghan.x) <= PORTEE_BISOU
  );
}

function tenteBisou() {
  if (!etat.enCours || etat.bisou) return;
  const garcon = garconProche();
  if (!garcon) return;

  etat.bisou = { garcon, progression: 0, frole: false };
  document.body.classList.add("bisou-en-cours");

  // Les deux se tournent l'un vers l'autre, yeux fermés : la pose de bisou.
  const versLuiEoghan = garcon.x >= etat.eoghan.x ? 1 : -1;
  etat.eoghan.dir = versLuiEoghan;
  garcon.dir = -versLuiEoghan;

  etat.eoghan.el.innerHTML = persoSVG({
    peau: "#f0c39a", cheveux: "boucle", couleurCheveux: "#c98a3a",
    haut: "#00b32d", bas: "#2f3550", regard: "ferme", bouche: "bisou",
  });
  garcon.el.innerHTML = persoSVG({ ...garcon.look, regard: "ferme", bouche: "bisou" });
  garcon.el.appendChild(coeurCible(garcon));

  etat.eoghan.el.classList.add("penche");
  garcon.el.classList.add("penche");
  poseActeur(etat.eoghan.el, etat.eoghan.x, etat.eoghan.plan, etat.eoghan.dir);
  poseActeur(garcon.el, garcon.x, garcon.plan, garcon.dir);
}

function coeurCible(garcon) {
  const coeur = document.createElement("span");
  coeur.className = "coeur-cible";
  coeur.textContent = garcon.embrasse ? "✔" : "💗";
  return coeur;
}

function annuleBisou() {
  if (!etat.bisou) return;
  const garcon = etat.bisou.garcon;

  etat.eoghan.el.innerHTML = persoSVG({
    peau: "#f0c39a", cheveux: "boucle", couleurCheveux: "#c98a3a",
    haut: "#00b32d", bas: "#2f3550", bouche: "sourire",
  });
  etat.eoghan.el.classList.remove("penche");

  if (!garcon.embrasse) {
    garcon.el.innerHTML = persoSVG({ ...garcon.look, bouche: "neutre" });
    garcon.el.appendChild(coeurCible(garcon));
  }
  garcon.el.classList.remove("penche");

  etat.bisou = null;
  document.body.classList.remove("bisou-en-cours");
  elements.salle.style.setProperty("--bisou", "0");
}

function avanceBisou(dtMs) {
  const bisou = etat.bisou;

  /* Bonus « bisou sous le nez » : un faisceau frôle Eoghan sans le toucher. */
  const frole = etat.pnj.some((p) => {
    if (p.plan !== etat.eoghan.plan) return false;
    const portee = porteeVue(p);
    if (portee <= 0) return false; // celui qui a le nez sur son écran ne frôle rien
    const d = (etat.eoghan.x - p.x) * p.dir;
    return d > 0 && d <= portee + 120 && d > portee - 40;
  });
  if (frole) bisou.frole = true;

  bisou.progression += dtMs;
  const part = Math.min(1, bisou.progression / etat.decor.duree_bisou_ms);
  elements.salle.style.setProperty("--bisou", part.toFixed(2));

  if (part < 1) return;

  const garcon = bisou.garcon;
  garcon.embrasse = true;
  garcon.el.innerHTML = persoSVG({ ...garcon.look, regard: "ferme", bouche: "sourire-large" });
  garcon.el.appendChild(coeurCible(garcon));
  garcon.el.classList.add("embrasse");

  etat.combo++;
  let gagne = 100 + (etat.combo - 1) * 50;
  if (bisou.frole) gagne += 200;
  etat.score += gagne;

  coeurs(garcon);
  commente(garcon.replique + (bisou.frole ? " (+200 sous le nez !)" : ""));
  annuleBisou();
  majTableau();

  if (etat.garcons.every((g) => g.embrasse)) {
    termine("Mission accomplie 💗", "Tous les garçons partants ont eu leur bisou. Personne n'a rien vu.", true);
  }
}

function coeurs(garcon) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const a = ancrage(garcon.plan);
  for (let i = 0; i < 6; i++) {
    const c = document.createElement("span");
    c.className = "coeur-envol";
    c.textContent = "💗";
    c.style.left = pourcent(garcon.x) + "%";
    c.style.bottom = a.bas + 14 + "%";
    c.style.setProperty("--decalage", (Math.random() * 60 - 30).toFixed(0) + "px");
    c.style.animationDelay = (i * 0.08).toFixed(2) + "s";
    elements.acteurs.appendChild(c);
    c.addEventListener("animationend", () => c.remove());
  }
}

/* =========================================================
   Gimmicks de décor
   ========================================================= */

function gereGimmick(maintenant, dt) {
  const decor = etat.decor;

  if (decor.gimmick === "flash" && maintenant >= etat.prochainGimmick) {
    etat.flashJusqua = maintenant + 1500;
    etat.prochainGimmick = maintenant + 10000;
    commente("⚡ FLASH ! Tout le monde voit tout.");
  }

  if (decor.gimmick === "douche" && maintenant >= etat.prochainGimmick && !etat.douche) {
    const el = document.createElement("div");
    el.className = "groupe-douche";
    el.innerHTML =
      persoSVG({ peau: "#f0c39a", cheveux: "chauve", couleurCheveux: "#2b1a2e", haut: "#fff", bas: "#4de0ff", bouche: "o" }) +
      persoSVG({ peau: "#a9683f", cheveux: "court", couleurCheveux: "#2b1a2e", haut: "#ffd84d", bas: "#3a4a7a", bouche: "sourire" }) +
      persoSVG({ peau: "#d99a6c", cheveux: "crete", couleurCheveux: "#8a5a2b", haut: "#c6ff4d", bas: "#2b1a2e", bouche: "neutre" });
    elements.acteurs.appendChild(el);
    etat.douche = { x: -120, el };
    etat.prochainGimmick = maintenant + 20000;
    commente("🚿 Le groupe de la douche traverse. Pousse-toi.");
  }

  document.body.classList.toggle("flash", maintenant < etat.flashJusqua);
  avanceDouche(dt);
  avanceProjecteur(dt);
}

/* Le projecteur du bal : un rond de lumière qui balaie la piste sans jamais
   s'arrêter. Contrairement aux téléphones il ne trie pas les rangées et les
   meubles hauts ne l'arrêtent pas — c'est un danger qu'on ne contourne pas,
   qu'on attend. La seule parade reste de s'accroupir derrière un abri. */
function avanceProjecteur(dt) {
  const p = etat.projecteur;
  if (!p) return;

  p.x += p.dir * p.vitesse * dt;
  if (p.x <= p.largeur / 2) { p.x = p.largeur / 2; p.dir = 1; }
  if (p.x >= LARGEUR_SALLE - p.largeur / 2) { p.x = LARGEUR_SALLE - p.largeur / 2; p.dir = -1; }

  if (elements.projecteur) {
    elements.projecteur.style.left = pourcent(p.x - p.largeur / 2) + "%";
    elements.projecteur.style.width = pourcent(p.largeur) + "%";
  }
}

/* Le groupe ne regarde rien, mais il occupe le passage : il pousse Eoghan
   devant lui, et donc souvent hors de sa cachette. */
function avanceDouche(dt) {
  const groupe = etat.douche;
  if (!groupe) return;

  groupe.x += 230 * dt;
  const a = ancrage(0);
  groupe.el.style.left = pourcent(groupe.x) + "%";
  groupe.el.style.bottom = a.bas + "%";

  if (etat.eoghan.plan === 0 && Math.abs(groupe.x - etat.eoghan.x) < 80) {
    etat.eoghan.x = Math.min(LARGEUR_SALLE - 30, groupe.x + 80);
    poseActeur(etat.eoghan.el, etat.eoghan.x, etat.eoghan.plan, etat.eoghan.dir);
    if (etat.bisou) {
      annuleBisou();
      commente("Poussé par le groupe.");
    }
  }

  if (groupe.x > LARGEUR_SALLE + 150) {
    groupe.el.remove();
    etat.douche = null;
  }
}

/* =========================================================
   Entrées
   ========================================================= */

const CLAVIER = {
  ArrowLeft: "gauche", q: "gauche", a: "gauche",
  ArrowRight: "droite", d: "droite",
  ArrowUp: "arriere", z: "arriere", w: "arriere",
  ArrowDown: "avant", s: "avant",
};

document.addEventListener("keydown", (ev) => {
  if (ev.key === "Shift") {
    accroupi(true);
    return;
  }

  if (ev.key === " " || ev.code === "Space") {
    ev.preventDefault();
    if (!etat.bisou) tenteBisou();
    return;
  }

  const action = CLAVIER[ev.key] || CLAVIER[ev.key.toLowerCase()];
  if (!action) return;
  ev.preventDefault();

  if (action === "arriere") changePlan(1);
  else if (action === "avant") changePlan(-1);
  else etat.touches.add(action);
});

document.addEventListener("keyup", (ev) => {
  if (ev.key === "Shift") accroupi(false);
  if (ev.key === " " || ev.code === "Space") annuleBisou();

  const action = CLAVIER[ev.key] || CLAVIER[ev.key.toLowerCase()];
  if (action === "gauche" || action === "droite") etat.touches.delete(action);
});

function accroupi(actif) {
  if (etat.eoghan.accroupi === actif) return;
  etat.eoghan.accroupi = actif;
  document.body.classList.toggle("accroupi", actif);
  etat.eoghan.el.classList.toggle("accroupi", actif);
}

/* Au doigt : on marche vers le côté touché, et on embrasse en maintenant
   le doigt sur un garçon proche. */
elements.salle.addEventListener("pointerdown", (ev) => {
  if (!etat.enCours) return;
  const rect = elements.salle.getBoundingClientRect();
  const x = ((ev.clientX - rect.left) / rect.width) * LARGEUR_SALLE;

  if (garconProche() && Math.abs(x - etat.eoghan.x) < 120) {
    tenteBisou();
    return;
  }
  etat.touches.add(x > etat.eoghan.x ? "droite" : "gauche");
});

document.addEventListener("pointerup", () => {
  etat.touches.clear();
  annuleBisou();
});

/* Les pavés du bas. Marcher et embrasser étaient déjà atteignables en tapant
   dans la salle ; s'accroupir et changer de rangée ne l'étaient pas du tout,
   et ce sont deux mécaniques centrales — d'où ce pavé plutôt qu'un geste de
   plus dans la salle, où un appui long veut déjà dire « embrasse ».

   `maintien` distingue les deux natures de commande : marcher, s'accroupir et
   embrasser sont des MAINTIENS (comme leurs touches : ←, Maj, Espace), alors
   que changer de rangée est un COUP (comme ↑ ↓, qui ne se répètent pas). */
function paveTactile(id, maintien, debut, fin) {
  const el = document.getElementById(id);
  if (!el) return;

  const on = (ev) => {
    /* Sans ça, le navigateur enchaîne un événement souris synthétique et
       déclenche l'action une seconde fois. */
    ev.preventDefault();
    if (!etat.enCours) return;
    el.classList.add("appuye");
    debut();
  };
  const off = () => {
    el.classList.remove("appuye");
    if (maintien && fin) fin();
  };

  el.addEventListener("pointerdown", on);
  el.addEventListener("pointerup", off);
  el.addEventListener("pointerleave", off);
  el.addEventListener("pointercancel", off);
  /* Le menu d'appui long d'Android vole le doigt en pleine partie. */
  el.addEventListener("contextmenu", (ev) => ev.preventDefault());
}

paveTactile("tact-gauche", true,
  () => etat.touches.add("gauche"),
  () => etat.touches.delete("gauche"));

paveTactile("tact-droite", true,
  () => etat.touches.add("droite"),
  () => etat.touches.delete("droite"));

/* Il n'y a que deux rangées (changePlan borne à 0–1) : un seul bouton qui
   bascule vaut mieux que deux flèches dont une sur trois ne fait rien. */
paveTactile("tact-plan", false,
  () => changePlan(etat.eoghan.plan === 0 ? 1 : -1));

paveTactile("tact-accroupi", true,
  () => accroupi(true),
  () => accroupi(false));

paveTactile("tact-bisou", true,
  () => { if (!etat.bisou) tenteBisou(); },
  () => annuleBisou());

/* =========================================================
   Tableau de bord et écrans
   ========================================================= */

function majTableau() {
  elements.score.textContent = etat.score;
  elements.combo.textContent = "×" + Math.max(1, etat.combo);
  elements.restants.textContent = etat.garcons.filter((g) => !g.embrasse).length;

  const max = etat.decor ? etat.decor.ragots_max : 3;
  elements.ragots.innerHTML = "";
  for (let i = 0; i < max; i++) {
    const cran = document.createElement("span");
    cran.className = "cran" + (i < etat.ragots ? " plein" : "");
    cran.textContent = i < etat.ragots ? "💔" : "💗";
    elements.ragots.appendChild(cran);
  }
}

function commente(texte) {
  elements.commentaire.textContent = texte;
  elements.commentaire.classList.remove("pop");
  void elements.commentaire.offsetWidth;
  elements.commentaire.classList.add("pop");
}

function construitMenu() {
  const records = litRecords();
  elements.ecranDecors.innerHTML = "";

  DECORS.forEach((decor) => {
    const record = records[decor.id];
    const med = record ? medaille(decor, record.score, record.fini) : null;

    /* Chaque terrain affiche son record et sa médaille : c'est le seul moyen
       de savoir qu'il reste quelque chose à aller chercher sur un décor déjà
       terminé. */
    const trophee = record
      ? '<span class="decor-record">' + (med ? med.icone + " " : "") +
        "Record " + record.score + " pts</span>"
      : '<span class="decor-record vierge">Jamais joué</span>';

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "decor-btn";
    btn.innerHTML =
      '<span class="decor-emoji" aria-hidden="true">' + decor.emoji + "</span>" +
      '<span class="decor-nom">' + decor.titre + "</span>" +
      '<span class="decor-etoiles">' + decor.etoiles + "</span>" +
      '<span class="decor-detail">' + decor.difficulte + " · " + decor.chrono_s + " s · " +
      decor.ragots_max + " ragots max</span>" +
      '<span class="decor-resume">' + decor.ambiance + "</span>" +
      trophee +
      '<span class="decor-objectif">🥈 ' + ((decor.objectifs && decor.objectifs.argent) || "—") +
        " · 🥇 " + ((decor.objectifs && decor.objectifs.or) || "—") + "</span>";
    btn.addEventListener("click", () => demarre(decor));
    elements.ecranDecors.appendChild(btn);
  });
}

$("btn-stop").addEventListener("click", () => {
  termine("Partie abandonnée", "Eoghan rentre se coucher.", false);
});

construitMenu();
chargeDecor(DECORS[0]);
majTableau();
elements.ecran.classList.add("visible");
