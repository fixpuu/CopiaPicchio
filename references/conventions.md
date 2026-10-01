# Convenzioni e Linee Guida per gli Esercizi di Informatica (papa_diemoz)

Questo documento riassume le convenzioni, le regole didattiche e i requisiti formali richiesti dal docente e applicati nel repository `papa_diemoz` dello studente Daniel Diemoz (classe 3B IT).

---

## 1. Struttura dei Progetti

Ogni esercizio è un progetto software autocontenuto posizionato nella directory:
`/home/d.diemoz/git/papa_diemoz/progetti/<nome_progetto>/`

### Regole per il nome della directory del progetto
- Tutto in minuscolo.
- Parole separate da underscore (`_`).
- Nessun carattere speciale o spazio.
- Esempi: `ripasso_vettori`, `ordinamento`, `estrazioni`, `cifratura`, `exception`, `concetti`.

### File obbligatori in ogni progetto
1. `main.cpp`: contiene la funzione `main()`, la gestione dei parametri da linea di comando (`argc`, `argv`), l'interfaccia utente/chiamate di test.
2. `function.h`: file header con include guards, inclusioni librerie standard, `using namespace std;` e prototipi di tutte le funzioni ausiliarie.
3. `function.cpp`: implementazione di tutte le funzioni dichiarate in `function.h`.
4. `makefile`: target `a.out`, `function.o`, `main.o`, `clean`, `run`, `doc`.
5. `INSTALL.md`: istruzioni per compilazione manuale, make, esecuzione, output atteso, pulizia e generazione documentazione.
6. `README.md`: relazione completa dell'esercizio strutturata secondo il modello scolastico.
7. `README.pdf`: versione PDF compilata tramite pandoc (`make doc`).
8. `COPYING`: file con richiamo alla licenza GPL v3.
9. `gpl-3.0.txt`: testo completo della GNU GPL v3 (ereditato da `skel/`).

---

## 2. Standard di Codifica C++

Il docente applica verifiche rigorose e compila con:
```bash
g++ -Wall -Wconversion
```

### Regole tassative nel codice
1. **Zero Warning con `-Wconversion`**:
   - `srand((unsigned int)time(NULL));` -> il cast a `unsigned int` è obbligatorio perché `time()` restituisce `time_t` (`long int`).
   - Operazioni aritmetiche su tipi misti: esplicitare sempre i cast (es. `(double)somma / (double)n;`, `(int)dim`).
   - Non mischiare `int` con indici `size_t` senza cast o dichiarare gli indici del tipo corretto.
2. **Include Guards in `function.h`**:
   Seguire la convenzione utilizzata nei progetti:
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
   ...

   #endif
   ```
3. **Gestione di `argc` e `argv`**:
   - Se l'esercizio richiede argomenti da terminale, verificare sempre che `argc` sia pari al numero atteso.
   - In caso di errore: stampare su `cerr` spiegando l'errore e mostrando l'uso corretto (es. `cerr << "Utilizzo corretto: ./a.out <input> <output>" << endl;`).
   - Restituire codici di uscita distinti per ogni tipologia di errore (`return 1;`, `return 2;`, ecc.) verificabili da shell con `echo $?`.
4. **Sicurezza nella gestione dei file (I/O)**:
   - **Controllo file di output**: prima di scrivere in un file di destinazione, verificare se esiste già aprendolo con `ifstream`. Se `is_open()`, segnalare l'errore e NON sovrascriverlo per sicurezza (spesso con `return 2;`), a meno che la consegna non richieda diversamente.
   - **Controllo file di input**: verificare sempre `if (!f_in.is_open())` e stampare errore su `cerr` (es. `return 3;`).
   - **Lettura CSV**: utilizzare `getline(f, s, ',')` per i campi intermedi e `getline(f, s)` per l'ultimo campo della riga, convertendo i tipi con `stoi()`, `stod()`.
5. **Formattazione output a video**:
   - Intestazioni con sezioni chiare:
     ```text
     ===== Numeri generati =====
     ===== Vettore ordinato =====
     ======== Alunno ========
     ```
   - Separatori puliti con virgole o newline leggibili.

---

## 3. Makefile

Il makefile deve essere formattato correttamente con caratteri TAB per le indentazioni dei comandi:
```makefile
#makefile

a.out: function.o main.o
	g++ -Wall -Wconversion function.o main.o

function.o: function.cpp function.h
	g++ -Wall -Wconversion -c function.cpp

main.o: function.h main.cpp
	g++ -Wall -Wconversion -c main.cpp

clean:
	rm -f *.o a.out <file_generati_da_rimuovere>

run: a.out
	./a.out <parametri_predefiniti>

doc:
	pandoc -o README.pdf README.md
```

---

## 4. Struttura del file `INSTALL.md`

Il file `INSTALL.md` segue uno schema ben definito:
```markdown
# COMPILAZIONE

Per compilare esegui i seguenti comandi:

```
g++ -Wall -Wconversion -c main.cpp 
g++ -Wall -Wconversion -c function.cpp 
g++ -Wall -Wconversion main.o function.o 
```

Oppure, per i pigri, esegui:

```
make
```
e il programma si compilerà in automatico.

# ESECUZIONE

Per eseguire il software:

```
./a.out <eventuali_argomenti>
```

Oppure:

```
make run
```

# RISULTATO ATTESO

Dovresti ottenere un output simile al seguente:

```
<output reale della sessione>
```

# PULIZIA

Per rimuovere i file oggetto `.o`, l'eseguibile `a.out` e i file temporanei:

```
make clean
```

# DOCUMENTAZIONE

Per generare il file `README.pdf` a partire dal `README.md` con pandoc:

```
make doc
```
```

---

## 5. Struttura del file `README.md` (Relazione dell'Esercizio)

Il `README.md` è il documento fondamentale che viene stampato o esportato in PDF per il docente. Deve replicare fedelmente lo stile di Daniel Diemoz:

1. **Intestazione con metadati**:
   ```markdown
   > Autore: Daniel Diemoz  
   > Classe: 3B IT  
   > Data: DD/MM/YYYY

   # Esercizi di informatica assegnati il DD/MM/YYYY
   ```
   *(oppure `# Ripasso di informatica del DD/MM/YYYY - <Argomento>` o `# Compito di informatica del DD/MM/YYYY`)*

2. **`## Argomenti trattati`**:
   - Sintesi puntuale e didattica di quanto svolto/spiegato in aula o in laboratorio.
   - Contesti tipici: ambiente LTSP Debian della scuola, uso di git/gitlab, terminale bash, compilazione separata, flag `-Wall -Wconversion`, algoritmi di ordinamento, gestione eccezioni `try/catch`, allocazione memoria, puntatori/strutture, file csv, ecc.

3. **`## Consegna`**:
   - Testo letterale della consegna assegnata.

4. **`## Svolgimento`**:
   - **Regola cardine**: "Leggere la consegna e tradurla in passaggi con titolo opportuno. L'indice della soluzione. Svolgere i punti".
   - Si creano sezioni `### Titolo del passaggio` per ogni singola frase o requisito della consegna.
   - Se si parte da zero: comando di copia iniziale dalla `skel`:
     ```
     d.diemoz@ltsp...:~/git/papa_diemoz/progetti$ cp -ai skel/ <nome_progetto>
     ```
   - Per ciascuna funzione o componente sviluppata:
     - `#### Prototipo`: dichiarazione in `function.h`.
     - `#### Implementazione`: corpo del codice in `function.cpp`.
     - `#### Utilizzo`: frammento del `main.cpp` che richiama la funzione.
     - `#### La testo` / `#### Test`: blocco di codice con prompt di shell realistico (`daniel@daniel:...$ make run` o `./a.out`), esecuzione e output.
     - Commento conclusivo: `Funziona.` o spiegazione breve del risultato.

5. **`## Fonti`**:
   - Elenco delle risorse consultate (dispense del docente, w3schools, geeksforgeeks, man pages, standard c++).

6. **`## Allegati`**:
   - Riporto del codice completo o dei file di supporto (`makefile`, `INSTALL.md`, file `.csv` o `.txt`, `main.cpp`, `function.h`, `function.cpp`).

7. **`## Problemi riscontrati`** (oppure `## Problemi riscontrati:`):
   - Riflessioni oneste sui passaggi critici: warning del compilatore risolti (es. `-Wconversion` con `time()`), delimitatori CSV, gestione delle eccezioni o comportamenti del terminale.

8. **CSS per pandoc** (in fondo al documento):
   ```html
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
