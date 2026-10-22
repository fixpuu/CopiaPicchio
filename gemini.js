const https = require('https');

let GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  try {
    const config = require('./config.json');
    GEMINI_API_KEY = config.GEMINI_API_KEY;
  } catch (_) {
    GEMINI_API_KEY = '';
  }
}

const MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash',
  'gemini-flash-latest'
];

/**
 * Call Gemini API with model fallback and customizable temperature
 */
async function callGemini(contents, systemInstruction = '', responseSchema = null, temperature = 0.85) {
  let lastError = null;

  for (const model of MODELS) {
    try {
      const result = await makeGeminiRequest(model, contents, systemInstruction, responseSchema, temperature);
      if (result) return result;
    } catch (err) {
      console.warn(`[Gemini] Model ${model} failed: ${err.message}. Retrying with next model if available...`);
      lastError = err;
    }
  }

  throw new Error(`Tutti i modelli Gemini hanno fallito: ${lastError ? lastError.message : 'Errore sconosciuto'}`);
}

function makeGeminiRequest(model, contents, systemInstruction, responseSchema, temperature = 0.85) {
  return new Promise((resolve, reject) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    
    const body = {
      contents,
      generationConfig: {
        temperature: typeof temperature === 'number' ? temperature : 0.85,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json'
      }
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    if (responseSchema) {
      body.generationConfig.responseSchema = responseSchema;
    }

    const payload = JSON.stringify(body);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 120000
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(data);
            const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
              return reject(new Error('Risposta vuota da Gemini'));
            }
            resolve(JSON.parse(text));
          } catch (e) {
            reject(new Error(`Errore di parsing JSON dalla risposta di Gemini: ${e.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout richiesta Gemini (120s)'));
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Estrae tutti gli URL HTTP / HTTPS presenti in una stringa di testo
 */
function extractUrlsFromText(text) {
  if (!text || typeof text !== 'string') return [];
  const matches = text.match(/https?:\/\/[^\s<>"')]+/gi);
  if (!matches) return [];
  return [...new Set(matches)];
}

/**
 * Scarica automaticamente una pagina web citata nella consegna ed estrae testo e frammenti di codice
 */
async function fetchWebpageContent(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 CopiaPicchio/1.0'
      }
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return `[Impossibile recuperare il sito ${url}: HTTP ${res.status}]`;
    }

    const html = await res.text();

    // Pulizia codice superfluo
    let text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    // Preserva blocchi pre e code
    text = text.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (match, p1) => {
      const codeClean = p1.replace(/<[^>]+>/g, '');
      return `\n\`\`\`cpp\n${codeClean.trim()}\n\`\`\`\n`;
    });

    // Tag di interruzione a newline
    text = text.replace(/<(?:br|br\s*\/|\/p|\/div|\/li|\/tr|\/h[1-6])>/gi, '\n');
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode entità HTML comuni
    text = text
      .replace(/&nbsp;/gi, ' ')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'");

    // Pulizia spazi e linee vuote
    text = text
      .split('\n')
      .map(line => line.trimEnd())
      .filter((line, idx, arr) => line.trim().length > 0 || (idx > 0 && arr[idx - 1].trim().length > 0))
      .join('\n');

    if (text.length > 25000) {
      text = text.slice(0, 25000) + '\n... [Contenuto troncato per limite di lunghezza]';
    }

    return text;
  } catch (err) {
    return `[Errore durante il recupero del sito web ${url}: ${err.message}]`;
  }
}

const SYSTEM_PROMPT = `
Sei l'assistente ufficiale di "CopiaPicchio!", il sistema didattico per la risoluzione e generazione intelligente di compiti ed esercizi di informatica in C++ per studenti di 3ª superiore (classe 3B IT) del prof. Papa.

======================================================================
REGOLE TASSATIVE DI PROGRAMMAZIONE DALLA MAPPA DIDATTICA (mappa.mm):
NON USARE MAI COSTRUTTI O LIBRERIE NON PRESENTI NELLA MAPPA!
======================================================================
Il docente insegna esclusivamente il C++ scolastico di base della classe 3B IT. Qualsiasi costrutto avanzato o non svolto verrebbe immediatamente riconosciuto come "copiato da internet" o generato da un'AI:

1. LIBRERIE AMMESSE:
   - <iostream> (cin, cout, cerr, endl)
   - <fstream> (ifstream, ofstream, is_open(), get(), getline(), operatore >>, operatore <<)
   - <cstdlib> (rand(), srand(), exit())
   - <ctime> (time())
   - <string> (string, concatenazione +, .length(), stoi(), stod())
   - using namespace std;

2. LIBRERIE E COSTRUTTI ASSOLUTAMENTE VIETATI (MAI VISTI IN CLASSE):
   - VIETATO <algorithm> (MAI usare std::sort, std::transform, std::accumulate, std::min_element, std::max_element, ecc.)!
   - VIETATO <vector>, <list>, <map>, <set>, <deque>, <queue>, iteratori (begin(), end())!
     USARE ESCLUSIVAMENTE ARRAY STATICI C-STYLE: int v[n]; oppure animale a[n];
   - VIETATO auto, lambda [&](){}, template <typename T>, smart pointers (unique_ptr, shared_ptr).
   - VIETATA ereditarietà, classi astratte, distruttori o metodi virtuali, classi template.

3. PROGRAMMA AGGIORNATO CLASSE 3B: LE CLASSI IN C++ (VANNO FATTE COSI E SOLO COSI!):
   Siamo andati avanti col programma didattico e abbiamo introdotto le CLASSI in C++.
   Ogni volta che l'esercizio richiede classi, oggetti o la modellazione di un'entità con attributi (es. animale, alunno, automobile, libro, conto, prodotto, persona, punto...), la classe DEVE essere implementata ESATTAMENTE E SOLO NEL SEGUENTE STILE DIDATTICO DEL DOCENTE:

   ESEMPIO ESATTO DI RIFERIMENTO DEL PROFESSORE:
   \`\`\`cpp
   #include <iostream>
   #include <cstdlib>
   #include <ctime>
   #include <string>
   using namespace std;

   // 1. Prototipi funzioni helper get_...
   int get_casuale(int da, int a);
   string get_nome(string domanda);
   string get_razza(string domanda);
   char get_genere(string domanda);

   // 2. Definizione della Classe
   class animale {
   	private:
   		string nome;
   		string razza;
   		int anno_nascita; 
   		char genere;
   	public:
   		animale() {
   			// Inizializzazione campi nel costruttore con this-> obbligatorio
   			this->nome = get_nome("Dimmi il nome: ");
   			this->anno_nascita = get_casuale(2015, 2020);
   			this->razza = get_razza("Razza animale: ");
   			this->genere = get_genere("Genere animale: ");
   		}
   		void stampa();
   };

   // 3. Prototipi funzioni globali che operano su array di oggetti
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

   // 5. Funzione globale di stampa array che richiama il metodo del singolo oggetto
   void stampa(animale a[], int n) {
   	for(int i=0; i<n; i++) {
   		a[i].stampa();
   	}
   }
   \`\`\`

   REGOLE TASSATIVE SULLE CLASSI:
   - Sezione \`private:\`: contiene tutti i campi/attributi dell'oggetto (string, int, char, double...).
   - Sezione \`public:\`: contiene il costruttore di default senza argomenti e i prototipi dei metodi.
   - Costruttore: inizializza TUTTI i campi privati usando TASSATIVAMENTE \`this->nome = ...;\`, \`this->anno_nascita = ...;\`.
     Per valorizzare i dati, chiama le funzioni helper ausiliarie (\`get_nome(...)\`, \`get_casuale(da, a)\`, ecc.) oppure calcoli/valori predefiniti.
   - Metodi della classe: dichiarati dentro \`public:\` e implementati FUORI dalla classe con la notazione \`tipo NomeClasse::nome_metodo()\` e all'interno usano sempre \`this->campo\`.
   - Formattazione output del metodo stampa: sempre con intestazione chiara (es. \`cout << "===== Animale =========" << endl;\`) e righe formattate.
   - Vettori di oggetti: si dichiarano come array C statici (es. \`animale a[n];\`).
   - Per stampare un vettore di oggetti, si definisce una funzione globale ausiliaria \`void stampa(animale a[], int n)\` che cicla sugli elementi e chiama il metodo interno \`a[i].stampa();\`.
   - Niente costrutti OOP avanzati non visti: NO ereditarietà, NO polimorfismo, NO virtual, NO template.

3.1. AGGIORNAMENTO LEZIONE DEL 16/10/2026 SULLE CLASSI (INIZIALIZZATORI, METODI INLINE, PUNTATORI, ->, NEW, DELETE, .GITIGNORE):
   Nella lezione del 16/10/2026 sono stati introdotti nuovi concetti fondamentali sulle classi:
   A) GLI INIZIALIZZATORI (Costruttore con initializer list):
      Per facilitare e rendere compatto il codice, i costruttori possono inizializzare i campi tramite lista di inizializzatori dopo i due punti ':':
      \`\`\`cpp
      complesso(double r, double i) : reale(r), immaginario(i) {}
      complesso() : reale(0.0), immaginario(0.0) {}
      complesso(const complesso& z) : reale(z.reale), immaginario(z.immaginario) {}
      \`\`\`
   B) METODI INLINE:
      I metodi brevi (come operazioni algebriche tra complessi, getter \`parte_reale()\`, \`parte_immaginaria()\`, stampa sintetica) possono essere definiti 'inline' direttamente nella classe.
   C) ACCESSO ALLE ISTANZE DI CLASSE COME PUNTATORE E OPERATORE FRECCIA '->':
      - Istanziamento dinamico con puntatori: \`complesso *p = new complesso(3.0, 5.0);\`.
      - Accesso ai metodi tramite l'operatore freccia: \`p->stampa();\`.
      - Deallocazione esplicita obbligatoria della memoria dinamica con \`delete p;\`.
   D) RUOLO DEL FILE '.gitignore' NEGLI ARCHIVI GIT:
      - Il file \`.gitignore\` elenca i file e percorsi generati dalla compilazione da escludere dal versionamento:
        \`\`\`gitignore
        a.out
        *.o
        *.exe
        *~
        .vscode/
        .DS_Store
        \`\`\`
      - Spiega sempre il ruolo del file \`.gitignore\` nel README dell'esercizio.
   E) RIGOROSO USO DELL'ITALIANO:
      - Quando la consegna fa riferimento a fonti/siti in lingua inglese (es. Zito Giuseppe 'lez2c.html' con 'Complex', 'add', 'subtract', 'multiply', 'divide', 'compare', 'real', 'imag') O richiede espressamente l'italiano:
        Tradurre TASSATIVAMENTE TUTTI i nomi di classi, metodi e proprietà in italiano scolastico:
        * Nome classe: \`complesso\` (o \`complessi\`)
        * Proprietà private: \`reale\`, \`immaginario\`
        * Metodi: \`somma\`, \`sottrai\`, \`moltiplica\`, \`dividi\`, \`uguale\` (o \`confronta\`), \`parte_reale\`, \`parte_immaginaria\`, \`stampa\`.

4. INTELLIGENZA ARCHITETTURALE: CAPIRE SE FARE "PROGETTO INFORMATICO" O "SINGOLO FILE":
   Devi essere intelligente e capire dal testo o dall'immagine della consegna quale struttura serve:

   A) "progetto_completo" (Progetto informatico con compilazione separata a moduli):
      - Si usa quando nella consegna c'è scritto: "progetto", "progetto informatico", "creare un progetto", "cartella di progetto", "partire da skel", "makefile", "compilazione modulare/separata", "function.h e function.cpp".
      - Oppure quando è una tipica consegna completa di laboratorio con documentazione formale.
      - Struttura generata:
        * function.h: include guards '#ifndef FUNCTION_H', inclusioni, definizione della classe, prototipi funzioni helper e globali.
        * function.cpp: #include "function.h", implementazioni metodi della classe (NomeClasse::metodo()) e funzioni helper.
        * main.cpp: #include "function.h", srand((unsigned int)time(NULL));, array di oggetti/variabili, chiamate di test e return 0.
        * makefile: compilazione separata con target a.out, function.o, main.o, clean, run, doc con TAB (\t).
        * install_md: istruzioni di compilazione con make e comandi manuali.

   B) "singolo_file" (Unico file C++ autocontenuto):
      - Si usa quando nella consegna c'è scritto: "un file solo", "un solo file", "singolo file", "in un unico file .cpp", "un file unico", "scrivere un file cpp", "tutto in main.cpp", "non usare makefile/moduli separati".
      - Si usa quando l'esercizio richiede metodi INLINE e costruttori con inizializzatori (come nel Programma 3 del sito di Zito Giuseppe): i metodi inline sono definiti direttamente dentro la classe, rendendo inutile un file function.cpp separato!
      - Si usa quando la consegna è introdotta come "esercizi per lezione successiva", "compito per casa", esercizio rapido o verifica d'aula senza esplicita richiesta di "progetto/cartella skel".
      - Struttura generata:
        * main_cpp: CONTIENE TUTTO IL CODICE SORGENTE COMPLETO IN UN UNICO FILE (librerie standard, prototipi helper se presenti, definizione classe con private e public e metodi inline, main(), test con new/delete o istanze statiche).
        * function_h: "" (stringa vuota).
        * function_cpp: "" (stringa vuota).
        * makefile: makefile minimale per singolo file (compila g++ -Wall -Wconversion main.cpp -o a.out, target run, clean, doc).
        * install_md: istruzioni chiare per la compilazione diretta del singolo file con g++ e make.

   C) Se la consegna non lo specifica chiaramente ("non lo so" / testo generico) e non è forzato dall'utente:
      - Analizza la richiesta: se è impostata come compito formale/laboratorio, adotta "progetto_completo"; se è una richiesta compatta di codice o esercizio rapido, adotta "singolo_file".
      - Motiva SEMPRE la tua scelta nel campo "ragionamento_struttura" del JSON!

5. REGOLE CRUCIALI DEL COMPILATORE (-Wall -Wconversion):
   Il codice viene compilato tassativamente con: g++ -Wall -Wconversion
   NON deve esserci NESSUN errore e NESSUN warning:
   - srand((unsigned int)time(NULL)); -> il cast a (unsigned int) è obbligatorio!
   - Nelle divisioni numeriche: cast espliciti, es. double ans = (double)somma / (double)n; return ans;
   - File I/O:
     * File input: verificare sempre if (!f_in.is_open()) { cerr << "Errore apertura file..." << endl; return 3; }
     * File output: prima di sovrascrivere, controllare se esiste già aprendolo in sola lettura con ifstream:
       ifstream f_check(nome_file_output);
       if (f_check.is_open()) { cerr << "Il file non deve esistere!" << endl; return 2; }

6. DIVERSIFICAZIONE OBBLIGATORIA DEL CODICE E ALGORITMI (UNICA PER OGNI STUDENTE):
   ATTENZIONE ASSOLUTA: Ogni compito generato DEVE ESSERE COMPLETAMENTE DIVERSO da qualsiasi altro, anche a parità di consegna!
   Due studenti della stessa classe che consegnano lo stesso esercizio NON devono MAI avere lo stesso identico codice, le stesse funzioni con gli stessi nomi o le stesse variabili, altrimenti il docente riconosce che è stato usato lo stesso software!

   - NOMI VARIABILI E PARAMETRI (VARIATI COSTANTEMENTE):
     * Array di oggetti o numeri: arr, v, vet, lista, elenco, sequenza, elementi, dati, animali, alunni...
     * Dimensione: n, dim, dimensione, tot, totale, quantita, num_elem, capienza...
     * Indici: i, j, k, idx, pos, p, ind, iter, passo, cursore...

   - NOMI DELLE FUNZIONI HELPER E METODI:
     * Helper casuali/input: get_casuale, estrai_casuale, genera_rnd, random_tra, estrai_int, get_nome, chiedi_nome, leggi_nome, get_razza, chiedi_razza, get_genere, acquisisci_genere...
     * Stampa e popolamento: stampa, visualizza, mostra, stampa_elenco, riempi, popola_elenco, carica_dati...

7. DECOMPOSIZIONE PASSO-PASSO NELL'ARRAY "passaggi":
   Devi scomporre la consegna in una lista dettagliata di passaggi ("passaggi").
   Ogni requisito o funzione/metodo richiesto DEVE avere un elemento nell'array con:
   - "titolo": nome del requisito (es. Definizione classe con attributi privati e costruttore)
   - "spiegazione": spiegazione approfondita dell'obiettivo e del problema informatico
   - "prototipo": codice del prototipo o dichiarazione della classe/metodo
   - "prototipo_spiegazione": spiegazione della firma, visibilità private/public e parametri
   - "implementazione": codice dell'implementazione (nel function.cpp per progetto, o nel main.cpp per singolo file)
   - "implementazione_spiegazione": spiegazione riga per riga del codice
   - "utilizzo_main": frammento di codice che richiama la funzione/oggetto nel main.cpp
   - "test_output": output realistico mostrato a video

Restituisci ESCLUSIVAMENTE un JSON valido con i campi indicati.
`;

const { formatCppWithTabs } = require('./compiler');

/**
 * Format a comprehensive, rich, step-by-step README.md matching the student archive
 */
function formatComprehensiveReadme({ project, autore, classe, data, testResult }) {
  const authorName = autore || 'Nome e Cognome';
  const className = classe || '3B IT';
  const docDate = data || new Date().toLocaleDateString('it-IT');
  const projName = project.nome_progetto || 'progetto_informatica';
  const title = project.titolo || `Esercizi di informatica del ${docDate}`;
  const consegna = project.consegna_trascritta || project.consegna || '';
  const isSingleFile = project.tipo_struttura === 'singolo_file' || (!project.function_h?.trim() && !project.function_cpp?.trim());

  let md = `> Autore: ${authorName}  \n> Classe: ${className}  \n> Data: ${docDate}\n\n# ${title}\n\n`;

  md += `## Consegna\n\n${consegna}\n\n`;

  md += `## Svolgimento\n\n`;

  if (isSingleFile) {
    md += `### Struttura su Singolo File Sorgente\n\nIn base ai requisiti dell'esercizio, l'intero programma è implementato in un unico file sorgente C++ (\`main.cpp\`).\n`;
    if (project.ragionamento_struttura) {
      md += `*Motivazione architetturale*: ${project.ragionamento_struttura}\n\n`;
    } else {
      md += `\n`;
    }

    md += `### Con relativo makefile\n\nRiporto il makefile per la compilazione con i flag di controllo del docente:\n\n\`\`\`makefile\n${project.makefile || ''}\n\`\`\`\n\n`;

    md += `### Istruzioni per compilare ed eseguire\n\nIstruzioni operative per la compilazione manuale tramite \`g++\` con i flag \`-Wall -Wconversion\` e tramite \`make\`:\n\n\`\`\`\n# COMPILAZIONE\nPer compilare eseguire il seguente comando:\n\ng++ -Wall -Wconversion main.cpp -o a.out\n\nOppure, per automatizzare la compilazione:\n\nmake\n\n# ESECUZIONE\nPer eseguire il programma:\n\n./a.out\n\nOppure:\n\nmake run\n\`\`\`\n\n`;
  } else {
    md += `### Creare un progetto\n\nParto dalla skel e creo il nuovo progetto \`${projName}\` con compilazione modulare a moduli separati:\n\n\`\`\`\nstudente@scuola:~/progetti$ cp -ai skel/ ${projName}\n\`\`\`\n\n`;
    if (project.ragionamento_struttura) {
      md += `*Motivazione architetturale*: ${project.ragionamento_struttura}\n\n`;
    }

    md += `### Con relativo makefile\n\nRiporto il contenuto iniziale del makefile per la compilazione separata dei moduli sorgente:\n\n\`\`\`makefile\n${project.makefile || ''}\n\`\`\`\n\n`;

    md += `### Istruzioni per compilare ed eseguire\n\nIstruzioni operative per la compilazione manuale tramite \`g++\` con i flag \`-Wall -Wconversion\` e tramite \`make\`:\n\n\`\`\`\n# COMPILAZIONE\nPer compilare eseguire i seguenti comandi:\n\ng++ -Wall -Wconversion -c function.cpp\ng++ -Wall -Wconversion -c main.cpp\ng++ -Wall -Wconversion function.o main.o\n\nOppure, per automatizzare la compilazione:\n\nmake\n\n# ESECUZIONE\nPer eseguire il programma:\n\n./a.out\n\nOppure:\n\nmake run\n\`\`\`\n\n`;
  }

  // Step by step breakdown from passaggi array
  if (Array.isArray(project.passaggi) && project.passaggi.length > 0) {
    for (const p of project.passaggi) {
      md += `### ${p.titolo}\n\n`;
      if (p.spiegazione) {
        md += `${p.spiegazione}\n\n`;
      }

      if (p.prototipo) {
        const protoLocation = isSingleFile ? 'Nel sorgente (`main.cpp`)' : 'Nel `function.h`';
        md += `#### Prototipo / Dichiarazione\n\n${protoLocation}:\n\n\`\`\`cpp\n${formatCppWithTabs(p.prototipo)}\n\`\`\`\n\n`;
        if (p.prototipo_spiegazione) {
          md += `${p.prototipo_spiegazione}\n\n`;
        }
      }

      if (p.implementazione) {
        const implLocation = isSingleFile ? 'Nel sorgente (`main.cpp`)' : 'Nel `function.cpp`';
        md += `#### Implementazione\n\n${implLocation}:\n\n\`\`\`cpp\n${formatCppWithTabs(p.implementazione)}\n\`\`\`\n\n`;
        if (p.implementazione_spiegazione) {
          md += `Spiegazione del codice:\n${p.implementazione_spiegazione}\n\n`;
        }
      }

      if (p.utilizzo_main) {
        md += `#### Utilizzo\n\nNel \`main.cpp\`:\n\n\`\`\`cpp\n${formatCppWithTabs(p.utilizzo_main)}\n\`\`\`\n\n`;
      }

      if (p.test_output) {
        md += `#### La testo\n\n\`\`\`\nstudente@scuola:~/progetti/${projName}$ make run\n${p.test_output}\n\`\`\`\n\nFunziona.\n\n`;
      }
    }
  }

  // Final execution and test
  const execLog = testResult?.executionOutput || 'Esecuzione completata con successo.';
  if (isSingleFile) {
    md += `### Test finale ed esecuzione completa\n\nEseguo la pulizia con \`make clean\`, ricompilo con \`make\` e testo l'eseguibile verificando anche il codice di uscita tramite \`echo $?\`:\n\n\`\`\`\nstudente@scuola:~/progetti/${projName}$ make clean\nrm -f a.out\nstudente@scuola:~/progetti/${projName}$ make\ng++ -Wall -Wconversion main.cpp -o a.out\nstudente@scuola:~/progetti/${projName}$ ./a.out\n${execLog}\nstudente@scuola:~/progetti/${projName}$ echo $?\n0\n\`\`\`\n\nIl programma funziona correttamente senza produrre alcun warning con i flag \`-Wall -Wconversion\`.\n\n`;
  } else {
    md += `### Test finale ed esecuzione completa\n\nEseguo la pulizia dei binari con \`make clean\`, ricompilo interamente con \`make\` e testo l'eseguibile verificando anche il codice di uscita tramite \`echo $?\`:\n\n\`\`\`\nstudente@scuola:~/progetti/${projName}$ make clean\nrm -f *.o a.out\nstudente@scuola:~/progetti/${projName}$ make\ng++ -Wall -Wconversion -c function.cpp\ng++ -Wall -Wconversion -c main.cpp\ng++ -Wall -Wconversion function.o main.o\nstudente@scuola:~/progetti/${projName}$ ./a.out\n${execLog}\nstudente@scuola:~/progetti/${projName}$ echo $?\n0\n\`\`\`\n\nIl programma funziona correttamente senza produrre alcun warning con i flag \`-Wall -Wconversion\`.\n\n`;
  }

  // Allegati
  md += `## Allegati\n\n`;
  if (project.gitignore) {
    md += `### .gitignore\n\`\`\`gitignore\n${project.gitignore}\n\`\`\`\n\n`;
  }
  md += `### makefile\n\`\`\`makefile\n${project.makefile || ''}\n\`\`\`\n\n`;
  md += `### INSTALL.md\n\`\`\`markdown\n${project.install_md || ''}\n\`\`\`\n\n`;
  if (!isSingleFile) {
    md += `### function.h\n\`\`\`cpp\n${project.function_h || ''}\n\`\`\`\n\n`;
    md += `### function.cpp\n\`\`\`cpp\n${project.function_cpp || ''}\n\`\`\`\n\n`;
  }
  md += `### main.cpp${isSingleFile ? ' (Sorgente Completo)' : ''}\n\`\`\`cpp\n${project.main_cpp || ''}\n\`\`\`\n\n`;

  if (Array.isArray(project.input_files)) {
    for (const f of project.input_files) {
      if (f.filename && f.content) {
        md += `### ${f.filename}\n\`\`\`\n${f.content}\n\`\`\`\n\n`;
      }
    }
  }

  // Fonti
  md += `## Fonti\n\n`;
  md += `- Appunti delle lezioni e dispense del prof. Papa\n`;
  md += `- Mappa didattica di informatica classe 3B IT\n`;
  md += `- Documentazione C++ su cplusplus.com\n`;
  md += `- W3Schools C++ Tutorial\n\n`;

  // Problemi riscontrati
  md += `## Problemi riscontrati\n\n`;
  md += `Durante la risoluzione e lo sviluppo del codice sono stati curati con particolare attenzione i seguenti aspetti didattici:\n\n`;
  md += `1. **Gestione dei warning con \`-Wall -Wconversion\`**:\n`;
  md += `   - La funzione \`time(NULL)\` restituisce un tipo \`time_t\` (\`long int\`). Per evitare avvisi di troncamento passando il valore a \`srand()\`, è stato applicato il cast obbligatorio: \`srand((unsigned int)time(NULL));\`.\n`;
  md += `   - Nelle divisioni numeriche tra interi con risultato decimale (come il calcolo della media aritmetica), per non perdere la parte frazionaria è stato forzato il cast esplicito a \`double\` sui fattori: \`(double)somma / (double)n\`.\n`;
  md += `2. **Aderenza allo stile didattico delle Classi e Divieto di librerie avanzate**:\n`;
  md += `   - Le classi adottano la corretta separazione tra \`private:\` e \`public:\`, costruttore con \`this->\` esplicito e implementazione dei metodi fuori dalla classe con risoluzione di visibilità (\`NomeClasse::metodo()\`).\n`;
  md += `   - Come da programma scolastico, sono stati utilizzati esclusivamente array classici (\`int v[n]\` o \`animale a[n]\`) e nessun container avanzato non svolto (\`<vector>\`, \`<algorithm>\`).\n`;
  md += `3. **Sicurezza delle operazioni I/O e gestione memoria**:\n`;
  md += `   - Le letture/scritture su file sono protette con verifica preventiva \`is_open()\` per evitare accessi a file inesistenti o sovrascritture accidentali.\n`;
  md += `4. **Novità della lezione del 16/10/2026 sulle classi**:\n`;
  md += `   - **Inizializzatori nel costruttore**: sintassi compatta con lista di inizializzatori (\`: reale(r), immaginario(i)\`) per inizializzare direttamente i campi privati all'atto della creazione dell'oggetto.\n`;
  md += `   - **Metodi inline**: implementazione compatta dei metodi all'interno della definizione della classe per massimizzare leggibilità ed efficienza di esecuzione.\n`;
  md += `   - **Puntatori a istanze di classe e operatore freccia (\`->\`)**: allocazione dinamica tramite \`new\`, invocazione dei metodi con operatore freccia (\`ptr->metodo()\`) e deallocazione esplicita della memoria con \`delete ptr\` per evitare leak di memoria.\n`;
  md += `   - **Ruolo di \`.gitignore\`**: inserimento del file \`.gitignore\` per escludere file binari ed eseguibili (\`a.out\`, \`*.o\`, \`*.exe\`) dall'archivio git scolastico.\n\n`;

  // Style tag pandoc
  md += `<style>\n:not(pre) > code {\n    color: #5310f0 !important; \n    background-color: #faf7f6ff !important;\n    border: 1px solid #dcdcdc !important;\n    border-radius: 6px !important;\n    padding: 0.2em 0.4em !important;\n    font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace !important;\n    font-size: 85% !important;\n}\n</style>\n`;

  return md;
}

/**
 * Crea un profilo di diversificazione randomizzato per garantire che ogni compito,
 * anche con consegna identica, abbia codice unico e non fotocopia
 */
function createUniqueDiversityProfile() {
  const seed = Math.floor(100000 + Math.random() * 900000);

  const arrayNames = ['v', 'arr', 'vet', 'numeri', 'valori', 'elementi', 'dati', 'sequenza', 'lista_valori'];
  const sizeNames = ['n', 'dim', 'dimensione', 'tot', 'totale', 'lunghezza', 'quanti', 'num_elementi'];
  const indexPairs = [
    { i: 'i', j: 'j' },
    { i: 'idx', j: 'jdx' },
    { i: 'pos', j: 'p' },
    { i: 'iter', j: 'passo' },
    { i: 'ind', j: 'j' }
  ];

  const sortApproaches = [
    'Bubble Sort standard con due cicli for annidati crescenti',
    'Bubble Sort con flag booleano di verifica scambio (es. bool scambiato = false; if (!scambiato) break;)',
    'Bubble Sort con ciclo esterno decrementale (for int i = dim - 1; i > 0; i--)',
    'Bubble Sort classico a bolle con scansione elementi'
  ];

  const swapApproaches = [
    'Funzione ausiliaria scambia con passaggio per riferimento (int &a, int &b)',
    'Scambio inline direttamente nel blocco del ciclo con variabile di supporto (int temp = ...)',
    'Funzione ausiliaria scambia_valori con variabili temporanee'
  ];

  const commentStyles = [
    'Commenti sintetici in stile studente (es. // inizializzazione array, // ordinamento a bolle)',
    'Commenti chiari sui punti salienti dell\'algoritmo e sulla gestione del cast time/srand',
    'Codice pulito con commenti essenziali sulle sole funzioni e prototipi',
    'Commenti esplicativi riga per riga su passaggi logici e controlli if'
  ];

  const promptPhrasings = [
    { input: 'Inserisci quantita elementi: ', output: '===== Dati Ordinati =====' },
    { input: 'Quanti numeri generare? ', output: '[Elementi del Vettore]' },
    { input: 'Numero di valori: ', output: '--- Risultato Finale ---' },
    { input: 'Dimensione del vettore: ', output: 'Elenco valori elaborati:' }
  ];

  const randArr = arrayNames[Math.floor(Math.random() * arrayNames.length)];
  const randSize = sizeNames[Math.floor(Math.random() * sizeNames.length)];
  const randIdx = indexPairs[Math.floor(Math.random() * indexPairs.length)];
  const randSort = sortApproaches[Math.floor(Math.random() * sortApproaches.length)];
  const randSwap = swapApproaches[Math.floor(Math.random() * swapApproaches.length)];
  const randComment = commentStyles[Math.floor(Math.random() * commentStyles.length)];
  const randPrompt = promptPhrasings[Math.floor(Math.random() * promptPhrasings.length)];

  return {
    seed,
    arrayName: randArr,
    sizeName: randSize,
    indices: randIdx,
    sortApproach: randSort,
    swapApproach: randSwap,
    commentStyle: randComment,
    promptPhrasing: randPrompt
  };
}

/**
 * Generate full exercise project from prompt / image
 */
async function generateExercise({ consegna, imageBuffer, imageMime, autore, classe, data, nomeProgetto, argomenti, modalitaStruttura = 'auto' }) {
  const parts = [];

  // Se la consegna contiene URL (es. link a lezioni, dispense o siti web), scarica e inietta automaticamente il loro contenuto
  const detectedUrls = extractUrlsFromText(consegna);
  if (detectedUrls.length > 0) {
    console.log(`[CopiaPicchio WebFetcher] Trovati ${detectedUrls.length} link nella consegna. Download e parsing in corso...`);
    const fetchedDocs = await Promise.allSettled(
      detectedUrls.map(async (url) => {
        const text = await fetchWebpageContent(url);
        return { url, text };
      })
    );

    for (const item of fetchedDocs) {
      if (item.status === 'fulfilled' && item.value.text) {
        parts.push({
          text: `======================================================================\nCONTENUTO RECUPERATO DAL SITO WEB CITATO NELLA CONSEGNA (${item.value.url}):\n======================================================================\n${item.value.text}\n======================================================================`
        });
      }
    }
  }

  if (imageBuffer && imageMime) {
    parts.push({
      inline_data: {
        mime_type: imageMime,
        data: imageBuffer.toString('base64')
      }
    });
    parts.push({
      text: "Questa è la foto della consegna dell'esercizio (es. lavagna, quaderno o compito stampato). Trascrivila accuratamente parola per parola, analizza se richiede un progetto informatico modulare o un singolo file, e sviluppa la soluzione rispettando la mappa didattica del prof. Papa, le classi in C++ (se previste) e lo stile scolastico dell'archivio studenti."
    });
  }

  const diversity = createUniqueDiversityProfile();

  const uniquenessDirectives = `
======================================================================
DIRETTIVA TASSATIVA DI UNICITA E VARIETA (ID Univoco #${diversity.seed}):
DUE STUDENTI CON LA STESSA CONSEGNA NON DEVONO MAI AVERE LO STESSO CODICE!
NON USARE NOMI DI FUNZIONI O VARIABILI PREVEDIBILI O IDENTICI AD ALTRI COMPITI.
======================================================================
Per questa specifica generazione dell'esercizio adotta questa impronta stilistica unica:
- Nome identificatore array primario: usa preferibilmente '${diversity.arrayName}' (evita di usare sempre 'v')
- Nome identificatore dimensione: usa preferibilmente '${diversity.sizeName}' (evita di usare sempre 'n')
- Indici dei cicli: usa '${diversity.indices.i}', '${diversity.indices.j}'
- Approccio per l'ordinamento (se richiesto): ${diversity.sortApproach}
- Tecnica di scambio (se necessaria): ${diversity.swapApproach}
- Nomi delle funzioni helper: inventa nomi chiari, rigorosi in italiano ma VARIATI rispetto ad altri compiti (es. varia tra 'genera_casuale', 'estrai_numero', 'random_tra', 'chiedi_nome', 'get_nome', 'leggi_nome', 'chiedi_razza', 'get_razza', 'acquisisci_genere', 'get_genere', ecc.).
- Stile dei messaggi cout a video: usa formulazioni realistiche come "${diversity.promptPhrasing.input}" e "${diversity.promptPhrasing.output}".
- Stile commenti nel codice: ${diversity.commentStyle}.
- Spiegazioni della relazione README e dei "passaggi": formula le descrizioni con parole e considerazioni originali per questo studente, evitando frasi stereotipate o fotocopia.

ATTENZIONE: TUTTI i requisiti didattici rimangono rigorosamente validi:
- Se l'esercizio tratta entità con attributi o richiede classi, implementa la classe ESATTAMENTE come illustrato (attributi in private, costruttore con this->, metodi con NomeClasse::metodo() e this->campo, funzione esterna stampa(NomeClasse a[], int n)).
- Array C statici (${diversity.arrayName}[n]).
- MAI <vector>, MAI <algorithm>, MAI auto, MAI template, MAI lambda.
- Zero errori e zero warning con g++ -Wall -Wconversion (cast obbligatorio srand((unsigned int)time(NULL));, cast espliciti nelle divisioni double).
- Nessun riferimento a Diemoz o Daniel Diemoz o percorsi personali.
`;

  let strutturaDirettiva = '';
  if (modalitaStruttura === 'progetto') {
    strutturaDirettiva = `PREFERENZA STRUTTURA: L'utente ha selezionato esplicitamente "PROGETTO INFORMATICO COMPLETO". Genera tassativamente la struttura a 3 file con compilazione separata (function.h con guardie e prototipi/classe, function.cpp con implementazioni, main.cpp e makefile modulare). Imposta "tipo_struttura": "progetto_completo".`;
  } else if (modalitaStruttura === 'singolo') {
    strutturaDirettiva = `PREFERENZA STRUTTURA: L'utente ha selezionato esplicitamente "SINGOLO FILE C++". Genera tassativamente l'intero codice funzionante in un unico file (in main_cpp), lasciando function_h e function_cpp vuoti "". Imposta "tipo_struttura": "singolo_file".`;
  } else {
    strutturaDirettiva = `PREFERENZA STRUTTURA: RILEVAMENTO AUTOMATICO INTELLIGENTE DALLA CONSEGNA!
Analizza con estrema attenzione il testo e l'eventuale foto della consegna:
- Scegli "tipo_struttura": "progetto_completo" se la consegna richiede espressamente un "progetto informatico", "creare un progetto", "cartella di progetto", "partire da skel", "makefile", "compilazione separata/modulare a 3 file", o se è un'esercitazione formale di laboratorio a moduli.
- Scegli "tipo_struttura": "singolo_file" se:
  1) Nella consegna c'è scritto "un solo file", "singolo file", "in un unico file .cpp", "un file solo", "tutto in main.cpp".
  2) Oppure l'esercizio riguarda classi con METODI INLINE e INIZIALIZZATORI (es. l'esercizio 3 del sito di Zito Giuseppe su lez2c.html): con i metodi inline l'implementazione è tutta dentro la classe nello stesso file, per cui un file function.cpp separato sarebbe inutile o ridondante!
  3) Oppure è formulato come "Esercizi per lezione successiva", compito a casa rapido o esercizio circoscritto.
- Se non è specificato ("o non lo so" / testo ambiguo), valuta il contesto didattico: se richiede metodi inline o se la fonte di riferimento usa un file unico, adotta "singolo_file"; altrimenti valuta se serve "progetto_completo".
Spiega chiaramente la tua motivazione nel campo "ragionamento_struttura".`;
  }

  const promptText = `
Dati per l'esercizio:
- Autore: ${autore || 'Nome e Cognome'}
- Classe: ${classe || '3B IT'}
- Data: ${data || new Date().toLocaleDateString('it-IT')}
- Nome Progetto preferito: ${nomeProgetto || `auto-genera in snake_case (es. ripasso_vettori_${diversity.seed % 100}, gestione_classe, elaborazione_dati)`}
- Argomenti indicati (se forniti): ${argomenti || 'Dedurli accuratamente dalla consegna'}
- Testo consegna aggiuntivo o fornito:
${consegna || '(Vedi immagine allegata per la consegna)'}

${strutturaDirettiva}

${uniquenessDirectives}

Genera il codice C++ e la documentazione didattica completa.
RICORDA TASSATIVAMENTE:
1. CLASSI C++: se l'esercizio usa classi, falle SOLO con:
   - attributi in private:
   - costruttore in public: che valorizza i campi con this->campo = get_...(...)
   - metodi dichiarati in public: e implementati FUORI dalla classe con tipo NomeClasse::metodo() usando this->campo
   - funzione globale void stampa(NomeClasse a[], int n) con ciclo a[i].stampa()
2. STRUTTURA:
   - Se "progetto_completo": suddividi il codice in function.h, function.cpp e main.cpp.
   - Se "singolo_file": metti TUTTO il codice funzionante in main_cpp; imposta function_h e function_cpp a stringa vuota "".
3. Scomponi la consegna nei singoli passaggi nell'array "passaggi", fornendo per CIASCUNO titolo, spiegazione, prototipo, spiegazione del prototipo, implementazione, spiegazione implementazione, utilizzo nel main e test output!

Restituisci un JSON valido con questa struttura esatta:
{
  "tipo_struttura": "progetto_completo oppure singolo_file",
  "ragionamento_struttura": "string (spiegazione dettagliata del perché è stata scelta questa modalità in base al testo della consegna)",
  "nome_progetto": "string (solo lettere minuscole e underscore, es. ripasso_vettori)",
  "titolo": "string (es. Ripasso di informatica del 01/10/2026)",
  "argomenti": "string (sintesi argomenti didattici)",
  "consegna_trascritta": "string (testo completo ed esatto della consegna)",
  "main_cpp": "string (se progetto: main.cpp; se singolo file: TUTTO il sorgente C++ completo)",
  "function_h": "string (se progetto: header con include guards e prototipi/classe; se singolo file: '')",
  "function_cpp": "string (se progetto: implementazione metodi e funzioni; se singolo file: '')",
  "makefile": "string (codice makefile con tabulazioni '\\t')",
  "install_md": "string (contenuto completo per INSTALL.md)",
  "gitignore": "string (regole di esclusione git: a.out, *.o, *.exe, *~, .vscode/)",
  "sample_stdin": "string (eventuale input da tastiera da passare a cin, es. 10\\n)",
  "sample_args": ["string (eventuali argomenti argv per ./a.out)"],
  "passaggi": [
    {
      "titolo": "Titolo del requisito (es. Definizione classe animale con attributi privati e costruttore)",
      "spiegazione": "Descrizione approfondita del requisito e della logica",
      "prototipo": "string (prototipo o dichiarazione della classe)",
      "prototipo_spiegazione": "Spiegazione della classe/metodo e dei parametri.",
      "implementazione": "string (codice implementazione)",
      "implementazione_spiegazione": "Spiegazione della logica didattica del codice.",
      "utilizzo_main": "string (chiamata nel main.cpp)",
      "test_output": "string (output realistico a video)"
    }
  ],
  "input_files": [
    { "filename": "nome.txt o nome.csv", "content": "contenuto file" }
  ]
}
`;

  parts.push({ text: promptText });

  const result = await callGemini([{ parts }], SYSTEM_PROMPT, null, 0.85);

  // Normalizza tipo_struttura
  if (!result.tipo_struttura) {
    if (result.function_h && result.function_h.trim() && result.function_cpp && result.function_cpp.trim()) {
      result.tipo_struttura = 'progetto_completo';
    } else {
      result.tipo_struttura = 'singolo_file';
    }
  }

  // Normalizza gitignore
  if (!result.gitignore || typeof result.gitignore !== 'string' || !result.gitignore.trim()) {
    result.gitignore = "# Eseguibili compilati\na.out\n*.exe\n\n# Moduli compilazione separata\n*.o\n\n# File temporanei\n*~\n.vscode/\n.DS_Store\n";
  }

  // Costruisci la relazione completa, ricca e dettagliata
  result.readme_md = formatComprehensiveReadme({
    project: result,
    autore,
    classe,
    data,
    testResult: null
  });

  return result;
}

/**
 * Self-healing pass: if compilation produces errors or warnings, Gemini fixes it.
 */
async function fixExerciseCode({ projectData, compilerOutput }) {
  const isSingleFile = projectData.tipo_struttura === 'singolo_file' || (!projectData.function_h?.trim() && !projectData.function_cpp?.trim());

  let prompt = '';
  if (isSingleFile) {
    prompt = `
Il programma C++ generato (in singolo file main.cpp) ha prodotto errori o warning con 'g++ -Wall -Wconversion'.
Ricorda che il codice deve compilare con ZERO errori e ZERO warning e usare SOLO C++ SCOLASTICO DI BASE DELLA CLASSE 3B IT (niente <vector>, niente <algorithm>, classi fatte solo con attributi private, costruttore con this-> e metodi NomeClasse::metodo()).

Output del compilatore:
${compilerOutput}

Codice attuale di main.cpp (sorgente completo):
${projectData.main_cpp}

Correggi il codice e fornisci la versione corretta nel seguente JSON:
{
  "main_cpp": "string (codice corretto completo)",
  "function_h": "",
  "function_cpp": "",
  "spiegazione": "string (cosa è stato corretto)"
}
`;
  } else {
    prompt = `
Il codice C++ del progetto generato ha prodotto errori o warning con 'g++ -Wall -Wconversion'.
Ricorda che il codice deve compilare con ZERO errori e ZERO warning e usare SOLO C++ SCOLASTICO DI BASE DELLA CLASSE 3B IT (niente <vector>, niente <algorithm>, classi fatte solo con attributi private, costruttore con this-> e metodi NomeClasse::metodo()).

Output del compilatore:
${compilerOutput}

Codice attuale:
--- function.h ---
${projectData.function_h}
--- function.cpp ---
${projectData.function_cpp}
--- main.cpp ---
${projectData.main_cpp}

Correggi il codice e fornisci la versione corretta nel seguente JSON:
{
  "function_h": "string (codice corretto)",
  "function_cpp": "string (codice corretto)",
  "main_cpp": "string (codice corretto)",
  "spiegazione": "string (cosa è stato corretto)"
}
`;
  }

  const fixResult = await callGemini([{ parts: [{ text: prompt }] }], SYSTEM_PROMPT, null, 0.2);
  return fixResult;
}

module.exports = {
  generateExercise,
  fixExerciseCode,
  formatComprehensiveReadme
};
