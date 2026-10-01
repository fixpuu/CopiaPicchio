const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const { ZipArchive } = require('archiver');
const crypto = require('crypto');

const { generateExercise, fixExerciseCode } = require('./gemini');
const { testProjectCompilation, ensureMakefileTabs } = require('./compiler');

const app = express();
const PORT = process.env.PORT || 3000;
const COOKIE_SECRET = 'copiapicchio-secret-key-2026';

// Credenziali autorizzate richieste dall'utente
const USERS = {
  'matty': 'Triathlon01',
  'zome': 'zome01'
};

// Memory store per sessioni attive e progetti generati
const activeSessions = new Map();
const generatedProjects = new Map();

// Configurazione Multer per upload file (memoria)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max per foto alta risoluzione
});

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(cookieParser(COOKIE_SECRET));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware di autenticazione
function requireAuth(req, res, next) {
  const token = req.signedCookies?.cp_session || req.headers['x-session-token'];
  if (token && activeSessions.has(token)) {
    req.user = activeSessions.get(token);
    return next();
  }
  return res.status(401).json({ error: 'Non autorizzato. Effettua il login su CopiaPicchio!' });
}

// Sanitizzatore: Rimuove qualsiasi riferimento a Diemoz e inserisce "Nome e Cognome" o autore scelto
function sanitizeProjectOutput(projectData, autore = 'Nome e Cognome') {
  const targetAuthor = (autore && autore.trim()) ? autore.trim() : 'Nome e Cognome';

  const clean = (text) => {
    if (!text || typeof text !== 'string') return text;
    return text
      .replace(/Daniel\s+Diemoz/gi, targetAuthor)
      .replace(/d\.diemoz@ltsp\d*/gi, 'studente@scuola')
      .replace(/diemoz@ltsp\d*/gi, 'studente@scuola')
      .replace(/\/home\/d\.diemoz\/git\/papa_diemoz\//gi, '~/progetti/')
      .replace(/~\/git\/papa_diemoz\//gi, '~/progetti/')
      .replace(/papa_diemoz/gi, 'progetti')
      .replace(/d\.diemoz/gi, 'studente')
      .replace(/diemoz/gi, 'studente');
  };

  const cleanName = (projectData.nome_progetto || 'progetto_informatica')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return {
    ...projectData,
    nome_progetto: cleanName || 'progetto_informatica',
    titolo: clean(projectData.titolo),
    argomenti: clean(projectData.argomenti),
    consegna_trascritta: clean(projectData.consegna_trascritta),
    main_cpp: clean(projectData.main_cpp),
    function_h: clean(projectData.function_h),
    function_cpp: clean(projectData.function_cpp),
    makefile: ensureMakefileTabs(clean(projectData.makefile || '')),
    install_md: clean(projectData.install_md),
    readme_md: clean(projectData.readme_md)
  };
}

// ================= API AUTENTICAZIONE =================

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Inserisci username e password.' });
  }

  const cleanUser = username.trim().toLowerCase();
  const expectedPassword = USERS[cleanUser];

  if (expectedPassword && expectedPassword === password) {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    activeSessions.set(sessionToken, { username: cleanUser, loginTime: Date.now() });

    res.cookie('cp_session', sessionToken, {
      signed: true,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 giorni
    });

    return res.json({ success: true, username: cleanUser, sessionToken });
  }

  return res.status(401).json({ error: 'Username o password errati. Riprova.' });
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.signedCookies?.cp_session || req.headers['x-session-token'];
  if (token) {
    activeSessions.delete(token);
  }
  res.clearCookie('cp_session');
  res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.signedCookies?.cp_session || req.headers['x-session-token'];
  if (token && activeSessions.has(token)) {
    const session = activeSessions.get(token);
    return res.json({ authenticated: true, username: session.username });
  }
  return res.json({ authenticated: false });
});

// ================= API GENERAZIONE ESERCIZIO =================

app.post('/api/generate', requireAuth, upload.single('photo'), async (req, res) => {
  try {
    const { consegna, autore, classe, data, nome_progetto, argomenti } = req.body;
    const photo = req.file;

    if (!consegna && !photo) {
      return res.status(400).json({ error: 'Fornisci il testo della consegna o allega una foto della consegna.' });
    }

    console.log(`[CopiaPicchio!] Nuova richiesta di generazione da utente: ${req.user.username}`);

    let rawProject;
    try {
      rawProject = await generateExercise({
        consegna: consegna || '',
        imageBuffer: photo?.buffer,
        imageMime: photo?.mimetype,
        autore: autore || 'Nome e Cognome',
        classe: classe || '3B IT',
        data: data || new Date().toLocaleDateString('it-IT'),
        nomeProgetto: nome_progetto || '',
        argomenti: argomenti || ''
      });
    } catch (apiErr) {
      console.error('[Gemini API Error]', apiErr);
      return res.status(502).json({ error: `Errore durante la chiamata a Gemini: ${apiErr.message}` });
    }

    // 1. Sanitizzazione Diemoz -> "Nome e Cognome" o autore scelto
    let project = sanitizeProjectOutput(rawProject, autore || 'Nome e Cognome');

    // 2. Verifica compilazione con g++ -Wall -Wconversion
    console.log('[CopiaPicchio!] Verifica compilazione locale g++ -Wall -Wconversion...');
    let testResult = await testProjectCompilation(project);

    // Se ci sono errori/warning, prova auto-guarigione con Gemini
    if (!testResult.success) {
      console.warn(`[CopiaPicchio!] Compilazione fallita (${testResult.phase}). Tento auto-fix con Gemini...`);
      try {
        const fix = await fixExerciseCode({
          projectData: project,
          compilerOutput: testResult.output
        });

        if (fix.function_h && fix.function_cpp && fix.main_cpp) {
          project.function_h = fix.function_h;
          project.function_cpp = fix.function_cpp;
          project.main_cpp = fix.main_cpp;
          project = sanitizeProjectOutput(project, autore || 'Nome e Cognome');

          // Ritesta compilazione
          testResult = await testProjectCompilation(project);
          console.log(`[CopiaPicchio!] Ritest dopo fix: successo = ${testResult.success}`);
        }
      } catch (fixErr) {
        console.warn('[CopiaPicchio!] Auto-fix fallito:', fixErr.message);
      }
    }

    // 3. Salva progetto in memoria con ID univoco
    const projectId = crypto.randomUUID();
    const finalData = {
      id: projectId,
      createdAt: new Date().toISOString(),
      user: req.user.username,
      project,
      testResult,
      photoAttached: !!photo
    };

    generatedProjects.set(projectId, finalData);

    return res.json({
      success: true,
      projectId,
      project,
      testResult
    });
  } catch (err) {
    console.error('[CopiaPicchio!] Errore server non gestito:', err);
    return res.status(500).json({ error: `Errore del server: ${err.message}` });
  }
});

// ================= API DOWNLOAD PROGETTO ZIP =================

app.get('/api/download-zip/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const projectEntry = generatedProjects.get(id);

  if (!projectEntry) {
    return res.status(404).json({ error: 'Progetto non trovato o sessione scaduta.' });
  }

  const { project } = projectEntry;
  const projectName = project.nome_progetto || 'progetto_copiapicchio';

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${projectName}.zip"`);

  const archive = new ZipArchive({ zlib: { level: 9 } });

  archive.on('error', (err) => {
    console.error('[Archiver Error]', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Errore durante la creazione dello ZIP' });
    }
  });

  archive.pipe(res);

  // Inserisci file del progetto all'interno della cartella <nome_progetto>/
  archive.append(project.main_cpp || '', { name: `${projectName}/main.cpp` });
  archive.append(project.function_h || '', { name: `${projectName}/function.h` });
  archive.append(project.function_cpp || '', { name: `${projectName}/function.cpp` });
  archive.append(ensureMakefileTabs(project.makefile || ''), { name: `${projectName}/makefile` });
  archive.append(project.install_md || '', { name: `${projectName}/INSTALL.md` });
  archive.append(project.readme_md || '', { name: `${projectName}/README.md` });

  // Aggiungi COPYING e gpl-3.0.txt da skel
  const copyingPath = path.join(__dirname, 'resources', 'skel', 'COPYING');
  const gplPath = path.join(__dirname, 'resources', 'skel', 'gpl-3.0.txt');

  if (fs.existsSync(copyingPath)) {
    archive.file(copyingPath, { name: `${projectName}/COPYING` });
  } else {
    archive.append('Per la licenza vedi gpl-3.0.txt\n', { name: `${projectName}/COPYING` });
  }

  if (fs.existsSync(gplPath)) {
    archive.file(gplPath, { name: `${projectName}/gpl-3.0.txt` });
  }

  // Eventuali file ausiliari (es. CSV di input, file di testo)
  if (Array.isArray(project.input_files)) {
    for (const item of project.input_files) {
      if (item.filename && item.content) {
        archive.append(item.content, { name: `${projectName}/${item.filename}` });
      }
    }
  }

  archive.finalize();
});

// Avvio del server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🦜 CopiaPicchio! Server attivo su http://localhost:${PORT}`);
  console.log(`🔑 Utenti abilitati: matty, zome`);
  console.log(`🤖 Modello AI: Gemini 3.1 Flash Lite`);
  console.log(`====================================================`);
});
