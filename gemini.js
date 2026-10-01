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
      timeout: 90000
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
      reject(new Error('Timeout richiesta Gemini (90s)'));
    });

    req.write(payload);
    req.end();
  });
}

const SYSTEM_PROMPT = `
Sei l'assistente ufficiale di "CopiaPicchio!", il sistema didattico per la risoluzione e generazione di progetti di compiti di informatica in C++ secondo rigorose convenzioni scolastiche.

REGOLE TASSATIVE:
1. NON USARE MAI il nome "Daniel Diemoz" né "diemoz". Se non specificato diversamente, l'autore è "Nome e Cognome".
2. Struttura del progetto C++ a 3 file:
   - "function.h": Include guards esatte:
     #ifndef FUNCTION_H
     #define FUNCTION_H " funzione"
     #include <iostream>
     #include <fstream>
     #include <cstdlib>
     #include <ctime>
     #include <string>
     using namespace std;
     // prototipi con commenti chiari
     #endif
   - "function.cpp": Include "function.h". Implementazione pulita di tutte le funzioni richieste.
   - "main.cpp": Include "function.h". Gestione di argc/argv se utile o previsto, gestione cin, chiamate ordinate ai test e alle funzioni. Nel main() è OBBLIGATORIO:
     srand((unsigned int)time(NULL));
3. REGOLA D'ORO DEL COMPILATORE (-Wall -Wconversion):
   Il codice verrà compilato con: g++ -Wall -Wconversion
   NON deve esserci NESSUN warning e NESSUN errore.
   - In srand() usare SEMPRE il cast: (unsigned int)time(NULL)
   - Nelle divisioni aritmetiche, cast espliciti: (double)somma / (double)n
   - Se usi string::size() o vector::size(), fai il cast a (int) prima di confrontare con indici int, oppure usa tipi coerenti per evitare warning di conversione di segno.
   - Per I/O da file:
     * File input: verificare sempre if (!f_in.is_open()) { cerr << "Errore apertura file..." << endl; return 3; }
     * File output: prima di sovrascrivere, controllare se esiste già aprendolo in sola lettura con ifstream:
       ifstream f_check(nome_file);
       if (f_check.is_open()) { cerr << "Il file esiste già!" << endl; return 2; }
4. MAKEFILE:
   I comandi dentro il makefile DEVONO usare caratteri TAB (\t) per l'indentazione.
   I target obbligatori sono:
   - a.out: function.o main.o
   - function.o: function.cpp function.h
   - main.o: function.h main.cpp
   - clean: rm -f *.o a.out
   - run: a.out (con ./a.out)
   - doc: pandoc -o README.pdf README.md
5. INSTALL.md:
   Deve contenere esattamente i paragrafi:
   # COMPILAZIONE (comandi g++ singoli e make)
   # ESECUZIONE (./a.out e make run)
   # RISULTATO ATTESO (output realistico della sessione di esecuzione)
   # PULIZIA (make clean)
   # DOCUMENTAZIONE (make doc)
6. README.md (Relazione dell'Esercizio):
   Deve seguire fedelmente questa struttura in Markdown:
   > Autore: {AUTORE}  
   > Classe: {CLASSE}  
   > Data: {DATA}

   # {TITOLO_DOCUMENTO}

   ## Argomenti trattati
   {Spiegazione didattica approfondita degli argomenti affrontati nell'esercizio}

   ## Consegna
   {Testo letterale della consegna}

   ## Svolgimento

   ### Creare un progetto
   Parto dalla skel e creo il nuovo progetto \`{NOME_PROGETTO}\`:
   \`\`\`
   studente@scuola:~/progetti$ cp -ai skel/ {NOME_PROGETTO}
   \`\`\`

   Poi decomponi la consegna in passaggi logici numerati o titolati:
   Per ciascuna funzione o requisito:
   ### <Titolo del requisito>
   #### Prototipo
   Nel \`function.h\`:
   \`\`\`cpp
   ...
   \`\`\`
   #### Implementazione
   Nel \`function.cpp\`:
   \`\`\`cpp
   ...
   \`\`\`
   #### Utilizzo
   Nel \`main.cpp\`:
   \`\`\`cpp
   ...
   \`\`\`
   #### Test
   \`\`\`
   studente@scuola:~/progetti/{NOME_PROGETTO}$ make run
   <output realistico>
   \`\`\`
   Funziona.

   ## Allegati
   ### makefile
   \`\`\`makefile
   ...
   \`\`\`
   ### INSTALL.md
   \`\`\`markdown
   ...
   \`\`\`
   ### function.h
   \`\`\`cpp
   ...
   \`\`\`
   ### function.cpp
   \`\`\`cpp
   ...
   \`\`\`
   ### main.cpp
   \`\`\`cpp
   ...
   \`\`\`

   ## Fonti
   - Documentazione cplusplus.com
   - W3Schools C++
   - Dispense del docente

   ## Problemi riscontrati
   {Riflessioni tecniche su gestione warning -Wconversion, tipi dati, conversioni, controlli I/O}

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

7. Restituisci ESCLUSIVAMENTE un JSON con i campi indicati.
`;

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
      text: "Questa è la foto della consegna dell'esercizio (es. lavagna, quaderno o foglio stampato). Trascrivila accuratamente e risolvi l'esercizio completando tutti i file del progetto."
    });
  }

  const promptText = `
Dati per l'esercizio:
- Autore: ${autore || 'Nome e Cognome'}
- Classe: ${classe || '3B IT'}
- Data: ${data || new Date().toLocaleDateString('it-IT')}
- Nome Progetto preferito: ${nomeProgetto || 'auto-genera in snake_case (es. ripasso_vettori)'}
- Argomenti indicati (se forniti): ${argomenti || 'Dedurli accuratamente dalla consegna'}
- Testo consegna aggiuntivo o fornito:
${consegna || '(Vedi immagine allegata per la consegna)'}

Genera il progetto software C++ completo, impeccabile e conforme alle severe regole didattiche del docente.
Restituisci un JSON valido con questa struttura esatta:
{
  "nome_progetto": "string (solo lettere minuscole e underscore, es. calcolo_medie)",
  "titolo": "string (es. Esercizi di informatica assegnati il ...)",
  "argomenti": "string (sintesi argomenti didattici)",
  "consegna_trascritta": "string (testo completo ed esatto della consegna)",
  "main_cpp": "string (codice completo per main.cpp)",
  "function_h": "string (codice completo per function.h)",
  "function_cpp": "string (codice completo per function.cpp)",
  "makefile": "string (codice makefile con tabulazioni '\\t')",
  "install_md": "string (contenuto completo per INSTALL.md)",
  "readme_md": "string (contenuto completo per README.md come specificato)",
  "sample_stdin": "string (eventuale input da tastiera da passare al programma durante il test, se usa cin)",
  "sample_args": ["string (eventuali argomenti da riga di comando per ./a.out)"],
  "input_files": [
    { "filename": "nome.txt o nome.csv", "content": "contenuto file" }
  ]
}
`;

  parts.push({ text: promptText });

  const result = await callGemini([{ parts }], SYSTEM_PROMPT);
  return result;
}

/**
 * Self-healing pass: if compilation produces errors or warnings, Gemini fixes it.
 */
async function fixExerciseCode({ projectData, compilerOutput }) {
  const prompt = `
Il codice C++ generato ha prodotto errori o warning con 'g++ -Wall -Wconversion'.
Ricorda che il codice deve compilare con ZERO errori e ZERO warning!

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
  fixExerciseCode
};
