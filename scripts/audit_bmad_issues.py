#!/usr/bin/env python3
"""
audits_bmad_issues.py — Audit des issues BMAD vs issues libres

- Liste toutes les issues GitHub avec ou sans préfixe [X.Y]
- Vérifie la correspondance avec les stories BMAD (story_id)
"""


import re
import os
import sys
import json
import subprocess
from datetime import datetime
from github import Github
from pathlib import Path
import yaml



GITHUB_REPO = "m4rise/doc-classifier-app"
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
SPECS_DIR = Path("../doc-classifier-specs")
BMAD_DIR = SPECS_DIR / "_bmad-output/doc-classifier/implementation-artifacts"
STATE_JSON = SPECS_DIR / "sync/state.json"


assert GITHUB_TOKEN, "GITHUB_TOKEN doit être défini dans l'environnement."


# 0.1 Vérifier qu'on est bien sur main et à jour avec origin/main
def check_git_main_and_up_to_date(repo_path):
    print(f"[CHECK] Vérification de la branche 'main' et de la synchro avec origin/main dans {repo_path}...")
    try:
        # Vérifier la branche courante
        branch = subprocess.check_output([
            "git", "rev-parse", "--abbrev-ref", "HEAD"
        ], cwd=repo_path, encoding="utf-8").strip()
        if branch != "main":
            print(f"\nERREUR: La branche courante du repo specs n'est pas 'main' (actuelle: {branch}). Veuillez vous placer sur 'main'.\n")
            sys.exit(3)
        # Vérifier que le HEAD local est à jour avec origin/main
        subprocess.check_call(["git", "fetch", "origin"], cwd=repo_path)
        local = subprocess.check_output([
            "git", "rev-parse", "@"
        ], cwd=repo_path, encoding="utf-8").strip()
        remote = subprocess.check_output([
            "git", "rev-parse", "origin/main"
        ], cwd=repo_path, encoding="utf-8").strip()
        base = subprocess.check_output([
            "git", "merge-base", "@", "origin/main"
        ], cwd=repo_path, encoding="utf-8").strip()
        if local != remote:
            if local == base:
                msg = "Votre branche n'est pas à jour avec origin/main. Veuillez faire un git pull."
            elif remote == base:
                msg = "Votre branche a des commits en avance sur origin/main. Veuillez synchroniser."
            else:
                msg = "Votre branche et origin/main ont divergé. Veuillez résoudre la divergence."
            print(f"\nERREUR: {msg}\n")
            sys.exit(4)
    except Exception as e:
        print(f"Erreur lors de la vérification git: {e}")
        sys.exit(5)

# 0.2 Vérifier la fraîcheur de la synchronisation BMAD <-> GitHub
def check_sync_freshness(state_path, max_delta_seconds=120):
    print(f"[CHECK] Vérification de la fraîcheur de la synchronisation BMAD <-> GitHub dans {state_path}...")
    if not state_path.exists():
        print(f"Erreur: {state_path} introuvable. Impossible de vérifier la synchronisation.")
        sys.exit(1)
    with open(state_path, "r", encoding="utf-8") as f:
        state = json.load(f)
    d1 = state.get("last_bmad_to_github_sync")
    d2 = state.get("last_github_to_bmad_sync")
    if not d1 or not d2:
        print("Erreur: Les dates de synchronisation sont manquantes dans state.json.")
        sys.exit(1)
    t1 = datetime.fromisoformat(d1.replace("Z", "+00:00"))
    t2 = datetime.fromisoformat(d2.replace("Z", "+00:00"))
    delta = abs((t1 - t2).total_seconds())
    if delta > max_delta_seconds:
        print(f"\nERREUR: Les dates de synchronisation BMAD <-> GitHub sont trop éloignées (écart: {delta/60:.1f} min). Veuillez synchroniser avant d'auditer.\n")
        print(f"  last_bmad_to_github_sync: {d1}")
        print(f"  last_github_to_bmad_sync: {d2}")
        sys.exit(2)

check_git_main_and_up_to_date(SPECS_DIR)
check_sync_freshness(STATE_JSON)

g = Github(GITHUB_TOKEN)
repo = g.get_repo(GITHUB_REPO)

# 1. Récupérer toutes les issues
issues = list(repo.get_issues(state="all"))

# 2. Lister les issues BMAD ([X.Y]) et libres
bmad_issues = []
free_issues = []
for issue in issues:
    m = re.match(r"^\[(\d+\.\d+)\]", issue.title)
    if m:
        bmad_issues.append((issue.number, issue.title, m.group(1)))
    else:
        free_issues.append((issue.number, issue.title))

# 3. Lister les story_id des fichiers BMAD
story_ids = set()
for f in BMAD_DIR.glob("*.md"):
    with open(f, "r", encoding="utf-8") as fh:
        front = []
        for line in fh:
            if line.strip() == "---" and front:
                break
            if line.strip() != "---":
                front.append(line)
        fm = yaml.safe_load("".join(front))
        if fm and "story_id" in fm:
            story_ids.add(str(fm["story_id"]))

# 4. Audit
print("Issues BMAD (avec [X.Y]):")
for num, title, sid in bmad_issues:
    status = "OK" if sid in story_ids else "❌ story_id non trouvé"
    print(f"  #{num}: {title}  → {status}")

print("\nIssues libres (sans [X.Y]):")
for num, title in free_issues:
    print(f"  #{num}: {title}")
