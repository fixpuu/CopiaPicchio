const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let SUPABASE_URL = process.env.SUPABASE_URL;
let SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
let ADMIN_ACCOUNTS = ['matty', 'zome'];

if (!SUPABASE_URL || !SUPABASE_KEY) {
  try {
    const config = require('./config.json');
    if (!SUPABASE_URL) SUPABASE_URL = config.SUPABASE_URL;
    if (!SUPABASE_KEY) SUPABASE_KEY = config.SUPABASE_KEY;
    if (config.ADMIN_USERS && Array.isArray(config.ADMIN_USERS)) {
      ADMIN_ACCOUNTS = config.ADMIN_USERS.map(u => u.toLowerCase().trim());
    }
  } catch (_) {}
}

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    console.log('[Supabase] Client inizializzato con successo con URL:', SUPABASE_URL);
  } catch (e) {
    console.warn('[Supabase] Errore inizializzazione client:', e.message);
  }
}

const os = require('os');

// Fallback locale per crediti (data/credits.json o /tmp su Vercel)
const CREDITS_FILE = process.env.VERCEL
  ? path.join(os.tmpdir(), 'copiapicchio-data', 'credits.json')
  : path.join(__dirname, 'data', 'credits.json');
let localCredits = {};
try {
  if (fs.existsSync(CREDITS_FILE)) {
    localCredits = JSON.parse(fs.readFileSync(CREDITS_FILE, 'utf8'));
  }
} catch (_) {
  localCredits = {};
}

function saveLocalCredits() {
  try {
    const dir = path.dirname(CREDITS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CREDITS_FILE, JSON.stringify(localCredits, null, 2), 'utf8');
  } catch (_) {}
}

/**
 * Verifica se un utente è uno dei 2 account Admin autorizzati ('matty', 'zome')
 */
function isUserAdmin(user) {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  const username = (user.user_metadata?.username || user.username || email.split('@')[0] || '').toLowerCase().trim();

  // Accessibile rigorosamente solo ai 2 account autorizzati
  if (ADMIN_ACCOUNTS.includes(username)) return true;
  if (ADMIN_ACCOUNTS.includes(email)) return true;
  for (const admin of ADMIN_ACCOUNTS) {
    if (email === `${admin}@copiapicchio.it` || email === `${admin}@scuola.it` || email.startsWith(`${admin}@`)) {
      return true;
    }
  }
  return false;
}

/**
 * Risolve l'email reale partendo da username o email inserita
 */
async function resolveEmail(emailOrUsername) {
  const input = emailOrUsername.trim();
  if (input.includes('@')) return input;

  const lower = input.toLowerCase();
  if (lower === 'matty') return 'matty@copiapicchio.it';
  if (lower === 'zome') return 'zome@copiapicchio.it';

  if (supabase) {
    try {
      const { data } = await supabase.auth.admin.listUsers();
      if (data?.users) {
        const found = data.users.find(u => {
          const uName = (u.user_metadata?.username || u.email.split('@')[0] || '').toLowerCase();
          return uName === lower || u.email.toLowerCase().startsWith(lower + '@');
        });
        if (found) return found.email;
      }
    } catch (_) {}
  }

  return `${input}@scuola.it`;
}

/**
 * Autenticazione utente tramite Supabase Auth (solo login)
 */
async function loginWithSupabase(emailOrUsername, password) {
  if (!supabase) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }

  const email = await resolveEmail(emailOrUsername);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw new Error(error.message || 'Credenziali Supabase non valide');
  }

  const user = data.user;
  const isAdmin = isUserAdmin(user);

  // Inizializza crediti se non definiti (1 credito per nuovi utenti, 999 per admin)
  let credits = user.user_metadata?.credits;
  if (credits === undefined || credits === null) {
    credits = isAdmin ? 999 : 1;
    try {
      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: { ...user.user_metadata, credits, is_admin: isAdmin }
      });
      user.user_metadata = { ...user.user_metadata, credits, is_admin: isAdmin };
    } catch (_) {}
  }

  return {
    user,
    session: data.session,
    credits,
    isAdmin
  };
}

/**
 * Ottiene la lista di tutti gli utenti per la Admin Dashboard
 */
async function listAllUsers() {
  if (!supabase) {
    // Fallback locale
    return [
      { id: 'admin-matty', email: 'matty@copiapicchio.it', username: 'matty', credits: 999, isAdmin: true, createdAt: new Date().toISOString() },
      { id: 'admin-zome', email: 'zome@copiapicchio.it', username: 'zome', credits: 999, isAdmin: true, createdAt: new Date().toISOString() }
    ];
  }

  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw new Error(error.message);

  const users = (data?.users || []).map(u => {
    const isAdmin = isUserAdmin(u);
    let credits = u.user_metadata?.credits;
    if (credits === undefined || credits === null) {
      credits = isAdmin ? 999 : 1;
      // Aggiorna in background per persistenza
      supabase.auth.admin.updateUserById(u.id, {
        user_metadata: { ...u.user_metadata, credits, is_admin: isAdmin }
      }).catch(() => {});
    }

    return {
      id: u.id,
      email: u.email,
      username: u.user_metadata?.username || u.email.split('@')[0],
      credits: parseInt(credits, 10) || 0,
      isAdmin,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at
    };
  });

  // Ordina: admin per primi, poi per data di creazione più recente
  return users.sort((a, b) => {
    if (a.isAdmin && !b.isAdmin) return -1;
    if (!a.isAdmin && b.isAdmin) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

/**
 * Recupera i crediti di un utente
 */
async function getUserCredits(userOrIdentifier) {
  const isAdmin = isUserAdmin(userOrIdentifier);
  if (isAdmin) {
    return { credits: 999, isAdmin: true };
  }

  if (!supabase) {
    const key = (typeof userOrIdentifier === 'string') ? userOrIdentifier : userOrIdentifier.username || userOrIdentifier.email;
    const cred = localCredits[key] !== undefined ? localCredits[key] : 1;
    return { credits: cred, isAdmin: false };
  }

  const userId = userOrIdentifier.id || userOrIdentifier.userId;
  if (userId) {
    try {
      const { data, error } = await supabase.auth.admin.getUserById(userId);
      if (!error && data?.user) {
        let cred = data.user.user_metadata?.credits;
        if (cred === undefined || cred === null) {
          cred = 1;
          await supabase.auth.admin.updateUserById(userId, {
            user_metadata: { ...data.user.user_metadata, credits: 1 }
          });
        }
        return { credits: parseInt(cred, 10) || 0, isAdmin: false };
      }
    } catch (_) {}
  }

  // Cerca per email se ID non disponibile
  const email = userOrIdentifier.email || userOrIdentifier.username;
  if (email) {
    try {
      const { data } = await supabase.auth.admin.listUsers();
      const match = data?.users?.find(u => u.email.toLowerCase() === email.toLowerCase() || u.email.toLowerCase().startsWith(email.toLowerCase() + '@'));
      if (match) {
        let cred = match.user_metadata?.credits;
        if (cred === undefined || cred === null) cred = 1;
        return { credits: parseInt(cred, 10) || 0, isAdmin: false };
      }
    } catch (_) {}
  }

  return { credits: 1, isAdmin: false };
}

/**
 * Modifica (sovrascrive) i crediti di un utente
 */
async function updateUserCredits(userId, newCredits) {
  const targetCredits = Math.max(0, parseInt(newCredits, 10) || 0);

  if (!supabase) {
    localCredits[userId] = targetCredits;
    saveLocalCredits();
    return { success: true, credits: targetCredits };
  }

  const { data: userRes, error: getErr } = await supabase.auth.admin.getUserById(userId);
  if (getErr || !userRes?.user) throw new Error('Utente non trovato');

  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { ...userRes.user.user_metadata, credits: targetCredits }
  });

  if (error) throw new Error(error.message);

  return {
    success: true,
    user: {
      id: data.user.id,
      email: data.user.email,
      credits: targetCredits
    }
  };
}

/**
 * Aggiunge o toglie crediti (+delta / -delta)
 */
async function adjustUserCredits(userId, delta) {
  if (!supabase) {
    const cur = localCredits[userId] !== undefined ? localCredits[userId] : 1;
    const nextVal = Math.max(0, cur + delta);
    localCredits[userId] = nextVal;
    saveLocalCredits();
    return { success: true, credits: nextVal };
  }

  const { data: userRes, error: getErr } = await supabase.auth.admin.getUserById(userId);
  if (getErr || !userRes?.user) throw new Error('Utente non trovato');

  const cur = userRes.user.user_metadata?.credits !== undefined ? userRes.user.user_metadata.credits : 1;
  const nextVal = Math.max(0, cur + delta);

  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { ...userRes.user.user_metadata, credits: nextVal }
  });

  if (error) throw new Error(error.message);

  return {
    success: true,
    user: {
      id: data.user.id,
      email: data.user.email,
      credits: nextVal
    }
  };
}

/**
 * Scala 1 credito all'utente dopo una generazione andata a buon fine.
 * Lancia un errore CREDITS_EXHAUSTED se i crediti sono <= 0.
 */
async function consumeCredit(user) {
  if (isUserAdmin(user)) {
    return 999; // Gli admin hanno generazioni illimitate
  }

  const { credits } = await getUserCredits(user);
  if (credits <= 0) {
    throw new Error('CREDITS_EXHAUSTED');
  }

  const userId = user.id || user.userId;
  if (supabase && userId) {
    const nextCredits = Math.max(0, credits - 1);
    await updateUserCredits(userId, nextCredits);
    return nextCredits;
  } else {
    const key = user.username || user.email;
    const nextCredits = Math.max(0, credits - 1);
    localCredits[key] = nextCredits;
    saveLocalCredits();
    return nextCredits;
  }
}

/**
 * Crea un nuovo utente tramite Supabase Admin API
 */
async function createNewUser({ email, password, username, credits }) {
  if (!supabase) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }

  const cleanEmail = email.trim();
  const initialCredits = credits !== undefined && credits !== null ? Math.max(0, parseInt(credits, 10)) : 1;
  const cleanUsername = (username && username.trim()) || cleanEmail.split('@')[0];

  const { data, error } = await supabase.auth.admin.createUser({
    email: cleanEmail,
    password: password,
    email_confirm: true,
    user_metadata: {
      username: cleanUsername,
      credits: initialCredits,
      is_admin: false
    }
  });

  if (error) throw new Error(error.message);

  return {
    id: data.user.id,
    email: data.user.email,
    username: cleanUsername,
    credits: initialCredits,
    createdAt: data.user.created_at
  };
}

/**
 * Elimina un utente (impedisce l'eliminazione degli account admin)
 */
async function deleteUser(userId) {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');

  const { data, error: getErr } = await supabase.auth.admin.getUserById(userId);
  if (getErr || !data?.user) throw new Error('Utente non trovato');

  if (isUserAdmin(data.user)) {
    throw new Error('Impossibile eliminare un account amministratore protetto.');
  }

  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);

  return { success: true };
}

/**
 * Salva un compito su Supabase se configurato
 */
async function saveCompitoSupabase(compito) {
  if (!supabase) return null;
  try {
    const record = {
      id: compito.id,
      user_email: compito.user,
      created_at: compito.createdAt,
      formatted_date: compito.formattedDate,
      nome_progetto: compito.nome_progetto,
      titolo: compito.titolo,
      consegna: compito.consegna,
      project: compito.project,
      test_result: compito.testResult
    };

    const { data, error } = await supabase
      .from('compiti')
      .upsert(record, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase DB] Avviso salvataggio tabella compiti:', error.message);
    }
    return data;
  } catch (err) {
    console.warn('[Supabase DB] Errore DB:', err.message);
    return null;
  }
}

/**
 * Recupera compiti per utente da Supabase
 */
async function getCompitiSupabase(userEmail) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('compiti')
      .select('*')
      .or(`user_email.eq.${userEmail},user_email.eq.${userEmail}@scuola.it`)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase DB] Avviso lettura compiti:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    return null;
  }
}

module.exports = {
  getSupabase: () => supabase,
  isConfigured: () => !!(SUPABASE_URL && SUPABASE_KEY),
  isUserAdmin,
  loginWithSupabase,
  listAllUsers,
  getUserCredits,
  updateUserCredits,
  adjustUserCredits,
  consumeCredit,
  createNewUser,
  deleteUser,
  saveCompitoSupabase,
  getCompitiSupabase
};
