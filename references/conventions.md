# Convenzioni e Linee Guida per gli Esercizi di Informatica (papa_diemoz)

Questo documento riassume le convenzioni, le regole didattiche e i requisiti formali richiesti dal docente e applicati nel repository `papa_diemoz` dello studente Daniel Diemoz (classe 3B IT).

---

## 1. Struttura degli Esercizi: Progetto Informatico vs Singolo File

Il sistema supporta due modalità strutturali in base alla consegna del compito:

### Riconoscimento e Web Fetcher Automatico di Link Esterni
Se la consegna fa riferimento a siti web, guide o dispense esterne (es. `https://zitogiuseppe.com/...`), il sistema estrae in automatico gli URL con regex, scarica il contenuto HTML via HTTP/HTTPS, pulisce la pagina preservando tabelle, testo e frammenti di codice C++, e inietta il materiale direttamente nel contesto dell'intelligenza artificiale per adempiere a tutte le specifiche della fonte.

### Modalità A: Progetto Informatico Completo (Multi-File)
Richiesto per compiti formali di laboratorio, progetti strutturati o quando la consegna menziona "progetto", "skel", "makefile", "modulare".
- Cartella di progetto dedicata: `/home/d.diemoz/git/papa_diemoz/progetti/<nome_progetto>/`
- File obbligatori:
  1. `main.cpp`: funzione `main()`, gestione parametri (`argc`, `argv`), test.
  2. `function.h`: guards `#ifndef FUNCTION_H`, librerie standard, prototipi/classe.
  3. `function.cpp`: implementazione metodi della classe e funzioni ausiliarie.
  4. `makefile`: compilazione separata a moduli con TAB.
  5. `INSTALL.md`: istruzioni di installazione e test.
  6. `README.md` & `README.pdf`: relazione completa.
  7. `COPYING` & `gpl-3.0.txt`: licenza GPL v3.

### Modalità B: Singolo File C++
Richiesto quando la consegna richiede "un solo file", "singolo file", "in un unico file .cpp", "un file solo", "tutto in main.cpp".
- File sorgente unico: `main.cpp` contenente l'intero programma funzionante (inclusioni, prototipi helper, definizione classe con `private:` e `public:`, prototipi funzioni globali, `main()`, implementazione metodi `NomeClasse::metodo()` e funzioni helper).
- `makefile`: per compilazione diretta `g++ -Wall -Wconversion main.cpp -o a.out`.
- `INSTALL.md` & `README.md`: relazione adattata al formato su singolo file.

---

## 3. Standard d'Oro della Relazione (Il Compito da 10 in references/compito/)

La relazione (`README.md`) deve seguire **AL 100%** lo stile, il tono e la struttura del compito reale di classe che ha ottenuto la votazione massima di **10** (presente in `references/compito/README.md`):

### Struttura Obbligatoria del README.md:
1. **Intestazione minima**:
   ```markdown
   >Nome Cognome  
   4bit

   # Compito di informatica del DD/MM/YYYY

   ## Svolgimento
   ```
   *Niente sezioni "Consegna", niente caselle o etichette artificiali.*

2. **Creazione Progetto**:
   ```markdown
   ### Creare un progetto informatico con file necessari e un solo main.cpp

   Creo il nuovo progetto con i relativi file necessari:

   ```
   compito17@ltsp42:~$ mkdir <nome_progetto>
   compito17@ltsp42:~$ cd <nome_progetto>/
   compito17@ltsp42:~/<nome_progetto>$ touch README.md main.cpp INSTALL.md makefile
   ```
   ```

3. **Creazione del makefile**:
   ```markdown
   ### Creare un makefile con target `a.out, run e clean`

   ```makefile
   # makefile

   a.out: main.cpp
   	g++ -Wall -Wconversion main.cpp

   run: a.out 
   	./a.out <parametri se necessari>

   clean: 
   	rm -rf a.out
   ```
   Siccome ho riportato il contenuto del makefile a programma terminato, il target `run` è già adattato alle esigenze del software (<spiegazione parametri>).
   ```

4. **Test preliminare dei parametri (se usa argc/argv)**:
   ```markdown
   ### Testare il programma con output e stampa parametri passati
   ```

5. **Svolgimento incrementale**:
   ```markdown
   ### Modificare il progetto creato

   #### Fare in modo che il programma gestisca la classe/struttura ...
   Creo la classe:
   ...
   Compilo:
   ...
   Nessun errore.

   #### Creare il metodo/funzione ...
   ##### Prototipo
   ##### Implementazione
   ##### Utilizzo
   ##### La testo
   ...
   Funziona.
   ```

6. **Allegati**:
   Solo per eventuali procedure ausiliarie (come la stampa a video):
   ```markdown
   ## Allegati

   ### Funzione stampa
   #### Prototipo
   #### Implementazione
   #### Utilizzo
   ```

### Divieti Assoluti:
- **NO** sezione `## Fonti`
- **NO** sezione `## Problemi riscontrati`
- **NO** tag HTML `<style>` o colori CSS artificiali
- **NO** preamboli accademici generati dall'AI ("In base ai requisiti dell'esercizio...")
- **NO** `INSTALL.md` duplicato nel README (il file `INSTALL.md` è vuoto o minimale).

### Regole Tassative per le Classi (Programma Aggiornato)
Le classi in C++ vanno implementate **ESATTAMENTE E SOLO NEL SEGUENTE STILE DIDATTICO**:

```cpp
// 1. Prototipi funzioni helper get_...
int get_casuale(int da, int a);
string get_nome(string domanda);
string get_razza(string domanda);
char get_genere(string domanda);

// 2. Definizione Classe
class animale {
	private:
		string nome;
		string razza;
		int anno_nascita; 
		char genere;
	public:
		animale() {
			// Costruttore di default: inizializzazione attributi con this-> obbligatorio
			this->nome = get_nome("Dimmi il nome: ");
			this->anno_nascita = get_casuale(2015, 2020);
			this->razza = get_razza("Razza animale: ");
			this->genere = get_genere("Genere animale: ");
		}
		void stampa();
};

// 3. Prototipi funzioni ausiliarie per array di oggetti
void stampa(animale a[], int n);
void riempi(animale a[], int n);

// 4. Implementazione del metodo della classe FUORI dalla classe
void animale::stampa() {
	cout << "===== Animale =========" << endl;
	cout << "  Nome: " << this->nome << endl;
	cout << "  Nato: " << this->anno_nascita << endl;
	cout << " Razza: " << this->razza << endl;
	cout << "Genere: " << this->genere << endl;		
}

// 5. Funzione globale di stampa array
void stampa(animale a[], int n) {
	for(int i=0; i<n; i++) {
		a[i].stampa();
	}
}
```

- **Attributi `private:`**: tutti i membri dati dell'oggetto.
- **Metodi `public:`**: costruttore `NomeClasse()` e firme dei metodi.
- **`this->` esplicito**: sia nel costruttore che dentro l'implementazione dei metodi fuori dalla classe (`void NomeClasse::stampa()`).
- **Array di oggetti**: gestiti con array C standard (`animale a[n];`) e stampati con funzione globale `stampa(a, n)` che itera e invoca `a[i].stampa()`.
- **Divieti rigorosi**: NO ereditarietà, NO template, NO virtual/polimorfismo, NO smart pointers, NO `<vector>` o `<algorithm>`.

### Nuove Nozioni Lezione del 16/10/2026 (Inizializzatori, Inline, Puntatori ->, new/delete, .gitignore)
Nella lezione del 16/10/2026 il programma didattico sulle classi è progredito introducendo:
1. **Inizializzatori nei Costruttori**:
   Uso della lista di inizializzatori dopo i `:` per inizializzare in modo efficiente i dati membro:
   ```cpp
   complesso(double r, double i) : reale(r), immaginario(i) {}
   complesso() : reale(0.0), immaginario(0.0) {}
   complesso(const complesso& z) : reale(z.reale), immaginario(z.immaginario) {}
   ```
2. **Metodi `inline`**:
   Metodi concisi implementati direttamente nella definizione della classe per agevolare l'ottimizzazione del compilatore (es. operazioni algebriche, getter e metodi di stampa).
3. **Puntatori a Istanze di Classe, `new`, `delete` e Operatore Freccia `->`**:
   - Creazione dinamica sullo heap: `complesso *p = new complesso(1.0, 2.0);`
   - Accesso a metodi e campi tramite freccia: `p->stampa();`
   - Deallocazione esplicita per liberare memoria: `delete p;`
4. **Ruolo del File `.gitignore`**:
   - Prevenire il commit di file compilati ed eseguibili dipendenti dall'architettura (`a.out`, `*.o`, `*.exe`, `*~`, `.vscode/`).
5. **Rigoroso Uso dell'Italiano per Classi, Metodi e Proprietà**:
   - Quando si prendono esercizi da dispense o siti esterni (es. Giuseppe Zito):
     Tradurre sempre tutto in italiano: `complesso`, `reale`, `immaginario`, `somma`, `sottrai`, `moltiplica`, `dividi`, `uguale`, `stampa`, `parte_reale`, `parte_immaginaria`.

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
