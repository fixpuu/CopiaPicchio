#include <iostream>
#include <fstream>
using namespace std;

struct animale {
    string nome,razza;
    int anno_nascita;
};

animale get_animale();
void stampa(animale);
void salva(string, int, animale*);
int main(int argc, char ** argv) {
    srand((unsigned int)time (NULL));
    if (argc != 3 ) {
        cout << "Parametri errati: sintassi corretta --> `a.out` [numero di animali]" << endl;
    }
    else {
        int n = stoi(argv[1]);
        string nome_file = argv[2];
        cout << "===Parametri da linea di comando===" << endl;
        cout << "N: " << argc << endl;
        for (int i = 0; i < argc; i++) {
            cout << "Parametro numero " << i+1 << ": "<< argv[i] << endl;
        }
        animale v[n];
        for (int i = 0; i < n; i++) {
            v[i] = get_animale();
        }

        for (int i = 0; i < n; i++) {
            stampa(v[i]);
        }

        salva(nome_file,n,v);
        
        
        }
    return 0;

}

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

void stampa(animale a) {
    cout << "=====Animale=====" << endl;
    cout << " Nome: " << a.nome << endl;
    cout << "Razza: " << a.razza << endl;
    cout << " Anno: " << a.anno_nascita << endl;
}

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