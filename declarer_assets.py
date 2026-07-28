#!/usr/bin/env python3
"""Déclare automatiquement les images déposées dans assets/.

Tu déposes tes PNG dans le bon dossier, tu lances ce script, c'est fini :
il écrit `assets/manifest.json` à ta place.

    python declarer_assets.py              # déclare ce qu'il trouve
    python declarer_assets.py --nettoyer   # retire aussi les placeholders
                                           # des catégories qui ont de vraies
                                           # images
    python declarer_assets.py --essai      # montre ce qu'il ferait, sans écrire

Règles
------
- Un fichier `assets/haut/chemise-hawaienne.png` devient un item d'identifiant
  `chemise-hawaienne`, nommé « Chemise hawaienne ». Nomme donc tes fichiers
  comme tu veux voir les pièces s'appeler dans le jeu.
- Un item déjà présent garde tout ce que tu as écrit à la main (son `nom`
  rigolo, ses `decalageX`/`decalageY`) : seul son `fichier` est mis à jour.
- Les placeholders (les items sans `fichier`) sont laissés tranquilles, sauf
  avec `--nettoyer`.
- Un item qui pointe vers un fichier disparu est signalé, jamais supprimé en
  silence.
- `assets/body/` renseigne le corps de Drew, `assets/decors/` les décors.
"""

import json
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent
ASSETS = RACINE / "assets"
MANIFEST = ASSETS / "manifest.json"

EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}

# Nom du dossier -> clé dans le manifest (identique sauf pour les décors).
CLE_SPECIALE = {"decors": "decor"}

# Ordre d'écriture des catégories, du plus interne au plus externe.
ORDRE = [
    "decor", "body", "calecon", "bas", "chaussures", "haut", "veste_manteau",
    "ceinture_accessoire_taille", "bijoux", "coiffure", "chapeau_couvre_chef",
    "visage_extra", "sticker_overlay",
]


def joli_nom(tige):
    """chemise-hawaienne_02 -> « Chemise hawaienne 02 »"""
    mots = tige.replace("_", " ").replace("-", " ").split()
    return " ".join(mots).capitalize() if mots else tige


def images_du_dossier(dossier):
    if not dossier.is_dir():
        return []
    trouvees = [f for f in sorted(dossier.iterdir())
                if f.is_file() and f.suffix.lower() in EXTENSIONS]
    return trouvees


def charge_manifest():
    if not MANIFEST.exists():
        return {}
    with MANIFEST.open(encoding="utf-8") as f:
        return json.load(f)


def main():
    nettoyer = "--nettoyer" in sys.argv
    essai = "--essai" in sys.argv

    manifest = charge_manifest()
    ajouts, maj, orphelins, restes = [], [], [], []

    dossiers = sorted(d for d in ASSETS.iterdir() if d.is_dir())

    for dossier in dossiers:
        cle = CLE_SPECIALE.get(dossier.name, dossier.name)
        items = manifest.setdefault(cle, [])
        par_id = {it.get("id"): it for it in items}

        for image in images_du_dossier(dossier):
            ident = image.stem
            chemin = f"assets/{dossier.name}/{image.name}"
            existant = par_id.get(ident)

            if existant is None:
                nouveau = {"id": ident, "nom": joli_nom(ident), "fichier": chemin}
                items.append(nouveau)
                par_id[ident] = nouveau
                ajouts.append(f"{cle}/{ident}  <-  {chemin}")
            elif existant.get("fichier") != chemin:
                existant["fichier"] = chemin
                maj.append(f"{cle}/{ident}  <-  {chemin}")

        # Fichiers déclarés mais absents du disque
        for it in items:
            f = it.get("fichier")
            if f and not (RACINE / f).exists():
                orphelins.append(f"{cle}/{it.get('id')}  ->  {f}")

        avec_image = [it for it in items if it.get("fichier")]
        sans_image = [it for it in items if not it.get("fichier")]

        if nettoyer and avec_image and sans_image:
            manifest[cle] = avec_image
            restes.append(f"{cle} : {len(sans_image)} placeholder(s) retire(s), "
                          f"{len(avec_image)} image(s)")
        elif sans_image:
            restes.append(f"{cle} : {len(avec_image)} image(s), "
                          f"{len(sans_image)} encore en placeholder")

    # Réécrit dans un ordre stable et lisible
    ordonne = {}
    for cle in ORDRE:
        if cle in manifest:
            ordonne[cle] = manifest[cle]
    for cle in manifest:
        if cle not in ordonne:
            ordonne[cle] = manifest[cle]

    def bloc(titre, lignes):
        if lignes:
            print("\n" + titre)
            for l in lignes:
                print("  " + l)

    bloc("Nouvelles pieces declarees :", ajouts)
    bloc("Chemins mis a jour :", maj)
    bloc("Declares mais introuvables sur le disque :", orphelins)
    bloc("Pour information :", restes)

    if not (ajouts or maj):
        print("\nRien de nouveau a declarer.")

    if essai:
        print("\n--essai : manifest.json n'a pas ete modifie.")
        return

    with MANIFEST.open("w", encoding="utf-8") as f:
        json.dump(ordonne, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"\n{MANIFEST.relative_to(RACINE)} ecrit.")


if __name__ == "__main__":
    main()
