const fs = require('fs');
const path = require('path');
const os = require('os');
const supabaseModule = require('../supabase');

// In Vercel Serverless environment, only /tmp is writable
const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'copiapicchio-data')
  : path.join(__dirname, '..', 'data');

const COMPITI_FILE = path.join(DATA_DIR, 'compiti.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// In-memory fallback stores (prevent crashes if disk is read-only)
const memorySessions = new Map();
let memoryCompiti = [];
let hasSyncedFromCloud = false;

// Ensure data directory exists safely without crashing
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[compitiManager] Avviso: directory data non scrivibile su filesystem:', e.message);
}

// Helpers for JSON files
function readJson(file, defaultVal = []) {
  try {
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn(`[compitiManager] Avviso lettura ${file}:`, e.message);
  }
  return defaultVal;
}

function writeJson(file, data) {
  try {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.warn(`[compitiManager] Avviso scrittura ${file} (fallback memoria attivo):`, e.message);
  }
}

// Inizializzazione cloud storage sincronizzato
async function syncFromCloudStorage() {
  if (hasSyncedFromCloud) return;
  hasSyncedFromCloud = true;
  try {
    // 1. Sincronizza sessioni da Supabase Storage se locali sono vuote
    const cloudSessions = await supabaseModule.downloadStorageJson('sessions.json', null);
    if (Array.isArray(cloudSessions) && cloudSessions.length > 0) {
      for (const s of cloudSessions) {
        if (s.token && !memorySessions.has(s.token)) {
          memorySessions.set(s.token, {
            username: (s.username || '').toLowerCase().trim(),
            loginTime: s.loginTime,
            isAdmin: s.isAdmin,
            email: s.email,
            userId: s.userId
          });
        }
      }
      const diskSessions = readJson(SESSIONS_FILE, []);
      if (diskSessions.length === 0) {
        writeJson(SESSIONS_FILE, cloudSessions);
      }
    } else {
      // Se cloud è vuoto ma disk ha sessioni, caricale sul cloud
      const diskSessions = readJson(SESSIONS_FILE, []);
      if (diskSessions.length > 0) {
        supabaseModule.uploadStorageJson('sessions.json', diskSessions).catch(() => {});
      }
    }

    // 2. Sincronizza compiti da Supabase Storage
    const cloudCompiti = await supabaseModule.downloadStorageJson('compiti.json', null);
    const diskCompiti = readJson(COMPITI_FILE, []);
    
    if (Array.isArray(cloudCompiti) && cloudCompiti.length > 0) {
      const mergedMap = new Map();
      for (const c of diskCompiti) {
        if (c.id) mergedMap.set(c.id, c);
      }
      for (const c of cloudCompiti) {
        if (c.id) mergedMap.set(c.id, c);
      }
      const merged = Array.from(mergedMap.values());
      memoryCompiti = merged;
      writeJson(COMPITI_FILE, merged);
    } else if (diskCompiti.length > 0) {
      memoryCompiti = diskCompiti;
      supabaseModule.uploadStorageJson('compiti.json', diskCompiti).catch(() => {});
    }
  } catch (err) {
    console.warn('[compitiManager] Avviso sync da cloud:', err.message);
  }
}

// Avvia sync cloud in background
syncFromCloudStorage().catch(() => {});

// Sessions management
function loadSessions() {
  const map = new Map();
  const arr = readJson(SESSIONS_FILE, []);
  for (const s of arr) {
    map.set(s.token, {
      username: (s.username || '').toLowerCase().trim(),
      loginTime: s.loginTime,
      isAdmin: s.isAdmin,
      email: s.email,
      userId: s.userId
    });
  }
  for (const [k, v] of memorySessions.entries()) {
    map.set(k, v);
  }
  return map;
}

function persistSessions(sessionsMap) {
  const arr = [];
  for (const [token, val] of sessionsMap.entries()) {
    const normVal = {
      ...val,
      username: (val.username || '').toLowerCase().trim()
    };
    memorySessions.set(token, normVal);
    arr.push({ token, ...normVal });
  }
  writeJson(SESSIONS_FILE, arr);
  // Backup asincrono continuo su Supabase Storage
  supabaseModule.uploadStorageJson('sessions.json', arr).catch(() => {});
}

async function findSession(token) {
  if (!token) return null;
  // 1. Cerca in memoria
  if (memorySessions.has(token)) {
    return memorySessions.get(token);
  }
  // 2. Cerca nel file su disco
  const disk = readJson(SESSIONS_FILE, []);
  const found = disk.find(s => s.token === token);
  if (found) {
    const sessionObj = {
      username: (found.username || '').toLowerCase().trim(),
      loginTime: found.loginTime,
      isAdmin: found.isAdmin,
      email: found.email,
      userId: found.userId
    };
    memorySessions.set(token, sessionObj);
    return sessionObj;
  }
  // 3. Cerca nel cloud storage di Supabase
  try {
    const cloudSessions = await supabaseModule.downloadStorageJson('sessions.json', []);
    if (Array.isArray(cloudSessions)) {
      const cloudFound = cloudSessions.find(s => s.token === token);
      if (cloudFound) {
        const sessionObj = {
          username: (cloudFound.username || '').toLowerCase().trim(),
          loginTime: cloudFound.loginTime,
          isAdmin: cloudFound.isAdmin,
          email: cloudFound.email,
          userId: cloudFound.userId
        };
        memorySessions.set(token, sessionObj);
        const updatedDisk = [...disk, { token, ...sessionObj }];
        writeJson(SESSIONS_FILE, updatedDisk);
        return sessionObj;
      }
    }
  } catch (_) {}

  // 4. Se il token è un JWT di Supabase, verificalo
  try {
    const sbUser = await supabaseModule.verifyToken(token);
    if (sbUser) {
      const sessionObj = {
        username: (sbUser.username || '').toLowerCase().trim(),
        loginTime: Date.now(),
        isAdmin: sbUser.isAdmin,
        email: sbUser.email,
        userId: sbUser.userId
      };
      memorySessions.set(token, sessionObj);
      const curDisk = readJson(SESSIONS_FILE, []);
      curDisk.push({ token, ...sessionObj });
      writeJson(SESSIONS_FILE, curDisk);
      supabaseModule.uploadStorageJson('sessions.json', curDisk).catch(() => {});
      return sessionObj;
    }
  } catch (_) {}

  return null;
}

// Compiti management
function getCompiti() {
  const disk = readJson(COMPITI_FILE, []);
  if (disk.length > 0) {
    if (memoryCompiti.length > disk.length) return memoryCompiti;
    memoryCompiti = disk;
    return disk;
  }
  return memoryCompiti;
}

async function getCompitiAsync() {
  try {
    const cloudList = await supabaseModule.downloadStorageJson('compiti.json', null);
    if (Array.isArray(cloudList) && cloudList.length > 0) {
      const mergedMap = new Map();
      for (const c of cloudList) {
        if (c.id) mergedMap.set(c.id, c);
      }
      for (const c of memoryCompiti) {
        if (c.id) mergedMap.set(c.id, c);
      }
      const diskList = readJson(COMPITI_FILE, []);
      for (const c of diskList) {
        if (c.id) mergedMap.set(c.id, c);
      }
      const merged = Array.from(mergedMap.values());
      memoryCompiti = merged;
      writeJson(COMPITI_FILE, merged);
      return merged;
    }
  } catch (_) {}
  return getCompiti();
}

async function saveCompito(compito) {
  // Normalizzazione utente in minuscolo per ricerca affidabile
  if (compito.user) {
    compito.user = compito.user.toLowerCase().trim();
  }

  const compiti = getCompiti();
  const idx = compiti.findIndex(c => c.id === compito.id);
  if (idx >= 0) {
    compiti[idx] = compito;
  } else {
    compiti.unshift(compito);
  }

  const memIdx = memoryCompiti.findIndex(c => c.id === compito.id);
  if (memIdx >= 0) {
    memoryCompiti[memIdx] = compito;
  } else {
    memoryCompiti.unshift(compito);
  }

  writeJson(COMPITI_FILE, compiti);

  // Sincronizzazione immediata e attesa su Supabase Cloud Storage (essenziale su Lambda serverless per non bloccare l'upload prima del completamento)
  try {
    await supabaseModule.saveCompitoSupabase(compito);
  } catch (e) {
    console.warn('[compitiManager] Errore sync cloud compito:', e.message);
  }

  return compito;
}

async function getCompitiByUser(username) {
  const clean = (username || '').toLowerCase().trim();
  const compiti = await getCompitiAsync();

  return compiti
    .filter(c => {
      const cUser = (c.user || '').toLowerCase().trim();
      const cEmail = (c.user_email || '').toLowerCase().trim();
      return cUser === clean || cEmail === clean || cEmail.startsWith(`${clean}@`);
    })
    .map(c => ({
      id: c.id,
      user: c.user,
      createdAt: c.createdAt,
      formattedDate: c.formattedDate,
      nome_progetto: c.nome_progetto,
      titolo: c.titolo,
      consegna_preview: (c.consegna || c.project?.consegna_trascritta || '').slice(0, 120) + '...',
      testSuccess: c.testResult?.success ?? true
    }));
}

async function getCompitoById(id) {
  const compiti = await getCompitiAsync();
  let found = compiti.find(c => c.id === id);
  if (!found) {
    try {
      found = await supabaseModule.downloadStorageJson(`compiti/${id}.json`, null);
      if (found) {
        await saveCompito(found);
      }
    } catch (_) {}
  }
  return found;
}

async function deleteCompito(id, username) {
  const clean = (username || '').toLowerCase().trim();
  const compiti = await getCompitiAsync();

  const filtered = compiti.filter(c => {
    const cUser = (c.user || '').toLowerCase().trim();
    const cEmail = (c.user_email || '').toLowerCase().trim();
    const matchesUser = (cUser === clean || cEmail === clean || cEmail.startsWith(`${clean}@`));
    return !(c.id === id && matchesUser);
  });

  const wasDeleted = filtered.length !== compiti.length;
  if (wasDeleted) {
    memoryCompiti = filtered;
    writeJson(COMPITI_FILE, filtered);
    try {
      await supabaseModule.uploadStorageJson('compiti.json', filtered);
    } catch (_) {}
  }
  return wasDeleted;
}

module.exports = {
  loadSessions,
  persistSessions,
  findSession,
  getCompiti,
  getCompitiAsync,
  saveCompito,
  getCompitiByUser,
  getCompitoById,
  deleteCompito
};
