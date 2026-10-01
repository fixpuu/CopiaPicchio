# 🦜 CopiaPicchio!

> Generatore didattico intelligente di compiti e progetti di informatica C++ basato su **Gemini 3.1 Flash Lite**, integrato con **Supabase**, predisposto per deploy **Serverless su Vercel** e rigorosamente conforme alla mappa didattica della classe 3B IT (senza costrutti avanzati o STL non previsti).

---

## 🌟 Caratteristiche Principali

- 📸 **Input Multimodale (Foto & Testo)**:
  - Incolla il testo della consegna o carica una foto (lavagna, quaderno, foglio stampato).
  - Supporto per **incollare direttamente screenshot da tastiera (`Ctrl+V`)** ovunque nella pagina.
- 🤖 **Motore Didattico Gemini 3.1 Flash Lite**:
  - Comprensione della consegna e scomposizione rigorosa nei requisiti e funzioni.
  - Aderenza assoluta alla mappa didattica (`mappa.mm`) e all'archivio compiti dello studente: **SOLO array C classici (`int v[n]`), Bubble Sort, `iostream`, `fstream`, `cstdlib`, `ctime`, `string`, `struct`**. Nessun container o libreria non svolta (`<vector>`, `<algorithm>`, template STL, puntatori doppi o classi non viste).
- 📐 **Indentazione a Tabulazioni Pure (Hard Tabs `\t`)**:
  - Conforme al 100% all'indentazione dei progetti e makefile della repository originale.
- 📖 **Relazione Tecnica con Spiegazione Dettagliata**:
  - La relazione didattica (`README.md`) contiene una spiegazione passo per passo e riga per riga di ogni funzione creata, inclusi prototipi, implementazioni, chiamate dal `main` ed esecuzione reale.
- ⚙️ **Compilazione & Validazione Serverless**:
  - In locale: compilazione automatica reale tramite `g++ -Wall -Wconversion` con verifica di **0 errori e 0 warning** ed esecuzione di `./a.out`.
  - Su Vercel (Serverless): validazione statica del codice, verifica di conformità al curriculum e simulazione dei test.
- 📁 **Generazione Pacchetto Completo**:
  - `main.cpp`
  - `function.h` (include guards `#ifndef FUNCTION_H`, prototipi)
  - `function.cpp` (implementazioni ausiliarie)
  - `makefile` (target `all`, `a.out`, `function.o`, `main.o`, `clean`, `run`, `doc` con hard tabs)
  - `INSTALL.md` (istruzioni operative standard)
  - `README.md` (relazione con stile purple `:not(pre) > code` e metadati)
  - `COPYING` & `gpl-3.0.txt` (licenza didattica GNU GPL v3)
- 🗂️ **Sezione "I Miei Compiti"**:
  - Storico compiti generati con ricerca immediata, riapertura in visualizzatore, anteprima e download zip.
  - Login automatico memorizzato nel browser.
- 🔒 **Autenticazione con Supabase**:
  - Autenticazione diretta via Supabase Auth: l'amministratore crea gli utenti direttamente nella dashboard di Supabase.

---

## 🔑 Autenticazione (Supabase)

L'applicazione utilizza **Supabase Auth** come provider di autenticazione:
- Non è presente la registrazione pubblica: le credenziali vengono create dal proprietario direttamente dal pannello **Supabase Dashboard** (`Authentication -> Users`).
- In locale o in assenza di URL Supabase configurato, è attivo il fallback sicuro con le credenziali predefinite:
  - `matty` / `Triathlon01`
  - `zome` / `zome01`

---

## ☁️ Deploy su Vercel (Serverless)

Il progetto include già la configurazione per Vercel:
- `vercel.json`: instrada tutte le richieste verso l'handler serverless.
- `api/index.js`: entrypoint serverless Express.

### Variabili d'Ambiente su Vercel
Nel pannello **Vercel -> Settings -> Environment Variables**, imposta:

| Variabile | Descrizione |
|---|---|
| `GEMINI_API_KEY` | Chiave API di Gemini (`AQ.Ab...`) |
| `SUPABASE_URL` | URL del tuo progetto Supabase (`https://<project-ref>.supabase.co`) |
| `SUPABASE_KEY` | Secret Key di Supabase (`sb_secret_...`) |

---

## 🚀 Avvio in Locale

### Prerequisiti
- **Node.js** (v18+)
- **g++** (GCC con supporto C++11 o superiore)

### Istruzioni

```bash
# 1. Clona la repository
git clone https://github.com/fixpuu/CopiaPicchio.git
cd CopiaPicchio

# 2. Installa le dipendenze
npm install

# 3. Configura le credenziali (se non presenti)
cp config.example.json config.json
# Modifica config.json inserendo le tue API key

# 4. Avvia il server locale
npm start
```

Il server sarà accessibile su:
👉 **http://localhost:3000**

---

## 📁 Struttura della Repository

```
├── api/
│   └── index.js           # Serverless Express handler per Vercel
├── server.js              # Server Express, routing API e gestione sessioni
├── supabase.js            # Client Supabase (Auth e Database)
├── gemini.js              # Motore AI Gemini 3.1 Flash Lite e prompt didattico
├── compiler.js            # Wrapper g++ -Wall -Wconversion e validatore serverless
├── vercel.json            # Configurazione deploy serverless su Vercel
├── package.json           # Dipendenze e script npm
├── public/                # Frontend Web Application (Single Page Application responsive)
│   ├── index.html         # Interfaccia utente mobile-friendly
│   ├── style.css          # Design moderno scuro, styling tab e stampa
│   └── app.js             # Logica frontend (upload, auth, visualizzatore compiti)
├── resources/
│   ├── skel/              # Template di licenza (COPYING, gpl-3.0.txt)
│   └── templates/         # Template didattici della skill
└── references/
    └── mappa.mm           # Mappa mentale didattica della classe 3B
```

---

## 🛡️ Note sulla Privacy e Stile
Tutti i documenti generati sostituiscono automaticamente qualsiasi dato personale con **"Nome e Cognome"** (o l'autore specificato) per garantire la massima riservatezza.
