# 🦜 CopiaPicchio!

> Generatore intelligente di compiti e progetti di informatica C++ basato su **Gemini 3.1 Flash Lite** e conforme alla mappa didattica della classe 3B IT.

---

## 🌟 Caratteristiche Principali

- 📸 **Input Multimodale Flessibile**:
  - Incolla il testo della consegna o trascina una foto (della lavagna, quaderno o compito stampato).
  - Supporto per **incollare direttamente screenshot da tastiera (`Ctrl+V`)** ovunque nella pagina.
- 🤖 **Motore AI Gemini 3.1 Flash Lite**:
  - Comprensione della consegna e scomposizione nei passaggi logici formali richiesti dal docente.
  - Generazione dell'architettura C++ modulare a 3 file.
- ⚙️ **Verifica Locale del Compilatore (`g++ -Wall -Wconversion`)**:
  - Compilazione automatica in tempo reale.
  - Verifica di **ZERO warning e ZERO errori** (cast espliciti su `time()`, divisioni e conversioni).
  - Auto-guarigione (self-healing pass con Gemini) in caso di anomalie.
- 🧪 **Esecuzione Reale e Cattura Output**:
  - Esegue `./a.out` e registra l'output reale da inserire nella relazione.
- 📄 **Generazione Documentazione e File di Progetto**:
  - `main.cpp`
  - `function.h` (include guards `#ifndef FUNCTION_H`, librerie standard, prototipi)
  - `function.cpp` (implementazioni ausiliarie)
  - `makefile` (target `a.out`, `function.o`, `main.o`, `clean`, `run`, `doc` formattati con caratteri TAB)
  - `INSTALL.md` (sezioni: `# COMPILAZIONE`, `# ESECUZIONE`, `# RISULTATO ATTESO`, `# PULIZIA`, `# DOCUMENTAZIONE`)
  - `README.md` (relazione strutturata secondo gli standard scolastici con codice purple `:not(pre) > code` e indice dei requisiti)
  - `COPYING` & `gpl-3.0.txt` (licenza didattica GNU GPL v3)
- 📦 **Download Diretto in ZIP**:
  - Con un solo clic scarichi l'intera cartella `<nome_progetto>.zip` pronta per la consegna.
- 🖨️ **Stampa e Salvataggio PDF**:
  - Layout CSS print-ready ottimizzato per A4 e consegna cartacea o PDF.
- 🔒 **Area Riservata con Autenticazione**:
  - Accesso protetto tramite credenziali dedicate.

---

## 🔑 Credenziali di Accesso

La piattaforma dispone di due account abilitati:

| Nome Utente | Password |
|---|---|
| `matty` | `Triathlon01` |
| `zome` | `zome01` |

*(Sono presenti anche pulsanti di accesso rapido nella schermata di login).*

---

## 🚀 Avvio Rapido in Locale

### Prerequisiti
- **Node.js** (v18+)
- **g++** (GCC con supporto C++11 o superiore)

### Installazione ed Esecuzione

```bash
# 1. Clona o apri la cartella del progetto
cd papa-diemoz-esercizi

# 2. Installa le dipendenze
npm install

# 3. Avvia il server
npm start
```

Il server sarà accessibile su:
👉 **http://localhost:3000**

---

## 📁 Struttura della Repository

```
├── server.js              # Server Express, routing API e gestione sessioni
├── gemini.js              # Client Gemini 3.1 Flash Lite con fallback automatico
├── compiler.js            # Wrapper locale per g++ -Wall -Wconversion ed esecuzione
├── package.json           # Dipendenze e script npm
├── public/                # Frontend Web Application
│   ├── index.html         # Interfaccia utente single-page
│   ├── style.css          # Design scuro moderno, stile scolastico e regole print
│   └── app.js             # Logica client (upload foto, paste, tabs, export)
├── resources/
│   ├── skel/              # Template di licenza (COPYING, gpl-3.0.txt)
│   └── templates/         # Template didattici della skill
├── references/            # Documentazione convenzioni didattiche C++
└── examples/              # Esempi di riferimento
```

---

## 🛡️ Note sulla Privacy e Stile
Tutti i documenti generati sostituiscono automaticamente qualsiasi dato personale con **"Nome e Cognome"** (o l'autore personalizzato scelto nell'interfaccia) per la massima privacy e conformità didattica.
