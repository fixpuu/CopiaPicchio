# Esempio di Riferimento: Esercizio `ripasso_vettori`

Questo esempio mostra come trasformare una consegna e argomenti trattati in un esercizio completo secondo le convenzioni esatte di `papa_diemoz`.

---

## Input Iniziale

### Argomenti trattati
> Ripasso su progetto informatico, compilazione con makefile, funzioni e prototipi in C++, gestione vettori, numeri casuali, file stream in lettura e scrittura (`fstream`), algoritmi di ordinamento (Bubble Sort), prevenzione warning con `-Wall -Wconversion`.

### Consegna
> Creare un progetto informatico con relativo makefile e istruzioni per compilare ed eseguire un programma che stampa a video la scritta: `Ho studiato informatica tutta l'estate!`. Modificando il progetto creato fare in modo che il programma generi `n` (chiesto all'utente) numeri interi casuali tra -1000 e + 1000, li inserisca in un vettore di interi e li salvi in un file (un numero per riga). Realizzare le seguenti funzioni sul vettore di interi: 1) Calcolo della media; 2) Calcolo del minimo; 3) Calcolo del massimo; 4) Ordinamento crescente; 5) Stampare il vettore. Mostrare la compilazione, esecuzione e i risultati ottenuti.

---

## 1. Decomposizione dei Passaggi (Indice dello Svolgimento)

La consegna viene suddivisa esattamente nei seguenti passaggi logici:
1. `Creare un progetto` (copia dalla `skel/` a `ripasso_vettori`)
2. `Con relativo makefile`
3. `Istruzioni per compilare ed eseguire`
4. `Che stampi a schermo la stringa` (prima versione di test)
5. `Modificando il progetto creato`:
   - `Generare n numeri interi casuali tra -1000 e + 1000` (`get_casuale`)
   - `Inserirli in un vettore di interi` (`riempi`)
   - `Salvarli in un file (un numero per riga)` (`salva_file`)
   - `Funzioni richieste sul vettore`:
     - 1) `Calcolo della media` (`calcola_media`)
     - 2) `Calcolo del minimo` (`calcola_minimo`)
     - 3) `Calcolo del massimo` (`calcola_massimo`)
     - 4) `Ordinamento crescente` (`ordina_crescente` / Bubble Sort)
     - 5) `Stampare il vettore` (`stampa`)
6. `Test` (compilazione pulita, esecuzione reale, verifica file generato `numeri.txt`)

---

## 2. Dettaglio Funzioni Sviluppate

### `int get_casuale(int da, int a)`
- **Prototipo** in `function.h`:
  ```cpp
  int get_casuale(int da, int a);
  ```
- **Implementazione** in `function.cpp`:
  ```cpp
  int get_casuale(int da, int a) {
      return rand() % (a - da + 1) + da;
  }
  ```
- **Utilizzo** nel `main.cpp`:
  ```cpp
  int a = get_casuale(-1000, 1000);
  ```
- **Test con prompt realistico**:
  ```
  d.diemoz@ltsp42:~/git/papa_diemoz/progetti/ripasso_vettori$ make run
  ./a.out 4
  Numero casuale: 690
  ...
  Funziona.
  ```

### `double calcola_media(int v[], int n)`
- Attenzione a `-Wconversion`:
  ```cpp
  double calcola_media(int v[], int n) {
      if (n <= 0) return 0.0;
      double somma = 0.0;
      for (int i = 0; i < n; i++) {
          somma += (double)v[i];
      }
      return somma / (double)n;
  }
  ```

---

## 3. Gestione Compilatore e Warning
- Per inizializzare il generatore casuale nel `main()`:
  ```cpp
  srand((unsigned int)time(NULL));
  ```
  *(Senza `(unsigned int)` il compilatore `g++ -Wconversion` genera un warning!)*

---

## 4. Generazione del PDF con Pandoc
```bash
make doc
# esegue: pandoc -o README.pdf README.md
```
Il PDF risultante è pronto per essere stampato e consegnato al docente.
