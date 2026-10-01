const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const COMPITI_FILE = path.join(DATA_DIR, 'compiti.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helpers for JSON files
function readJson(file, defaultVal = []) {
  try {
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error(`Errore lettura ${file}:`, e.message);
  }
  return defaultVal;
}

function writeJson(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error(`Errore scrittura ${file}:`, e.message);
  }
}

// Sessions management
function loadSessions() {
  const map = new Map();
  const arr = readJson(SESSIONS_FILE, []);
  for (const s of arr) {
    map.set(s.token, { username: s.username, loginTime: s.loginTime });
  }
  return map;
}

function persistSessions(sessionsMap) {
  const arr = [];
  for (const [token, val] of sessionsMap.entries()) {
    arr.push({ token, username: val.username, loginTime: val.loginTime });
  }
  writeJson(SESSIONS_FILE, arr);
}

// Compiti management
function getCompiti() {
  return readJson(COMPITI_FILE, []);
}

function saveCompito(compito) {
  const compiti = getCompiti();
  // If already exists, update
  const idx = compiti.findIndex(c => c.id === compito.id);
  if (idx >= 0) {
    compiti[idx] = compito;
  } else {
    compiti.unshift(compito); // latest first
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
