# 🦜 CopiaPicchio!

> Generatore didattico intelligente di compiti e progetti di informatica C++ basato su **Gemini 3.1 Flash Lite**, integrato con **Supabase**, predisposto per deploy **Serverless su Vercel** e rigorosamente conforme alla mappa didattica della classe 3B IT (senza costrutti avanzati o STL non previsti). Include **Admin Dashboard** riservata e **Sistema a Crediti** per gli utenti.

---

## 🌟 Caratteristiche Principalii

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
- ⚡ **Sistema a Crediti (1 Credito = 1 Generazione)**:
  - I nuovi utenti registrati iniziano automaticamente con **1 credito gratuito**.
  - Ogni generazione di esercizio andata a buon fine scala **1 credito**.
  - Al termine dei crediti (0 crediti), appare la **schermata di blocco** che invita a contattare l'Owner per ricaricare.
- 🛡️ **Admin Dashboard (Riservata a 2 Account)**:
  - Accessibile unicamente dai due account designati: `matty` e `zome`.
  - Visualizzazione in tempo reale di tutti gli utenti registrati su Supabase.
  - Assegnazione rapida crediti (`+1`, `+5`, `-1`, impostazione valore esatto).
  - Creazione diretta di nuovi account con crediti iniziali personalizzati.
  - Eliminazione account utente (con protezione per gli account admin).
- 🗂️ **Sezione "I Miei Compiti"**:
  - Storico compiti generati con ricerca immediata, riapertura in visualizzatore, anteprima e download zip.
  - Login automatico memorizzato nel browser.
- 🔒 **Autenticazione con Supabase**:
  - Autenticazione diretta via Supabase Auth senza form di auto-registrazione pubblica.

---

## 🔑 Autenticazione e Account Admin

L'accesso è gestito tramite **Supabase Auth**:
- Solo login: i nuovi studenti vengono creati dall'amministratore (dalla dashboard Supabase o direttamente dall'apposita modale nella Admin Dashboard).
- I due account amministratori abilitati sono:

| Nome Utente | Email Supabase | Ruolo |
|---|---|---|
| `matty` | `matty@copiapicchio.it` | 👑 Amministratore (Crediti Illimitati) |
| `zome` | `zome@copiapicchio.it` | 👑 Amministratore (Crediti Illimitati) |

---

## ⚡ Regole del Sistema Crediti

1. **Credito iniziale**: Ogni nuovo utente creato parte con **1 credito**.
2. **Consumo**: **1 credito = 1 generazione completa** (codice modulare C++ 3B, zero warning, makefile e relazione passo per passo).
3. **Crediti esauriti**: Se un utente raggiunge **0 crediti**, la generazione viene inibita e compare la modale per **contattare l'Owner** (via Telegram, WhatsApp o di persona) per acquistare una ricarica.
4. **Pannello Admin**: Gli amministratori possono aumentare, diminuire o impostare i crediti di qualsiasi utente in qualsiasi momento.

---

## ☁️ Deploy su Vercel (Serverless)

Il progetto include già la configurazione per Vercel:
- `vercel.json`: instrada tutte le richieste verso l'handler serverless.
- `api/index.js`: entrypoint serverless Express.

### Variabili d'Ambiente su Vercel
Nel pannello del tuo progetto su **Vercel -> Settings -> Environment Variables**, aggiungi le seguenti chiavi (seleziona per tutti gli ambienti: *Production*, *Preview*, *Development*):

| Nome Variabile (Key) | Valore Richiesto (Value) | Descrizione |
|---|---|---|
| `GEMINI_API_KEY` | `AIzaSy...` | Chiave API di Google Gemini (da [Google AI Studio](https://aistudio.google.com/app/apikey)) |
| `SUPABASE_URL` | `https://tuoprogetto.supabase.co` | URL del progetto Supabase (da Project Settings -> Data API -> Project URL) |
| `SUPABASE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` | **Chiave Segreta `service_role` (Secret)** di Supabase (da Project Settings -> Data API -> Project API keys -> `service_role`). **Nota:** NON usare la chiave `anon`! |

*(Opzionale: `COOKIE_SECRET` con una stringa casuale a scelta).*

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
├── server.js              # Server Express, routing API, auth e gestione crediti
├── supabase.js            # Client Supabase Admin, gestione crediti e permessi
├── gemini.js              # Motore AI Gemini 3.1 Flash Lite e prompt didattico 3B
├── compiler.js            # Wrapper g++ -Wall -Wconversion e validatore serverless
├── vercel.json            # Configurazione deploy serverless su Vercel
├── package.json           # Dipendenze e script npm
├── public/                # Frontend Web Application (Single Page Application responsive)
│   ├── index.html         # Interfaccia con Admin Dashboard, contatta owner e crediti
│   ├── style.css          # Design moderno scuro, styling admin, pill crediti e print
│   └── app.js             # Logica frontend (upload, crediti, admin table, tabs)
├── resources/
│   ├── skel/              # Template di licenza (COPYING, gpl-3.0.txt)
│   └── templates/         # Template didattici della skill
└── references/
    └── mappa.mm           # Mappa mentale didattica della classe 3B
```

---

## 🛡️ Note sulla Privacy e Stile
Tutti i documenti generati sostituiscono automaticamente qualsiasi dato personale con **"Nome e Cognome"** (o l'autore specificato) per garantire la massima riservatezza.
