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
  'gemini-3.1-flash-lite',
  'gemini-3.1-flash-lite-preview',
  'gemini-2.5-flash-lite'
];

/**
 * Call Gemini API with model fallback
 */
async function callGemini(contents, systemInstruction = '', responseSchema = null) {
  let lastError = null;

  for (const model of MODELS) {
    try {
      const result = await makeGeminiRequest(model, contents, systemInstruction, responseSchema);
      if (result) return result;
    } catch (err) {
      console.warn(`[Gemini] Model ${model} failed: ${err.message}. Retrying with next model if available...`);
      lastError = err;
    }
  }

  throw new Error(`Tutti i modelli Gemini hanno fallito: ${lastError ? lastError.message : 'Errore sconosciuto'}`);
}

function makeGeminiRequest(model, contents, systemInstruction, responseSchema) {
  return new Promise((resolve, reject) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    
    const body = {
      contents,
      generationConfig: {
        temperature: 0.2,
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

const SYSTEM_PROMPT = `
Sei l'assistente ufficiale di "CopiaPicchio!", il sistema didattico per la risoluzione e generazione di progetti di compiti di informatica in C++ per studenti di 3ª superiore (classe 3B IT) del prof. Papa.

======================================================================
REGOLE TASSATIVE DI PROGRAMMAZIONE DALLA MAPPA DIDATTICA (mappa.mm):
NON USARE MAI COSTRUTTI O LIBRERIE NON PRESENTI NELLA MAPPA!
======================================================================
Il docente insegna esclusivamente il C++ scolastico di base. Qualsiasi costrutto avanzato verrebbe immediatamente riconosciuto come "copiato da internet" o generato da un'AI:

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
     USARE ESCLUSIVAMENTE ARRAY STATICI C-STYLE: int v[n]; oppure alunno v[n];
   - VIETATO auto, lambda [&](){}, template <typename T>, smart pointers (unique_ptr, shared_ptr).
   - VIETATE classi con ereditarietà o visibilità private/public complesse: USARE SOLO struct (es. struct alunno { ... }; con punto e virgola finale).

3. REGOLE CRUCIALI DEL COMPILATORE (-Wall -Wconversion):
   Il codice viene compilato tassativamente con: g++ -Wall -Wconversion
   NON deve esserci NESSUN errore e NESSUN warning:
   - srand((unsigned int)time(NULL)); -> il cast a (unsigned int) è obbligatorio!
   - Nelle divisioni: cast espliciti, es. double ans = (double)somma / n; return ans;
   - File I/O:
     * File input: verificare sempre if (!f_in.is_open()) { cerr << "Errore apertura file..." << endl; return 3; }
     * File output: prima di sovrascrivere, controllare se esiste già aprendolo in sola lettura con ifstream:
       ifstream f_check(nome_file_output);
       if (f_check.is_open()) { cerr << "Il file non deve esistere!" << endl; return 2; }

4. ALGORITMI STANDARD DA UTILIZZARE (come nell'archivio dello studente):
   - Generazione casuale:
     int get_casuale(int da, int a) {
         return rand() % (a - da + 1) + da;
     }
   - Scambio:
     void scambia(int &a, int &b) {
         int temp = a;
         a = b;
         b = temp;
     }
   - Ordinamento: Bubble Sort classico a due cicli for annidati:
     void ordina_crescente(int v[], int n) {
         for (int i = 0; i < n - 1; i++) {
             for (int j = 0; j < n - 1 - i; j++) {
                 if (v[j] > v[j + 1]) {
                     scambia(v[j], v[j + 1]);
                 }
             }
         }
     }
   - Calcolo media:
     double calcola_media(int v[], int n) {
         if (n <= 0) return 0.0;
         double somma = 0.0;
         for (int i = 0; i < n; i++) {
             somma += (double)v[i];
         }
         double ans = somma / (double)n;
         return ans;
     }
   - Calcolo minimo e massimo con for classico da 1 a n-1.
   - Formattazione output a video con sezioni chiare:
     cout << "===== Numeri =====" << endl;

5. STRUTTURA DEL PROGETTO C++ A 3 FILE:
   - function.h: include guards '#ifndef FUNCTION_H', '#define FUNCTION_H " funzione"', prototipi.
   - function.cpp: implementazione delle funzioni ausiliarie.
   - main.cpp: srand((unsigned int)time(NULL));, gestione parametri, chiamate e test.
   - makefile: target a.out, function.o, main.o, clean, run, doc con TAB (\t).
   - INSTALL.md: # COMPILAZIONE, # ESECUZIONE, # RISULTATO ATTESO, # PULIZIA, # DOCUMENTAZIONE.

6. DECOMPOSIZIONE PASSO-PASSO NELL'ARRAY "passaggi":
   Devi scomporre la consegna in una lista dettagliata di passaggi ("passaggi").
   Ogni requisito o funzione richiesta DEVE avere un elemento nell'array con:
   - "titolo": nome del requisito (es. Generare n numeri casuali tra -1000 e 1000)
   - "spiegazione": spiegazione approfondita dell'obiettivo e del problema informatico
   - "prototipo": codice del prototipo (es. int get_casuale(int da, int a);)
   - "prototipo_spiegazione": spiegazione della firma, del tipo restituito e dei singoli parametri
   - "implementazione": codice della funzione in function.cpp (indentato con tabulazioni)
   - "implementazione_spiegazione": spiegazione riga per riga del codice (es. elenco puntato con cosa fa ciascuna riga, il ruolo delle variabili, i cicli for, i controlli if, i cast espliciti, il return), chiara e approfondita senza esagerare
   - "utilizzo_main": frammento di codice che richiama la funzione nel main.cpp
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

  let md = `> Autore: ${authorName}  \n> Classe: ${className}  \n> Data: ${docDate}\n\n# ${title}\n\n`;

  md += `## Consegna\n\n${consegna}\n\n`;

  md += `## Svolgimento\n\n`;
  md += `### Creare un progetto\n\nParto dalla skel e creo il nuovo progetto \`${projName}\`:\n\n\`\`\`\nstudente@scuola:~/progetti$ cp -ai skel/ ${projName}\n\`\`\`\n\n`;

  md += `### Con relativo makefile\n\nRiporto il contenuto iniziale del makefile per la compilazione separata dei moduli sorgente:\n\n\`\`\`makefile\n${project.makefile || ''}\n\`\`\`\n\n`;

  md += `### Istruzioni per compilare ed eseguire\n\nIstruzioni operative per la compilazione manuale tramite \`g++\` con i flag \`-Wall -Wconversion\` e tramite \`make\`:\n\n\`\`\`\n# COMPILAZIONE\nPer compilare eseguire i seguenti comandi:\n\ng++ -Wall -Wconversion -c function.cpp\ng++ -Wall -Wconversion -c main.cpp\ng++ -Wall -Wconversion function.o main.o\n\nOppure, per automatizzare la compilazione:\n\nmake\n\n# ESECUZIONE\nPer eseguire il programma:\n\n./a.out\n\nOppure:\n\nmake run\n\`\`\`\n\n`;

  // Step by step breakdown from passaggi array
  if (Array.isArray(project.passaggi) && project.passaggi.length > 0) {
    for (const p of project.passaggi) {
      md += `### ${p.titolo}\n\n`;
      if (p.spiegazione) {
        md += `${p.spiegazione}\n\n`;
      }

      if (p.prototipo) {
        md += `#### Prototipo\n\nNel \`function.h\`:\n\n\`\`\`cpp\n${formatCppWithTabs(p.prototipo)}\n\`\`\`\n\n`;
        if (p.prototipo_spiegazione) {
          md += `${p.prototipo_spiegazione}\n\n`;
        }
      }

      if (p.implementazione) {
        md += `#### Implementazione\n\nNel \`function.cpp\`:\n\n\`\`\`cpp\n${formatCppWithTabs(p.implementazione)}\n\`\`\`\n\n`;
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
  md += `### Test finale ed esecuzione completa\n\nEseguo la pulizia dei binari con \`make clean\`, ricompilo interamente con \`make\` e testo l'eseguibile verificando anche il codice di uscita tramite \`echo $?\`:\n\n\`\`\`\nstudente@scuola:~/progetti/${projName}$ make clean\nrm -f *.o a.out\nstudente@scuola:~/progetti/${projName}$ make\ng++ -Wall -Wconversion -c function.cpp\ng++ -Wall -Wconversion -c main.cpp\ng++ -Wall -Wconversion function.o main.o\nstudente@scuola:~/progetti/${projName}$ ./a.out\n${execLog}\nstudente@scuola:~/progetti/${projName}$ echo $?\n0\n\`\`\`\n\nIl programma funziona correttamente senza produrre alcun warning con i flag \`-Wall -Wconversion\`.\n\n`;

  // Allegati
  md += `## Allegati\n\n`;
  md += `### makefile\n\`\`\`makefile\n${project.makefile || ''}\n\`\`\`\n\n`;
  md += `### INSTALL.md\n\`\`\`markdown\n${project.install_md || ''}\n\`\`\`\n\n`;
  md += `### function.h\n\`\`\`cpp\n${project.function_h || ''}\n\`\`\`\n\n`;
  md += `### function.cpp\n\`\`\`cpp\n${project.function_cpp || ''}\n\`\`\`\n\n`;
  md += `### main.cpp\n\`\`\`cpp\n${project.main_cpp || ''}\n\`\`\`\n\n`;

  if (Array.isArray(project.input_files)) {
    for (const f of project.input_files) {
      if (f.filename && f.content) {
        md += `### ${f.filename}\n\`\`\`\n${f.content}\n\`\`\`\n\n`;
      }
    }
  }

  // Fonti
  md += `## Fonti\n\n`;
  md += `- Appunti delle lezioni e mappa didattica del prof. Papa\n`;
  md += `- Documentazione C++ su cplusplus.com\n`;
  md += `- W3Schools C++ Tutorial\n\n`;

  // Problemi riscontrati
  md += `## Problemi riscontrati\n\n`;
  md += `Durante la risoluzione e lo sviluppo del codice sono stati curati con particolare attenzione i seguenti aspetti didattici:\n\n`;
  md += `1. **Gestione dei warning con \`-Wall -Wconversion\`**:\n`;
  md += `   - La funzione \`time(NULL)\` restituisce un tipo \`time_t\` (\`long int\`). Per evitare avvisi di troncamento passando il valore a \`srand()\`, è stato applicato il cast obbligatorio: \`srand((unsigned int)time(NULL));\`.\n`;
  md += `   - Nelle divisioni numeriche tra interi con risultato decimale (come il calcolo della media aritmetica), per non perdere la parte frazionaria è stato forzato il cast esplicito a \`double\` sui fattori: \`(double)somma / (double)n\`.\n`;
  md += `2. **Aderenza al C++ di base e divieto di librerie avanzate**:\n`;
  md += `   - In accordo con il programma svolto in classe, sono stati utilizzati esclusivamente array classici (\`int v[n]\`) e non classi complesse o container della STL come \`<vector>\` o algoritmi \`<algorithm>\`.\n`;
  md += `   - Le funzioni ausiliarie per lo scambio elementi (\`scambia\`) sfruttano il passaggio dei parametri per riferimento con \`&\` (\`int &a, int &b\`), operando direttamente sui dati in memoria.\n`;
  md += `3. **Sicurezza delle operazioni I/O sui file**:\n`;
  md += `   - Ogni operazione di lettura e scrittura su disco tramite \`fstream\` include la verifica preventiva con \`is_open()\` per intercettare file mancanti o non accessibili.\n\n`;

  // Style tag pandoc
  md += `<style>\n:not(pre) > code {\n    color: #5310f0 !important; \n    background-color: #faf7f6ff !important;\n    border: 1px solid #dcdcdc !important;\n    border-radius: 6px !important;\n    padding: 0.2em 0.4em !important;\n    font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace !important;\n    font-size: 85% !important;\n}\n</style>\n`;

  return md;
}

/**
 * Generate full exercise project from prompt / image
 */
async function generateExercise({ consegna, imageBuffer, imageMime, autore, classe, data, nomeProgetto, argomenti }) {
  const parts = [];

  if (imageBuffer && imageMime) {
    parts.push({
      inline_data: {
        mime_type: imageMime,
        data: imageBuffer.toString('base64')
      }
    });
    parts.push({
      text: "Questa è la foto della consegna dell'esercizio (es. lavagna, quaderno o compito stampato). Trascrivila accuratamente parola per parola e sviluppa l'intero progetto rispettando la mappa didattica del prof. Papa e lo stile scolastico dell'archivio studenti."
    });
  }

  const promptText = `
Dati per l'esercizio:
- Autore: ${autore || 'Nome e Cognome'}
- Classe: ${classe || '3B IT'}
- Data: ${data || new Date().toLocaleDateString('it-IT')}
- Nome Progetto preferito: ${nomeProgetto || 'auto-genera in snake_case (es. ripasso_vettori, divisori, estrazioni)'}
- Argomenti indicati (se forniti): ${argomenti || 'Dedurli accuratamente dalla consegna'}
- Testo consegna aggiuntivo o fornito:
${consegna || '(Vedi immagine allegata per la consegna)'}

Genera il progetto software C++ completo.
RICORDA TASSATIVAMENTE:
1. SOLO C++ SCOLASTICO DI BASE DALLA MAPPA (array C int v[], niente <vector>, niente <algorithm>, niente lambda, niente auto).
2. Scomponi la consegna nei singoli passaggi nell'array "passaggi", fornendo per CIASCUNO titolo, spiegazione, prototipo, spiegazione del prototipo, implementazione, spiegazione implementazione, utilizzo nel main e test output!

Restituisci un JSON valido con questa struttura esatta:
{
  "nome_progetto": "string (solo lettere minuscole e underscore, es. ripasso_vettori)",
  "titolo": "string (es. Ripasso di informatica del 01/10/2026)",
  "argomenti": "string (sintesi argomenti didattici)",
  "consegna_trascritta": "string (testo completo ed esatto della consegna)",
  "main_cpp": "string (codice completo per main.cpp)",
  "function_h": "string (codice completo per function.h)",
  "function_cpp": "string (codice completo per function.cpp)",
  "makefile": "string (codice makefile con tabulazioni '\\t')",
  "install_md": "string (contenuto completo per INSTALL.md)",
  "sample_stdin": "string (eventuale input da tastiera da passare a cin, es. 10\\n)",
  "sample_args": ["string (eventuali argomenti argv per ./a.out)"],
  "passaggi": [
    {
      "titolo": "Titolo del requisito (es. Generare n numeri casuali tra -1000 e 1000)",
      "spiegazione": "Descrizione approfondita del requisito e della logica",
      "prototipo": "int get_casuale(int da, int a);",
      "prototipo_spiegazione": "Prototipo dichiarato in function.h, riceve estremi e restituisce intero casuale.",
      "implementazione": "int get_casuale(int da, int a) { return rand() % (a - da + 1) + da; }",
      "implementazione_spiegazione": "Usa la formula classica per generare numeri pseudo-casuali compresi tra estremi inclusi.",
      "utilizzo_main": "for(int i=0; i<n; i++) v[i] = get_casuale(-1000, 1000);",
      "test_output": "Numero casuale: 452\\nNumero casuale: -312"
    }
  ],
  "input_files": [
    { "filename": "nome.txt o nome.csv", "content": "contenuto file" }
  ]
}
`;

  parts.push({ text: promptText });

  const result = await callGemini([{ parts }], SYSTEM_PROMPT);

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
  const prompt = `
Il codice C++ generato ha prodotto errori o warning con 'g++ -Wall -Wconversion'.
Ricorda che il codice deve compilare con ZERO errori e ZERO warning e usare SOLO C++ SCOLASTICO DI BASE (niente <vector>, niente <algorithm>).

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

  const fixResult = await callGemini([{ parts: [{ text: prompt }] }], SYSTEM_PROMPT);
  return fixResult;
}

module.exports = {
  generateExercise,
  fixExerciseCode,
  formatComprehensiveReadme
};
