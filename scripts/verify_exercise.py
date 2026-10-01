#!/usr/bin/env python3
"""
verify_exercise.py
Verifica la conformità completa di un esercizio nel repository papa_diemoz.
Controlla la presenza dei file obbligatori, la compilazione con -Wall -Wconversion,
la conformità del makefile, la struttura del README.md e la generazione del PDF con pandoc.
"""

import os
import sys
import subprocess
import argparse

REPO_ROOT = "/home/d.diemoz/git/papa_diemoz"
PROGETTI_DIR = os.path.join(REPO_ROOT, "progetti")

REQUIRED_FILES = [
    "main.cpp",
    "function.h",
    "function.cpp",
    "makefile",
    "INSTALL.md",
    "README.md",
    "COPYING",
    "gpl-3.0.txt"
]

RECOMMENDED_SECTIONS = [
    ("## Consegna", True),
    ("## Svolgimento", True),
    ("## Argomenti trattati", False),
    ("## Fonti", False),
    ("## Allegati", False),
    ("## Problemi riscontrati", False)
]

def check_files(project_dir):
    errors = []
    print("[*] Controllo file obbligatori...")
    for f in REQUIRED_FILES:
        path = os.path.join(project_dir, f)
        if not os.path.exists(path):
            errors.append(f"Manca il file obbligatorio: {f}")
        elif os.path.getsize(path) == 0 and f != "COPYING":
            errors.append(f"Il file {f} è vuoto.")
    return errors

def check_makefile(project_dir):
    errors = []
    print("[*] Controllo makefile...")
    mk_path = os.path.join(project_dir, "makefile")
    if not os.path.exists(mk_path):
        return ["makefile assente"]
    with open(mk_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    targets = ["a.out", "clean", "run", "doc"]
    for t in targets:
        if f"{t}:" not in content and f"{t} :" not in content:
            errors.append(f"Target '{t}' non trovato nel makefile.")
    if "-Wall" not in content or "-Wconversion" not in content:
        errors.append("Le flag '-Wall -Wconversion' devono essere presenti nel makefile.")
    return errors

def check_compilation(project_dir):
    errors = []
    print("[*] Test di compilazione con 'g++ -Wall -Wconversion'...")
    subprocess.run(["make", "clean"], cwd=project_dir, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    res = subprocess.run(["make"], cwd=project_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        errors.append(f"Errore durante 'make':\n{res.stderr}")
    elif len(res.stderr.strip()) > 0:
        # Warning presenti
        errors.append(f"La compilazione ha generato warning (non ammessi con -Wconversion):\n{res.stderr}")
    else:
        print("[+] Compilazione completata con 0 errori e 0 warning!")
    return errors

def check_readme(project_dir):
    errors = []
    warnings = []
    print("[*] Controllo struttura README.md...")
    readme_path = os.path.join(project_dir, "README.md")
    if not os.path.exists(readme_path):
        return ["README.md mancante"], []
    with open(readme_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    lower_content = content.lower()
    for sec, required in RECOMMENDED_SECTIONS:
        sec_prefix = sec.lower().rstrip(":")
        if sec_prefix not in lower_content:
            msg = f"Sezione '{sec}' non trovata nel README.md."
            if required:
                errors.append(msg)
            else:
                warnings.append(msg)

    if "> Daniel Diemoz" not in content and "Daniel Diemoz" not in content:
        warnings.append("Autore 'Daniel Diemoz' non indicato chiaramente in testata.")

    return errors, warnings

def check_pdf(project_dir):
    errors = []
    print("[*] Test generazione PDF tramite pandoc ('make doc')...")
    res = subprocess.run(["make", "doc"], cwd=project_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        errors.append(f"Errore durante 'make doc' (pandoc):\n{res.stderr}")
    else:
        pdf_path = os.path.join(project_dir, "README.pdf")
        if not os.path.exists(pdf_path) or os.path.getsize(pdf_path) == 0:
            errors.append("README.pdf non è stato generato o è vuoto.")
        else:
            print("[+] README.pdf generato correttamente!")
    return errors

def main():
    parser = argparse.ArgumentParser(description="Verifica un esercizio per papa_diemoz")
    parser.add_argument("progetto", help="Nome della cartella del progetto o percorso completo")
    args = parser.parse_args()

    project_dir = args.progetto
    if not os.path.isabs(project_dir):
        if os.path.exists(os.path.join(PROGETTI_DIR, project_dir)):
            project_dir = os.path.join(PROGETTI_DIR, project_dir)
        else:
            project_dir = os.path.abspath(project_dir)

    if not os.path.exists(project_dir):
        print(f"Errore: la directory {project_dir} non esiste.")
        sys.exit(1)

    print(f"=== VERIFICA ESERCIZIO: {os.path.basename(project_dir)} ===")
    all_errors = []
    all_warnings = []
    all_errors.extend(check_files(project_dir))
    all_errors.extend(check_makefile(project_dir))
    all_errors.extend(check_compilation(project_dir))
    readme_err, readme_warn = check_readme(project_dir)
    all_errors.extend(readme_err)
    all_warnings.extend(readme_warn)
    all_errors.extend(check_pdf(project_dir))

    if all_warnings:
        print("\n[*] Avvisi di stile:")
        for w in all_warnings:
            print(f"  ? {w}")

    if all_errors:
        print("\n[!] Errori bloccanti rilevati:")
        for e in all_errors:
            print(f"  X {e}")
        sys.exit(1)
    else:
        print("\n[V] VERIFICA SUPERATA CON SUCCESSO!")

if __name__ == "__main__":
    main()
