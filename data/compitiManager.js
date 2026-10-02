const fs = require('fs');
const path = require('path');
const os = require('os');

// In Vercel Serverless environment, only /tmp is writable
const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'copiapicchio-data')
  : path.join(__dirname, '..', 'data');

const COMPITI_FILE = path.join(DATA_DIR, 'compiti.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// In-memory fallback stores (prevent crashes if disk is read-only)
const memorySessions = new Map();
let memoryCompiti = [];

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

// Sessions management
function loadSessions() {
  const map = new Map();
  const arr = readJson(SESSIONS_FILE, []);
  for (const s of arr) {
    map.set(s.token, {
      username: s.username,
      loginTime: s.loginTime,
      isAdmin: s.isAdmin,
      email: s.email,
      userId: s.userId
    });
  }
  // Include existing memory sessions
  for (const [k, v] of memorySessions.entries()) {
    map.set(k, v);
  }
  return map;
}

function persistSessions(sessionsMap) {
  for (const [token, val] of sessionsMap.entries()) {
    memorySessions.set(token, val);
  }
  const arr = [];
  for (const [token, val] of sessionsMap.entries()) {
    arr.push({ token, ...val });
  }
  writeJson(SESSIONS_FILE, arr);
}

// Compiti management
function getCompiti() {
  const disk = readJson(COMPITI_FILE, []);
  if (disk.length > 0) return disk;
  return memoryCompiti;
}

function saveCompito(compito) {
  const compiti = getCompiti();
  const idx = compiti.findIndex(c => c.id === compito.id);
  if (idx >= 0) {
    compiti[idx] = compito;
  } else {
    compiti.unshift(compito); // latest first
  }
  
  const memIdx = memoryCompiti.findIndex(c => c.id === compito.id);
  if (memIdx >= 0) {
    memoryCompiti[memIdx] = compito;
  } else {
    memoryCompiti.unshift(compito);
  }

  writeJson(COMPITI_FILE, compiti);
  return compito;
}

function getCompitiByUser(username) {
  const clean = (username || '').toLowerCase().trim();
  const compiti = getCompiti();
  return compiti
    .filter(c => c.user === clean)
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

function getCompitoById(id) {
  const compiti = getCompiti();
  return compiti.find(c => c.id === id);
}

function deleteCompito(id, username) {
  const clean = (username || '').toLowerCase().trim();
  const compiti = getCompiti();
  const filtered = compiti.filter(c => !(c.id === id && c.user === clean));
  memoryCompiti = memoryCompiti.filter(c => !(c.id === id && c.user === clean));
  writeJson(COMPITI_FILE, filtered);
  return filtered.length !== compiti.length;
}

module.exports = {
  loadSessions,
  persistSessions,
  getCompiti,
  saveCompito,
  getCompitiByUser,
  getCompitoById,
  deleteCompito
};
