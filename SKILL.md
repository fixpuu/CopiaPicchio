---
name: papa-diemoz-esercizi
description: >-
  Use this skill whenever the user asks to solve, generate, or replicate an informatics exercise, homework (compito), or lab project for the papa_diemoz repository, given an assignment (consegna) and topics covered (argomenti trattati). It produces the full project structure (main.cpp, function.h, function.cpp, makefile, INSTALL.md, README.md, README.pdf) following the exact conventions, coding style, compiler flags (-Wall -Wconversion), testing workflow, and markdown documentation structure established in the papa_diemoz repository.
---

# Replicatore Esercizi di Informatica per `papa_diemoz`

Questa skill automatizza e guida la creazione di esercizi, compiti e progetti di laboratorio per il repository `/home/d.diemoz/git/papa_diemoz/` dello studente **Daniel Diemoz** (classe 3B IT), garantendo la totale rispondenza alle severe convenzioni stilistiche e didattiche del docente.

---

## 1. Struttura del Progetto

Ogni esercizio è un progetto indipendente salvato in:
`/home/d.diemoz/git/papa_diemoz/progetti/<nome_progetto>/`

### Regole per il nome del progetto:
- Solo lettere minuscole e underscore (`_`), senza spazi né trattini (es. `ripasso_vettori`, `ordinamento`, `estrazioni`, `cifratura`, `exception`).

### File obbligatori in ogni cartella progetto:
1. `main.cpp`
2. `function.h`
3. `function.cpp`
4. `makefile`
5. `INSTALL.md`
6. `README.md`
7. `README.pdf` (generato con pandoc via `make doc`)
8. `COPYING` (ereditato da `skel/`)
9. `gpl-3.0.txt` (ereditato da `skel/`)

---

## 2. Procedura Passo-Passo per Replicare un Esercizio

Data una **consegna** e gli **argomenti trattati** (e opzionalmente una data):

### Passo 1: Inizializzazione della directory da `skel/`
Puoi usare lo script helper o farlo via shell:
```bash
# Tramite helper:
python3 /home/d.diemoz/git/papa_diemoz/.agents/skills/papa-diemoz-esercizi/scripts/scaffold_exercise.py \
  --nome <nome_progetto> \
  --data "DD/MM/YYYY" \
  --argomenti "<argomenti>" \
  --consegna "<consegna>"

# Oppure direttamente da shell:
cd /home/d.diemoz/git/papa_diemoz/progetti
cp -ai skel/ <nome_progetto>
```

---

### Passo 2: Decomposizione della Consegna (Regola d'Oro del Docente)
Non iniziare a scrivere codice monolitico. Leggi la consegna e scomponila in una serie numerata di passaggi logici:
- Ogni requisito della consegna diventa una sezione `### <Titolo del requisito>` nel `README.md`.
- Per ogni funzione richiesta:
  1. `#### Prototipo` (in `function.h`)
  2. `#### Implementazione` (in `function.cpp`)
  3. `#### Utilizzo` (nel `main.cpp`)
  4. `#### Test / La testo` (output reale da terminale seguito da `Funziona.`)

---

### Passo 3: Sviluppo del Codice C++ a 3 File

#### File 1: `function.h`
Deve contenere le inclusioni standard, `using namespace std;`, le guardie di inclusione e i prototipi:
```cpp
#ifndef FUNCTION_H
#define FUNCTION_H " funzione"

#include <iostream>
#include <fstream>
#include <cstdlib>
#include <ctime>
#include <string>

using namespace std;

// Prototipi
int get_casuale(int da, int a);
void riempi(int v[], int n);
void stampa(int v[], int n);

#endif
```

#### File 2: `function.cpp`
Contiene le definizioni di tutte le funzioni ausiliarie:
```cpp
#include "function.h"

int get_casuale(int da, int a) {
    return rand() % (a - da + 1) + da;
}

void riempi(int v[], int n) {
    for (int i = 0; i < n; i++) {
        v[i] = get_casuale(-1000, 1000);
    }
}
```

#### File 3: `main.cpp`
Contiene `main()` e gestisce parametri da linea di comando (`argc`, `argv`):
```cpp
#include "function.h"

int main(int argc, char **argv) {
    // 1. Inizializzazione casuale obbligatoria con cast (zero warning -Wconversion)
    srand((unsigned int)time(NULL));

    // 2. Controllo argomenti linea di comando (se previsti)
    if (argc < 2) {
        cerr << "Parametri insufficienti. Utilizzo: ./a.out <arg>" << endl;
        return 1;
    }

    // 3. Logica dell'esercizio
    // ...
    return 0;
}
```

#### Regole Cruciali di Codifica C++ del Docente:
- **Nessun warning con `-Wconversion`**:
  - `srand((unsigned int)time(NULL));` (obbligatorio il cast a `unsigned int`).
  - Cast espliciti nelle divisioni numeriche: `(double)somma / (double)n`.
  - Non mischiare variabili intere con `size_t` senza cast.
- **Sicurezza I/O su File**:
  - File di input: verificare sempre `if (!f_in.is_open()) { cerr << "..."; return 3; }`.
  - File di output: per non sovrascrivere file esistenti, aprirlo prima con `ifstream` in sola lettura; se `is_open()`, segnalare l'errore:
    ```cpp
    ifstream f_out(nome_file_output);
    if (f_out.is_open()) {
        cerr << "Il file `" << nome_file_output << "` non deve esistere!" << endl;
        return 2;
    }
    ```
- **Formattazione Output**:
  Intestazioni chiare (`===== Numeri =====`, `======== Alunno ========`).

---

### Passo 4: Configurazione del `makefile`

Il `makefile` **DEVE** contenere i target: `a.out`, `function.o`, `main.o`, `clean`, `run`, `doc`.
Le righe di comando devono usare il carattere **TAB**:
```makefile
#makefile

a.out: function.o main.o
	g++ -Wall -Wconversion function.o main.o

function.o: function.cpp function.h
	g++ -Wall -Wconversion -c function.cpp

main.o: function.h main.cpp
	g++ -Wall -Wconversion -c main.cpp

clean:
	rm -f *.o a.out

run: a.out
	./a.out

doc:
	pandoc -o README.pdf README.md
```

---

### Passo 5: Configurazione di `INSTALL.md`

Creare `INSTALL.md` con le sezioni standard:
- `# COMPILAZIONE` (comandi `g++` e `make`)
- `# ESECUZIONE` (`./a.out` o `make run`)
- `# RISULTATO ATTESO` (output della sessione)
- `# PULIZIA` (`make clean`)
- `# DOCUMENTAZIONE` (`make doc`)

---

### Passo 6: Compilazione Reale ed Esecuzione

Esegui sempre i comandi reali nella cartella del progetto per raccogliere i log di esecuzione effettivi:
```bash
make clean
make
./a.out <eventuali_argomenti>
```
Verifica che:
1. `make` non produca alcun warning né errore.
2. L'output sia esattamente quello richiesto dalla consegna.

---

### Passo 7: Redazione del `README.md`

Il `README.md` è il documento fondamentale dell'esercizio. Deve essere strutturato così:

```markdown
> Autore: Daniel Diemoz  
> Classe: 3B IT  
> Data: DD/MM/YYYY

# Esercizi di informatica assegnati il DD/MM/YYYY

## Argomenti trattati

<Spiegazione degli argomenti trattati a lezione / registro elettronico>

## Consegna

<Testo letterale della consegna>

## Svolgimento

### Creare un progetto

Parto dalla skel e creo il nuovo progetto `<nome_progetto>`:

```
d.diemoz@ltsp42:~/git/papa_diemoz/progetti$ cp -ai skel/ <nome_progetto>
```

### <Passo 1 della Consegna>
#### Prototipo
Nel `function.h`:
```cpp
...
```

#### Implementazione
Nel `function.cpp`:
```cpp
...
```

#### Utilizzo
Nel `main.cpp`:
```cpp
...
```

#### Test
```
d.diemoz@ltsp42:~/git/papa_diemoz/progetti/<nome_progetto>$ make run
<output effettivo>
```
Funziona.

### <Passo 2 della Consegna...>
...

## Allegati

### makefile
```makefile
<contenuto del makefile>
```

### INSTALL.md
```markdown
<contenuto di INSTALL.md>
```

### function.h
```cpp
<codice function.h>
```

### function.cpp
```cpp
<codice function.cpp>
```

### main.cpp
```cpp
<codice main.cpp>
```

## Fonti

- Documentazione cplusplus.com
- W3Schools C++
- Dispense del docente

## Problemi riscontrati

<Riflessioni su warning gestiti con -Wconversion, delimitatori o casi limite>

<style>
:not(pre) > code {
    color: #5310f0 !important; 
    background-color: #faf7f6ff !important;
    border: 1px solid #dcdcdc !important;
    border-radius: 6px !important;
    padding: 0.2em 0.4em !important;
    font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace !important;
    font-size: 85% !important;
}
</style>
```

---

### Passo 8: Generazione del PDF con Pandoc

Esegui:
```bash
make doc
```
Verifica che `README.pdf` sia generato correttamente.

---

### Passo 9: Verifica Finale Automatica

Esegui lo script di validazione:
```bash
python3 /home/d.diemoz/git/papa_diemoz/.agents/skills/papa-diemoz-esercizi/scripts/verify_exercise.py <nome_progetto>
```
Lo script confermerà che:
- Tutti i file obbligatori sono presenti (`main.cpp`, `function.h`, `function.cpp`, `makefile`, `INSTALL.md`, `README.md`, `COPYING`, `gpl-3.0.txt`).
- La compilazione con `g++ -Wall -Wconversion` è perfetta a 0 errori e 0 warning.
- Il makefile contiene tutti i target.
- Il README.md contiene tutte le sezioni richieste.
- `README.pdf` è stato compilato con successo.

---

## 3. Risorse e Riferimenti Inclusi nella Skill

- [Guida alle convenzioni](./references/conventions.md): dettaglio completo delle regole didattiche.
- [Esempio di riferimento](./examples/reference_ripasso_vettori.md): caso studio completo di `ripasso_vettori`.
- Script di supporto:
  - `scaffold_exercise.py`: [scripts/scaffold_exercise.py](./scripts/scaffold_exercise.py)
  - `verify_exercise.py`: [scripts/verify_exercise.py](./scripts/verify_exercise.py)
- Template:
  - [README.template.md](./resources/templates/README.template.md)
  - [INSTALL.template.md](./resources/templates/INSTALL.template.md)
  - [makefile.template](./resources/templates/makefile.template)
  - [function.h.template](./resources/templates/function.h.template)
  - [function.cpp.template](./resources/templates/function.cpp.template)
  - [main.cpp.template](./resources/templates/main.cpp.template)
