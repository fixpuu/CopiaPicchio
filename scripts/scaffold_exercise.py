#!/usr/bin/env python3
"""
scaffold_exercise.py
Inizializza un nuovo progetto di esercizio nella cartella progetti/ di papa_diemoz
copiando la struttura di base da skel/ e predisponendo i file con le intestazioni standard.
"""

import os
import sys
import shutil
import argparse
from datetime import datetime

REPO_ROOT = "/home/d.diemoz/git/papa_diemoz"
PROGETTI_DIR = os.path.join(REPO_ROOT, "progetti")
SKEL_DIR = os.path.join(PROGETTI_DIR, "skel")

def main():
    parser = argparse.ArgumentParser(description="Inizializza un esercizio per papa_diemoz")
    parser.add_argument("--nome", required=True, help="Nome della cartella (es. ordinamento_matrici)")
    parser.add_argument("--data", default=datetime.now().strftime("%d/%m/%Y"), help="Data (es. 29/09/2026)")
    parser.add_argument("--autore", default="Daniel Diemoz", help="Nome autore")
    parser.add_argument("--classe", default="3B IT", help="Classe")
    parser.add_argument("--titolo", default="", help="Titolo documento")
    parser.add_argument("--argomenti", default="", help="Argomenti trattati")
    parser.add_argument("--consegna", default="", help="Testo della consegna")

    args = parser.parse_args()

    nome_clean = args.nome.lower().strip().replace(" ", "_").replace("-", "_")
    target_dir = os.path.join(PROGETTI_DIR, nome_clean)

    if os.path.exists(target_dir):
        print(f"[!] La directory {target_dir} esiste già.")
    else:
        print(f"[*] Creazione cartella progetto: {target_dir}")
        os.makedirs(target_dir, exist_ok=True)
        # Copia da skel se presente
        if os.path.exists(SKEL_DIR):
            for item in os.listdir(SKEL_DIR):
                s = os.path.join(SKEL_DIR, item)
                d = os.path.join(target_dir, item)
                if item in ("COPYING", "gpl-3.0.txt", "makefile"):
                    if not os.path.exists(d):
                        if os.path.isdir(s):
                            shutil.copytree(s, d)
                        else:
                            shutil.copy2(s, d)
                        print(f"[*] Copiato da skel: {item}")

    # Assicuriamo la presenza dei file minimi
    files_to_touch = ["main.cpp", "function.h", "function.cpp", "makefile", "INSTALL.md", "README.md"]
    for f in files_to_touch:
        fp = os.path.join(target_dir, f)
        if not os.path.exists(fp):
            with open(fp, "w") as fp_out:
                fp_out.write("")
            print(f"[*] Creato file vuoto: {f}")

    titolo = args.titolo if args.titolo else f"Esercizi di informatica assegnati il {args.data}"

    # Prepara README.md se vuoto
    readme_path = os.path.join(target_dir, "README.md")
    if os.path.getsize(readme_path) == 0:
        with open(readme_path, "w") as rf:
            rf.write(f"""> Autore: {args.autore}  
> Classe: {args.classe}  
> Data: {args.data}

# {titolo}

## Argomenti trattati

{args.argomenti if args.argomenti else "<!-- Inserisci qui gli argomenti trattati -->"}

## Consegna

{args.consegna if args.consegna else "<!-- Inserisci qui la consegna dell'esercizio -->"}

## Svolgimento

### Creare un progetto

Parto dalla skel e creo il nuovo progetto `{nome_clean}`:

```
d.diemoz@ltsp42:~/git/papa_diemoz/progetti$ cp -ai skel/ {nome_clean}
```

<!-- Suddividi qui la consegna nei vari passaggi logici -->

## Allegati

<!-- Riporta qui makefile, INSTALL.md, function.h, function.cpp, main.cpp -->

## Fonti

<!-- Inserisci qui le fonti consultate -->

## Problemi riscontrati

<!-- Descrivi eventuali warning o problemi riscontrati durante lo svolgimento -->

<style>
:not(pre) > code {{
    color: #5310f0 !important; 
    background-color: #faf7f6ff !important;
    border: 1px solid #dcdcdc !important;
    border-radius: 6px !important;
    padding: 0.2em 0.4em !important;
    font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace !important;
    font-size: 85% !important;
}}
</style>
""")
        print("[*] Predisposto README.md iniziale")

    print(f"\n[OK] Progetto inizializzato con successo in: {target_dir}")

if __name__ == "__main__":
    main()
