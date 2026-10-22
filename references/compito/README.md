>Daniel DIemoz  
4bit

# Compito di informatica de 13/10/2026

## Svolgimento

### Creare un progetto informatico con file necessari e un solo main.cpp

Creo il nuovo progetto con i relativi file necessari:

```
compito17@ltsp42:~$ mkdir compito
compito17@ltsp42:~$ cd compito/
compito17@ltsp42:~/compito$ touch README.md main.cpp INSTALL.md makefile
```

### Creare un makefile con target `a.out, run e clean`

```makefile
# makefile

a.out: main.cpp
	g++ -Wall -Wconversion main.cpp

run: a.out 
	./a.out 10 animali.csv

clean: 
	rm -rf a.out
```
Siccome ho riportato il contenuto del makefile a programma terminato, il target `run` è già adattato alle esigenze del software (numero di animali e nome file).


### Testare il programma con output e stampa parametri passati

```c++
int main(int argc, char ** argv) {
    cout << "===Parametri da linea di comando===" << endl;
    cout << "N: " << argc << endl;
    for (int i = 0; i < argc; i++) {
        cout << "Parametro numero " << i+1 << ": "<< argv[i] << endl;
    }

    cout << "Buon anno scolastico 4bit!" << endl;

    return 0;
}
```

Compilo ed eseguo:

```bash
compito17@ltsp42:~/compito$ make
g++ -Wall -Wconversion main.cpp
compito17@ltsp42:~/compito$ ./a.out a 1 4 6 hgfd ads
===Parametri da linea di comando===
N: 7
Parametro numero 1: ./a.out
Parametro numero 2: a
Parametro numero 3: 1
Parametro numero 4: 4
Parametro numero 5: 6
Parametro numero 6: hgfd
Parametro numero 7: ads

Buon anno scolastico 4bit!
```
### Modificare il progetto creato

#### Fare in modo che il programma gestisca una struttura animale

Creo la struttura:

```c++
struct animale {
    string nome,razza;
    int anno_nascita;
};
```

Compilo:

```bash
compito17@ltsp42:~/compito$ make
g++ -Wall -Wconversion main.cpp
```

Nesun errore.

#### Creare una funzione che restituisce un animale casuale

Creo la funzione `get_animale()`:

##### Prototipo

```c++
animale get_animale();
```

##### Implementazione

```c++
animale get_animale() {
    animale ans;
    string nomi[] = {"Fufi", "Bao", "Miao", "Mirtillo", "Pippo"};
    int n = sizeof(nomi)/sizeof(nomi[0]);
    ans.nome = nomi[rand()% (n)];
    string razze[] = {"Bodercolli", "Segugio", "Bassotto", "Labrador"};
    n = sizeof(razze)/sizeof(razze[0]);
    ans.razza = razze[rand()% (n)];
    ans.anno_nascita = rand()% (2020-2010+1) + 2010;
    return ans;
}
```


##### Utilizzo

```c++
animale a = get_animale();
stampa(a);
```

##### La testo
```bash
compito17@ltsp42:~/compito$ make run 
g++ -Wall -Wconversion main.cpp
./a.out
===Parametri da linea di comando===
N: 1
Parametro numero 1: ./a.out
=====Animale=====
 Nome: Mirtillo
Razza: Bassotto
 Anno: 2016
```
Ho utilizzato la procedura `stampa()`, vedi `allegati`.


#### Creare un vettore di `n` animali (numero passato da parametro)

Controllo che i parametri siano 2 altrimenti stampo un errore:

```c++
if (argc != 2 ) {
        cout << "Parametri errati: sintassi corretta --> `a.out` [numero di animali]" << endl;
    }
    else {
        int n = stoi(argv[1]);
        ...
    }
```

creo il vettore:

```c++
animale v[n];
```

lo riempo con animali casuali:

```c++
for (int i = 0; i < n; i++) {
    v[i] = get_animale();
}
```

Compilo tutto:

```bash
compito17@ltsp42:~/compito$ make
g++ -Wall -Wconversion main.cpp
```

Nessun errore anche se non ho provato a stampare il contenuto del vettore... ma lo faccio ora con il prossimo punto della consegna.

#### Utilizzando funzioni/procedure 

##### Stampare il vettore a schermo 

Utilizzo la funzione stampa() che riporto in `allegati`:

```c++
for (int i = 0; i < n; i++) {
    stampa(v[i]);
}
```

Compilo ed eseguo:

```bash
compito17@ltsp42:~/compito$ make
g++ -Wall -Wconversion main.cpp
compito17@ltsp42:~/compito$ ./a.out 4
===Parametri da linea di comando===
N: 2
Parametro numero 1: ./a.out
Parametro numero 2: 4
=====Animale=====
 Nome: Miao
Razza: Bassotto
 Anno: 2011
=====Animale=====
 Nome: Fufi
Razza: Labrador
 Anno: 2013
=====Animale=====
 Nome: Pippo
Razza: Bassotto
 Anno: 2012
=====Animale=====
 Nome: Miao
Razza: Bassotto
 Anno: 2011
```

Funziona.

##### Salvare il vettore in un file con campi separati da `,` e nome file passato da linea di comando

Includo la libreria per gestire operazioni di i/o su file:

```
#include <fstream>
```

Prendo il nome del file dal 3 parametro e cambio numero di parametri necessari per far funzionare il programma:

```c++
    if (argc != 3 ) {
        cout << "Parametri errati: sintassi corretta --> `a.out` [numero di animali]" << endl;
    }
    else
        string nome_file = argv[2];
```


Creo una funzione salva():

###### Prototipo

```c++
void salva(string, int, animale*);
```

###### Implementazione

```c++
void salva(string nome_file, int n, animale v[]) {
    char ans;
    ifstream f(nome_file);
    if (f.is_open()) {
        cout << "ATTENZIONE - File: " << nome_file << " già esistente, vuoi sovrascriverlo? S/n: ";
        cin >> ans;
        if (ans == 'n'){
            cout << "Inserisci il nome del file in cui inserire gli animali: ";
            cin >> nome_file;
        }
    }
    f.close();

    ofstream fout(nome_file);
    if (!fout.is_open()) {
        cout << "Errore nell'apertura del file: " << nome_file << endl;
    }
    else {
        fout << "nome,razza,anno_nascita" << endl;
        for (int i = 0; i < n; i++) {
            fout << v[i].nome << ",";
            fout << v[i].razza << ",";
            fout << v[i].anno_nascita;
            fout << endl;
        }
        f.close();
    cout << "Dati salvati correttamente nel file: " << nome_file << endl;
    }    
}
```

###### Utilizzo

```c++
salva(nome_file,n,v);
```

###### La testo

```bash
compito17@ltsp42:~/compito$ make run
g++ -Wall -Wconversion main.cpp
./a.out 10 animali.csv
===Parametri da linea di comando===
N: 3
Parametro numero 1: ./a.out
Parametro numero 2: 10
Parametro numero 3: animali.csv
=====Animale=====
 Nome: Miao
Razza: Bodercolli
 Anno: 2015

...
...

=====Animale=====
 Nome: Bao
Razza: Segugio
 Anno: 2018
=====Animale=====
 Nome: Fufi
Razza: Labrador
 Anno: 2018
ATTENZIONE - File: animali.csv già esistente, vuoi sovrascriverlo? S/n: n
Inserisci il nome del file in cui inserire gli animali: animali2.csv
Dati salvati correttamente nel file: animali2.csv
```
funziona.

Provo anche con file non esistente:

```bash
compito17@ltsp42:~/compito$ rm animali.csv 
compito17@ltsp42:~/compito$ make run 
./a.out 10 animali.csv
===Parametri da linea di comando===
N: 3
Parametro numero 1: ./a.out
Parametro numero 2: 10
Parametro numero 3: animali.csv
=====Animale=====
 Nome: Mirtillo
Razza: Bassotto
 Anno: 2014

...
...

=====Animale=====
 Nome: Mirtillo
Razza: Bodercolli
 Anno: 2017
Dati salvati correttamente nel file: animali.csv
```

Funziona

Contenuto del file creato:

```bash
compito17@ltsp42:~/compito$ ls
animali2.csv  animali.csv  a.out  INSTALL.md  main.cpp  makefile  README.md  record.csv
compito17@ltsp42:~/compito$ more animali2.csv 
nome,razza,anno_nascita
Miao,Bodercolli,2015
Miao,Bodercolli,2020
Mirtillo,Labrador,2018
Fufi,Bassotto,2017
Fufi,Bodercolli,2016
Fufi,Bassotto,2018
Fufi,Labrador,2014
Fufi,Segugio,2012
Bao,Segugio,2018
Fufi,Labrador,2018
```

Confermo, senza riportare un'altra esecuzione del programma, che funziona anche inserendo `S`, il comando per sovrascrivere il file anche se esistente 


## Allegati

### Funzione stampa

#### Prototipo

```c++
void stampa(animale);
```

#### Implementazione

```c++
void stampa(animale a) {
    cout << "=====Animale=====" << endl;
    cout << " Nome: " << a.nome << endl;
    cout << "Razza: " << a.razza << endl;
    cout << " Anno: " << a.anno_nascita << endl;
}
```

#### Utilizzo

```c++
for (int i = 0; i < n; i++) {
    stampa(v[i]);
}
```