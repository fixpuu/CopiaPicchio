> Autore: Daniel Diemoz  
> Classe: 3B IT  
> Data: {DATA}

# {TITOLO_DOCUMENTO}

## Argomenti trattati

{ARGOMENTI_TRATTATI}

## Consegna

{CONSEGNA}

## Svolgimento

### Creare un progetto

Parto dalla skel e creo il nuovo progetto `{NOME_PROGETTO}`:

```
d.diemoz@ltsp42:~/git/papa_diemoz/progetti$ cp -ai skel/ {NOME_PROGETTO}
```

{SVOLGIMENTO_PASSAGGI}

## Test finale ed esecuzione

Eseguo la compilazione completa e testo il programma:

```
d.diemoz@ltsp42:~/git/papa_diemoz/progetti/{NOME_PROGETTO}$ make clean
rm -f *.o a.out
d.diemoz@ltsp42:~/git/papa_diemoz/progetti/{NOME_PROGETTO}$ make
g++ -Wall -Wconversion -c function.cpp
g++ -Wall -Wconversion -c main.cpp
g++ -Wall -Wconversion function.o main.o
d.diemoz@ltsp42:~/git/papa_diemoz/progetti/{NOME_PROGETTO}$ make run
{OUTPUT_TEST_FINALE}
```

Funziona.

## Allegati

### makefile

```makefile
{MAKEFILE_CONTENT}
```

### INSTALL.md

```markdown
{INSTALL_CONTENT}
```

### function.h

```cpp
{FUNCTION_H_CONTENT}
```

### function.cpp

```cpp
{FUNCTION_CPP_CONTENT}
```

### main.cpp

```cpp
{MAIN_CPP_CONTENT}
```

## Fonti

{FONTI}

## Problemi riscontrati

{PROBLEMI_RISCONTRATI}

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
