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
./a.out {PARAMETRI_ESECUZIONE}
```

Oppure:

```
make run
```

# RISULTATO ATTESO

Dovresti ottenere un output simile al seguente:

```
{OUTPUT_ATTESO}
```

# PULIZIA

Per rimuovere i file oggetto `.o`, l'eseguibile `a.out` ed eventuali file generati:

```
make clean
```

# DOCUMENTAZIONE

Per generare il file `README.pdf` a partire dal `README.md` con pandoc:

```
make doc
```
