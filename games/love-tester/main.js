/* =========================================================
   Love Tester — le moteur
   ---------------------------------------------------------
   Ce fichier ne sait rien dire : les textes sont dans verdicts.js, le calcul
   dans hachage.js. Ici, il n'y a que la mise en scène.

   La machine est un appareil à TEXTE : deux prénoms saisis, une aiguille, un
   verdict. Elle n'affiche aucun visage — voir `majIdentite` pour le pourquoi.

   Et la mise en scène est TOUT le jeu. Le pourcentage est connu dès la
   première frappe au clavier ; l'afficher immédiatement n'amuserait
   personne. La machine chauffe, marmonne, allume ses voyants un par un,
   dépasse la valeur puis y revient — et seulement ensuite elle tranche.

   Confort : si le système demande moins d'animation, tout ce théâtre est
   sauté et le verdict tombe d'un coup (components.css coupe déjà les
   animations CSS, mais pas une boucle requestAnimationFrame).
   ========================================================= */

(function () {
  "use strict";

  const H = loveHachage;
  const D = DONNEES_LOVE;
  const $ = (id) => document.getElementById(id);

  /* Durées de la représentation, en millisecondes. */
  const T_ANALYSE = 1200; /* la machine chauffe et marmonne */
  const T_MONTEE = 1800; /* la jauge grimpe jusqu'au verdict */
  const HAUTEUR_COEUR = 112; /* le viewBox du cœur, cf. index.html */

  const machine = $("lt-machine");
  const champs = { a: $("lt-nom-a"), b: $("lt-nom-b") };
  const identites = { a: $("lt-identite-a"), b: $("lt-identite-b") };
  const remplissage = $("lt-remplissage");
  const vague = $("lt-vague");
  const chiffres = $("lt-chiffres");
  const echelle = $("lt-echelle");
  const ligneConsole = $("lt-console");
  const verdict = $("lt-verdict");
  const boutonTester = $("lt-tester");

  let enCours = false; /* une analyse tourne : on ne relance pas par-dessus */
  let cleAffichee = null; /* le couple dont le verdict est à l'écran */

  const sobre = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* =========================================================
     1. Reconnaître un prénom
     ========================================================= */

  /** Le personnage du casting qui répond à ce prénom, ou null. */
  function connu(nom) {
    const n = H.normalise(nom);
    if (!n) return null;
    for (let i = 0; i < D.CASTING.length; i++) {
      if (H.normalise(D.CASTING[i].nom) === n) return D.CASTING[i];
    }
    return null;
  }

  /* La machine ne montre AUCUN visage : c'est un appareil à chiffres et à
     verdicts, pas une galerie de portraits. Elle affichait un portrait dessiné
     de chaque côté, et pour un prénom qu'elle ne connaît pas il fallait
     l'inventer — un visage tiré du hachage du prénom, avec sa palette de
     peaux, de coiffures et de hauts. C'était la seule famille de dessins du
     portail qu'aucune illustration ne pourrait jamais remplacer : « Camille »
     doit avoir une tête, et l'ensemble des prénoms possibles est infini.

     En le retirant, le gadget redevient ce qu'il était en 2012 — deux champs,
     une aiguille, un verdict — et le problème disparaît au lieu d'être
     contourné. La légende sous le champ reste : c'est du texte, et c'est elle
     qui dit si la machine reconnaît le prénom. */
  function majIdentite(cote) {
    const nom = champs[cote].value;
    if (!H.normalise(nom)) {
      identites[cote].textContent = "en attente";
      return;
    }
    const perso = connu(nom);
    identites[cote].textContent = perso ? perso.mention : "inconnu au bataillon";
  }

  /* =========================================================
     2. Le mobilier construit depuis les données
     ========================================================= */

  /* Les voyants et les tranches de verdict sont la MÊME liste : ajouter une
     tranche dans verdicts.js ajoute son voyant, et les deux ne peuvent pas
     se contredire. */
  function construitEchelle() {
    echelle.innerHTML = "";
    /* De haut en bas sur la machine, donc à l'envers de la liste. */
    for (let i = D.TRANCHES.length - 1; i >= 0; i--) {
      const li = document.createElement("li");
      li.className = "lt-cran";
      li.dataset.rang = String(i);
      li.innerHTML =
        '<span class="lt-voyant"></span><span class="lt-cran-nom">' +
        D.TRANCHES[i].cran +
        "</span>";
      echelle.appendChild(li);
    }
  }

  function crans() {
    return echelle.querySelectorAll(".lt-cran");
  }

  /* Les prénoms viennent d'un champ de saisie : ils ne sont jamais injectés
     en HTML sans passer par là. */
  function echappe(texte) {
    const d = document.createElement("div");
    d.textContent = texte;
    return d.innerHTML;
  }

  /* =========================================================
     3. Le calcul complet d'un couple
     ========================================================= */

  function analyse(a, b) {
    const cle = H.cle(a, b);
    if (cle === null) return null;

    const score = H.score(a, b);
    let rang = 0;
    D.TRANCHES.forEach((t, i) => {
      if (score >= t.min) rang = i;
    });
    const tranche = D.TRANCHES[rang];

    return {
      cle: cle,
      a: a.trim(),
      b: b.trim(),
      score: score,
      rang: rang,
      tranche: tranche,
      texte: H.pioche(cle, "formulation", tranche.textes),
      mention: H.pioche(cle, "mention", D.MENTIONS),
      etapes: etapes(cle),
      /* Chaque relevé GRAVITE autour du verdict au lieu d'en être
         indépendant. Avant, les trois étaient des tirages séparés : la machine
         pouvait annoncer 5 % de compatibilité avec 81 % d'alchimie, ce qui ne
         se lit pas comme un appareil farfelu mais comme un appareil cassé.
         Chacun garde son écart propre (`ecart`, tiré du hachage donc stable)
         et son sens (`inverse` pour le risque de drame, qui doit monter quand
         le verdict descend). Le verdict, lui, reste le hachage brut : c'est
         seulement l'orbite des relevés qui change, pas leur imprévisibilité. */
      axes: D.AXES.map((axe) => {
        const base = axe.inverse ? 100 - score : score;
        const derive = H.tirage(cle, axe.sel, 2 * axe.ecart + 1) - axe.ecart;
        const valeur = Math.max(0, Math.min(100, base + derive));
        const niveau = valeur < 34 ? 0 : valeur < 67 ? 1 : 2;
        return { nom: axe.nom, valeur: valeur, commentaire: axe.commentaires[niveau] };
      }),
      /* Se tester avec soi-même est le premier réflexe de tout le monde. */
      solo: H.normalise(a) === H.normalise(b),
    };
  }

  /* Quatre lignes de marmonnement, sans doublon et toujours les mêmes pour
     un couple donné : un battage de cartes classique, mais dont chaque
     coupe est tirée du hachage plutôt que de Math.random. */
  function etapes(cle) {
    const paquet = D.ETAPES.slice();
    for (let i = paquet.length - 1; i > 0; i--) {
      const j = H.tirage(cle, "battage" + i, i + 1);
      const t = paquet[i];
      paquet[i] = paquet[j];
      paquet[j] = t;
    }
    return paquet.slice(0, 4);
  }

  /* =========================================================
     4. La représentation
     ========================================================= */

  function poseJauge(valeur) {
    const part = Math.max(0, Math.min(100, valeur)) / 100;
    const y = HAUTEUR_COEUR - part * HAUTEUR_COEUR;
    remplissage.setAttribute("y", y.toFixed(1));
    vague.setAttribute("d", part > 0 ? cheminVague(y) : "");
    chiffres.textContent = String(Math.round(Math.max(0, Math.min(100, valeur))))
      .padStart(3, "0");

    /* Les voyants s'allument au passage, comme sur un vumètre. */
    crans().forEach((li) => {
      const rang = Number(li.dataset.rang);
      li.classList.toggle("lt-cran-atteint", valeur >= D.TRANCHES[rang].min);
    });
  }

  /* Le clapot à la surface du liquide : une sinusoïde échantillonnée tous
     les 10 px, refermée vers le bas pour faire une bande pleine. */
  function cheminVague(y) {
    const phase = performance.now() / 260;
    let d = "M0 " + (y + 3 * Math.sin(phase)).toFixed(1);
    for (let x = 12; x <= 120; x += 12) {
      d += " L" + x + " " + (y + 3 * Math.sin(phase + x / 15)).toFixed(1);
    }
    return d + " L120 " + (y + 9).toFixed(1) + " L0 " + (y + 9).toFixed(1) + " Z";
  }

  /* Rebond discret en fin de course : l'aiguille dépasse d'environ 4 % puis
     revient se poser. C'est ce qui fait « appareil de mesure » plutôt que
     « barre de progression ». */
  function ressort(p) {
    const c = 1.05;
    return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
  }

  function lance() {
    if (enCours) return;

    const res = analyse(champs.a.value, champs.b.value);
    if (!res) {
      const vide = H.normalise(champs.a.value) ? champs.b : champs.a;
      dis("Il me faut DEUX prénoms.");
      secoue(vide);
      vide.focus();
      return;
    }

    enCours = true;
    boutonTester.disabled = true;
    machine.setAttribute("aria-busy", "true");
    machine.classList.add("lt-chauffe");
    verdict.className = "lt-verdict";
    verdict.innerHTML = "";
    cleAffichee = null;

    if (sobre()) {
      /* Pas de théâtre : le résultat, tout de suite. */
      poseJauge(res.score);
      termine(res);
      return;
    }

    const depart = performance.now();
    let etapeDite = -1;

    (function image(maintenant) {
      const t = maintenant - depart;

      if (t < T_ANALYSE) {
        /* Frémissement : la machine cherche, elle ne monte pas encore. */
        poseJauge(7 + 5 * Math.sin(t / 70));
        const n = Math.min(res.etapes.length - 1, Math.floor(t / (T_ANALYSE / res.etapes.length)));
        if (n !== etapeDite) {
          etapeDite = n;
          dis(res.etapes[n] + "…");
          bip(280 + n * 40, 0.05);
        }
        requestAnimationFrame(image);
        return;
      }

      const p = Math.min(1, (t - T_ANALYSE) / T_MONTEE);
      poseJauge(res.score * ressort(p));
      if (p < 1) {
        requestAnimationFrame(image);
        return;
      }
      poseJauge(res.score);
      termine(res);
    })(depart);
  }

  function termine(res) {
    enCours = false;
    boutonTester.disabled = false;
    machine.removeAttribute("aria-busy");
    machine.classList.remove("lt-chauffe");

    crans().forEach((li) => {
      li.classList.toggle("lt-cran-actif", Number(li.dataset.rang) === res.rang);
    });

    dis("Analyse terminée. Le verdict est en bas.");
    afficheVerdict(res);
    carnet.ajoute(res);
    fanfare(res.score);
    cleAffichee = res.cle;
  }

  function afficheVerdict(res) {
    verdict.className = "lt-verdict lt-verdict-visible lt-tranche-" + res.rang;
    verdict.innerHTML =
      '<p class="lt-verdict-couple">' +
      echappe(res.a) +
      ' <span class="lt-coeurmini" aria-hidden="true">♥</span> ' +
      echappe(res.b) +
      " — <b>" +
      res.score +
      " %</b></p>" +
      '<h2 class="lt-verdict-titre">' +
      echappe(res.tranche.titre) +
      "</h2>" +
      '<p class="lt-verdict-texte">' +
      echappe(res.texte) +
      "</p>" +
      (res.solo
        ? '<p class="lt-verdict-texte lt-solo">' + echappe(D.AUTO_TEST) + "</p>"
        : "") +
      '<ul class="lt-axes">' +
      res.axes
        .map(
          (axe) =>
            '<li class="lt-axe"><span class="lt-axe-nom">' +
            echappe(axe.nom) +
            '</span><span class="lt-axe-barre"><i style="width:' +
            axe.valeur +
            '%"></i></span><span class="lt-axe-valeur">' +
            axe.valeur +
            " %</span>" +
            '<span class="lt-axe-note">' +
            echappe(axe.commentaire) +
            "</span></li>"
        )
        .join("") +
      "</ul>" +
      '<p class="lt-mention-legale">' +
      echappe(res.mention) +
      "</p>";
  }

  function dis(texte) {
    ligneConsole.textContent = texte;
  }

  function secoue(champ) {
    champ.classList.remove("lt-secoue");
    /* Relire une propriété de mise en page force le navigateur à repartir de
       zéro : sans ça, deux clics de suite ne rejouent pas l'animation. */
    void champ.offsetWidth;
    champ.classList.add("lt-secoue");
  }

  /* =========================================================
     5. Le carnet — pourquoi on reteste
     ---------------------------------------------------------
     Le gadget ne vaut que si l'on compare : « attends, essaie avec lui ».
     Le carnet garde les derniers relevés et les classe par score, ce qui
     transforme une curiosité en petit concours. Il est aussi la preuve
     visible que la machine ne triche pas : rouvrir la page, retaper le même
     couple, on retombe sur la ligne déjà écrite.
     ========================================================= */

  const carnet = (function () {
    const CLE = "uma_love_carnet";
    const MAX = 8;
    let secours = []; /* si le stockage est refusé (navigation privée) */

    function lit() {
      try {
        const brut = JSON.parse(localStorage.getItem(CLE));
        return Array.isArray(brut) ? brut : [];
      } catch (e) {
        return secours;
      }
    }

    function ecrit(lignes) {
      secours = lignes;
      try {
        localStorage.setItem(CLE, JSON.stringify(lignes));
      } catch (e) {
        /* tant pis : le carnet vivra le temps de la page */
      }
      rend();
    }

    function ajoute(res) {
      const lignes = lit().filter((l) => l.cle !== res.cle);
      lignes.unshift({ cle: res.cle, a: res.a, b: res.b, score: res.score });
      ecrit(lignes.slice(0, MAX));
    }

    function rend() {
      const hote = $("lt-carnet");
      const lignes = lit().slice().sort((x, y) => y.score - x.score);
      hote.innerHTML = "";

      if (!lignes.length) {
        const vide = document.createElement("li");
        vide.className = "lt-carnet-vide";
        vide.textContent = "Rien encore.";
        hote.appendChild(vide);
        return;
      }

      lignes.forEach((l) => {
        const li = document.createElement("li");
        const b = document.createElement("button");
        b.type = "button";
        b.className = "lt-carnet-ligne";
        b.innerHTML =
          '<span class="lt-carnet-noms">' +
          echappe(l.a) +
          " ♥ " +
          echappe(l.b) +
          "</span>" +
          '<span class="lt-carnet-barre"><i style="width:' + l.score + '%"></i></span>' +
          '<span class="lt-carnet-score">' + l.score + " %</span>";
        b.title = "Refaire ce test";
        b.addEventListener("click", () => {
          champs.a.value = l.a;
          champs.b.value = l.b;
          majIdentite("a");
          majIdentite("b");
          lance();
        });
        li.appendChild(b);
        hote.appendChild(li);
      });
    }

    return { ajoute: ajoute, rend: rend, vide: () => ecrit([]) };
  })();

  /* =========================================================
     6. Les bruits de la machine
     ---------------------------------------------------------
     Synthétisés à la volée, comme chez Glinda : aucun fichier audio dans le
     dépôt. Le contexte n'est créé qu'au premier clic — un navigateur refuse
     de faire du bruit avant que l'internaute ait agi.
     ========================================================= */

  const son = (function () {
    const CLE = "uma_love_son";
    let contexte = null;
    let actif = true;
    try {
      actif = localStorage.getItem(CLE) !== "non";
    } catch (e) {
      /* stockage refusé : on garde le réglage par défaut */
    }

    function ctx() {
      const Fabrique = window.AudioContext || window.webkitAudioContext;
      if (!Fabrique) return null;
      if (!contexte) contexte = new Fabrique();
      return contexte;
    }

    function joue(frequence, duree, volume) {
      if (!actif) return;
      const c = ctx();
      if (!c) return;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "square";
      o.frequency.value = frequence;
      g.gain.setValueAtTime(volume || 0.04, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duree);
      o.connect(g).connect(c.destination);
      o.start();
      o.stop(c.currentTime + duree);
    }

    return {
      joue: joue,
      estActif: () => actif,
      bascule: function () {
        actif = !actif;
        try {
          localStorage.setItem(CLE, actif ? "oui" : "non");
        } catch (e) {
          /* rien à faire */
        }
        return actif;
      },
    };
  })();

  function bip(frequence, duree) {
    son.joue(frequence, duree || 0.05, 0.03);
  }

  /* Trois notes montantes si ça se passe bien, deux notes qui s'effondrent
     sinon : on sait ce qu'on a obtenu avant même d'avoir lu le verdict. */
  function fanfare(score) {
    const notes = score >= 58 ? [523, 659, 784] : score >= 25 ? [440, 494] : [330, 247];
    notes.forEach((n, i) => setTimeout(() => son.joue(n, 0.18, 0.05), i * 120));
  }

  /* =========================================================
     7. Branchements
     ========================================================= */

  machine.addEventListener("submit", (e) => {
    e.preventDefault();
    lance();
  });

  ["a", "b"].forEach((cote) => {
    champs[cote].addEventListener("input", () => majIdentite(cote));
  });

  $("lt-inverser").addEventListener("click", () => {
    const memeCouple = H.cle(champs.a.value, champs.b.value);
    const tmp = champs.a.value;
    champs.a.value = champs.b.value;
    champs.b.value = tmp;
    majIdentite("a");
    majIdentite("b");
    /* Le gag ET la démonstration : la clé d'un couple est rangée par ordre
       alphabétique avant d'être hachée, donc inverser ne peut rien changer. */
    if (memeCouple && memeCouple === cleAffichee) {
      dis("Inversés. C'est le même couple, donc le même verdict.");
    } else {
      dis("Prénoms inversés.");
    }
  });

  $("lt-vider").addEventListener("click", () => {
    carnet.vide();
    dis("Carnet effacé.");
  });

  const boutonSon = $("lt-son");
  function majBoutonSon() {
    boutonSon.setAttribute("aria-pressed", String(son.estActif()));
    boutonSon.textContent = son.estActif() ? "♪ Son" : "♪ Muet";
    boutonSon.classList.toggle("lt-muet", !son.estActif());
  }
  boutonSon.addEventListener("click", () => {
    son.bascule();
    majBoutonSon();
  });

  /* --- Démarrage ------------------------------------------------------- */
  construitEchelle();
  carnet.rend();
  majBoutonSon();
  majIdentite("a");
  majIdentite("b");
  poseJauge(0);
  chiffres.textContent = "---";
})();
