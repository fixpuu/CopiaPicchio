const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const archiver = require('archiver');
const crypto = require('crypto');

const { generateExercise, fixExerciseCode, formatComprehensiveReadme } = require('./gemini');
const { testProjectCompilation, ensureMakefileTabs, formatCppWithTabs } = require('./compiler');
const compitiManager = require('./data/compitiManager');
const supabaseModule = require('./supabase');

const app = express();
const PORT = process.env.PORT || 3000;
const COOKIE_SECRET = process.env.COOKIE_SECRET || 'copiapicchio-secret-key-2026';

// Credenziali locali autorizzate (fallback prima di configurare SUPABASE_URL)
const USERS = {
  'matty': 'Triathlon01',
  'zome': 'zome01'
};

// Memory store per sessioni attive (sincronizzato con data/sessions.json)
const activeSessions = compitiManager.loadSessions();
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

// Endpoint di stato e verifica configurazione
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'CopiaPicchio',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    supabaseConfigured: supabaseModule.isConfigured()
  });
});

// Fallback per root (se eseguito come server monolitico o invocato direttamente)
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return res.json({ name: 'CopiaPicchio API', status: 'running' });
});

// Middleware di autenticazione (supporta cookie o header x-session-token da localStorage)
function requireAuth(req, res, next) {
  const token = req.headers['x-session-token'] || req.signedCookies?.cp_session;
  if (token && activeSessions.has(token)) {
    req.user = activeSessions.get(token);
    req.sessionToken = token;
    return next();
  }
  return res.status(401).json({ error: 'Non autorizzato. Effettua il login su CopiaPicchio!' });
}

// Sanitizzatore: Rimuove qualsiasi riferimento a Diemoz, imposta tabulazioni C++ e autore
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
    main_cpp: formatCppWithTabs(clean(projectData.main_cpp)),
    function_h: formatCppWithTabs(clean(projectData.function_h)),
    function_cpp: formatCppWithTabs(clean(projectData.function_cpp)),
    makefile: ensureMakefileTabs(clean(projectData.makefile || '')),
    install_md: clean(projectData.install_md),
    readme_md: clean(projectData.readme_md)
  };
}

// Middleware di autorizzazione admin (accessibile solo ai 2 account: matty, zome)
function requireAdmin(req, res, next) {
  const token = req.headers['x-session-token'] || req.signedCookies?.cp_session;
  if (token && activeSessions.has(token)) {
    const session = activeSessions.get(token);
    if (supabaseModule.isUserAdmin(session)) {
      req.user = session;
      req.sessionToken = token;
      return next();
    }
    return res.status(403).json({ error: 'Accesso negato. Solo gli account amministratori autorizzati (matty, zome) possono accedere a questa sezione.' });
  }
  return res.status(401).json({ error: 'Non autorizzato. Effettua il login come amministratore.' });
}

// ================= API AUTENTICAZIONE =================

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Inserisci email o username e password.' });
  }

  const cleanUser = username.trim();

  // 1. Se Supabase è configurato, usa Supabase Auth
  if (supabaseModule.isConfigured()) {
    try {
      const { user, session, credits, isAdmin } = await supabaseModule.loginWithSupabase(cleanUser, password);
      const sessionToken = session?.access_token || crypto.randomBytes(32).toString('hex');
      const userIdentifier = user.user_metadata?.username || user.email.split('@')[0];

      activeSessions.set(sessionToken, {
        username: userIdentifier,
        email: user.email,
        userId: user.id,
        isAdmin,
        loginTime: Date.now()
      });
      compitiManager.persistSessions(activeSessions);

      res.cookie('cp_session', sessionToken, {
        signed: true,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 giorni
      });

      return res.json({
        success: true,
        username: userIdentifier,
        email: user.email,
        credits,
        isAdmin,
        sessionToken
      });
    } catch (sbErr) {
      console.warn('[Supabase Auth Error]:', sbErr.message);
      return res.status(401).json({ error: `Login fallito: ${sbErr.message}` });
    }
  }

  // 2. Fallback locale se SUPABASE_URL non è impostato
  const userLower = cleanUser.toLowerCase();
  const expectedPassword = USERS[userLower];

  if (expectedPassword && expectedPassword === password) {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const isAdmin = supabaseModule.isUserAdmin({ username: userLower });
    const { credits } = await supabaseModule.getUserCredits({ username: userLower });

    activeSessions.set(sessionToken, {
      username: userLower,
      isAdmin,
      loginTime: Date.now()
    });
    compitiManager.persistSessions(activeSessions);

    res.cookie('cp_session', sessionToken, {
      signed: true,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      username: userLower,
      credits,
      isAdmin,
      sessionToken,
      note: 'Accesso locale (imposta SUPABASE_URL su Vercel o config.json per il cloud).'
    });
  }

  return res.status(401).json({ error: 'Credenziali non valide.' });
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers['x-session-token'] || req.signedCookies?.cp_session;
  if (token) {
    activeSessions.delete(token);
    compitiManager.persistSessions(activeSessions);
  }
  res.clearCookie('cp_session');
  res.json({ success: true });
});

app.get('/api/auth/me', async (req, res) => {
  const token = req.headers['x-session-token'] || req.signedCookies?.cp_session;
  if (token && activeSessions.has(token)) {
    const session = activeSessions.get(token);
    const { credits, isAdmin } = await supabaseModule.getUserCredits(session);
    return res.json({
      authenticated: true,
      username: session.username,
      email: session.email,
      credits,
      isAdmin,
      sessionToken: token
    });
  }
  return res.json({ authenticated: false });
});

// Recupero crediti utente
app.get('/api/user/credits', requireAuth, async (req, res) => {
  const info = await supabaseModule.getUserCredits(req.user);
  res.json({ success: true, ...info });
});

// ================= API I MIEI COMPITI =================

app.get('/api/compiti', requireAuth, async (req, res) => {
  // Prova da Supabase se configurato
  const cloudList = await supabaseModule.getCompitiSupabase(req.user.username);
  if (cloudList && cloudList.length > 0) {
    const formatted = cloudList.map(c => ({
      id: c.id,
      user: c.user_email?.split('@')[0] || req.user.username,
      createdAt: c.created_at,
      formattedDate: c.formatted_date,
      nome_progetto: c.nome_progetto,
      titolo: c.titolo,
      consegna_preview: (c.consegna || '').slice(0, 120) + '...',
      testSuccess: c.test_result?.success ?? true
    }));
    return res.json({ success: true, compiti: formatted });
  }

  // Altrimenti archivio locale / persistente
  const list = compitiManager.getCompitiByUser(req.user.username);
  res.json({ success: true, compiti: list });
});

app.get('/api/compiti/:id', requireAuth, (req, res) => {
  const compito = compitiManager.getCompitoById(req.params.id);
  if (!compito || compito.user !== req.user.username) {
    return res.status(404).json({ error: 'Compito non trovato.' });
  }
  res.json({ success: true, compito });
});

app.delete('/api/compiti/:id', requireAuth, (req, res) => {
  const ok = compitiManager.deleteCompito(req.params.id, req.user.username);
  if (!ok) {
    return res.status(404).json({ error: 'Compito non trovato o già eliminato.' });
  }
  res.json({ success: true });
});

// ================= API ADMIN DASHBOARD =================
// Accessibile rigorosamente solo ai 2 account amministratori (matty, zome)

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await supabaseModule.listAllUsers();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ error: `Errore caricamento lista utenti: ${err.message}` });
  }
});

app.post('/api/admin/users/:id/credits', requireAdmin, async (req, res) => {
  try {
    const { delta, credits } = req.body;
    const userId = req.params.id;

    let result;
    if (delta !== undefined) {
      result = await supabaseModule.adjustUserCredits(userId, parseInt(delta, 10));
    } else if (credits !== undefined) {
      result = await supabaseModule.updateUserCredits(userId, parseInt(credits, 10));
    } else {
      return res.status(400).json({ error: 'Specifica delta (+1/-1) oppure un valore esatto di crediti.' });
    }

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: `Errore aggiornamento crediti: ${err.message}` });
  }
});

app.post('/api/admin/users/create', requireAdmin, async (req, res) => {
  try {
    const { email, password, username, credits } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password sono obbligatori.' });
    }
    const user = await supabaseModule.createNewUser({ email, password, username, credits });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: `Errore creazione utente: ${err.message}` });
  }
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    await supabaseModule.deleteUser(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: `Errore eliminazione utente: ${err.message}` });
  }
});

// ================= API GENERAZIONE ESERCIZIO =================

app.post('/api/generate', requireAuth, upload.single('photo'), async (req, res) => {
  try {
    const { consegna, autore, classe, data, nome_progetto, argomenti } = req.body;
    const photo = req.file;

    if (!consegna && !photo) {
      return res.status(400).json({ error: 'Fornisci il testo della consegna o allega una foto della consegna.' });
    }

    // 1. Verifica disponibilità crediti (1 credito = 1 generazione)
    const userCreditInfo = await supabaseModule.getUserCredits(req.user);
    if (!userCreditInfo.isAdmin && userCreditInfo.credits <= 0) {
      return res.status(403).json({
        error: 'CREDITS_EXHAUSTED',
        message: 'Hai esaurito i crediti disponibili per generare compiti. Contatta l\'owner per acquistare una ricarica.'
      });
    }

    console.log(`[CopiaPicchio!] Nuova richiesta di generazione da utente: ${req.user.username} (Crediti: ${userCreditInfo.credits})`);

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

    // 2. Sanitizzazione Diemoz e applicazione formattazione a tabulazioni
    let project = sanitizeProjectOutput(rawProject, autore || 'Nome e Cognome');

    // 3. Verifica compilazione (in locale con g++ o serverless con validatore)
    console.log('[CopiaPicchio!] Verifica compilazione C++...');
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

          testResult = await testProjectCompilation(project);
          console.log(`[CopiaPicchio!] Ritest dopo fix: successo = ${testResult.success}`);
        }
      } catch (fixErr) {
        console.warn('[CopiaPicchio!] Auto-fix fallito:', fixErr.message);
      }
    }

    // Aggiorna la relazione con spiegazioni riga per riga e output reale dell'esecuzione
    project.readme_md = formatComprehensiveReadme({
      project,
      autore: autore || 'Nome e Cognome',
      classe: classe || '3B IT',
      data: data || new Date().toLocaleDateString('it-IT'),
      testResult
    });
    project = sanitizeProjectOutput(project, autore || 'Nome e Cognome');

    // 4. Salva progetto in memoria, su file e su Supabase
    const projectId = crypto.randomUUID();
    const finalData = {
      id: projectId,
      createdAt: new Date().toISOString(),
      formattedDate: data || new Date().toLocaleDateString('it-IT'),
      user: req.user.username,
      nome_progetto: project.nome_progetto,
      titolo: project.titolo || `Esercizi di informatica del ${data || new Date().toLocaleDateString('it-IT')}`,
      consegna: consegna || project.consegna_trascritta || '',
      project,
      testResult,
      photoAttached: !!photo
    };

    generatedProjects.set(projectId, finalData);
    compitiManager.saveCompito(finalData);

    // Salva asincrono su Supabase
    supabaseModule.saveCompitoSupabase(finalData).catch(() => {});

    // 5. Consuma 1 credito se utente non amministratore
    let remainingCredits = userCreditInfo.credits;
    try {
      remainingCredits = await supabaseModule.consumeCredit(req.user);
    } catch (cErr) {
      console.warn('[Credits] Avviso decremento crediti:', cErr.message);
    }

    return res.json({
      success: true,
      projectId,
      project,
      testResult,
      remainingCredits
    });
  } catch (err) {
    console.error('[CopiaPicchio!] Errore server non gestito:', err);
    return res.status(500).json({ error: `Errore del server: ${err.message}` });
  }
});

// ================= API DOWNLOAD PROGETTO ZIP =================

app.get('/api/download-zip/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  
  let projectEntry = generatedProjects.get(id);
  if (!projectEntry) {
    projectEntry = compitiManager.getCompitoById(id);
  }

  if (!projectEntry) {
    return res.status(404).json({ error: 'Progetto non trovato.' });
  }

  const { project } = projectEntry;
  const projectName = project.nome_progetto || 'progetto_copiapicchio';

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${projectName}.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.on('error', (err) => {
    console.error('[Archiver Error]', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Errore durante la creazione dello ZIP' });
    }
  });

  archive.pipe(res);

  // Inserisci file del progetto all'interno della cartella <nome_progetto>/
  archive.append(formatCppWithTabs(project.main_cpp || ''), { name: `${projectName}/main.cpp` });
  archive.append(formatCppWithTabs(project.function_h || ''), { name: `${projectName}/function.h` });
  archive.append(formatCppWithTabs(project.function_cpp || ''), { name: `${projectName}/function.cpp` });
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

  if (Array.isArray(project.input_files)) {
    for (const item of project.input_files) {
      if (item.filename && item.content) {
        archive.append(item.content, { name: `${projectName}/${item.filename}` });
      }
    }
  }

  archive.finalize();
});

// Esporta app per ambiente serverless Vercel
module.exports = app;

// Avvio locale quando eseguito direttamente con 'node server.js'
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🦜 CopiaPicchio! Server attivo su http://localhost:${PORT}`);
    console.log(`⚡ Pronto per deploy Serverless su Vercel`);
    console.log(`🔒 Supabase Auth & Storage integrati`);
    console.log(`====================================================`);
  });
}
