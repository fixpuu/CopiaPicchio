const { createClient } = require('@supabase/supabase-js');

let SUPABASE_URL = process.env.SUPABASE_URL;
let SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  try {
    const config = require('./config.json');
    if (!SUPABASE_URL) SUPABASE_URL = config.SUPABASE_URL;
    if (!SUPABASE_KEY) SUPABASE_KEY = config.SUPABASE_KEY;
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

/**
 * Autenticazione utente tramite Supabase Auth (solo login)
 */
async function loginWithSupabase(emailOrUsername, password) {
  if (!supabase) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }

  let email = emailOrUsername.trim();
  // Se l'utente inserisce uno username senza '@', tenta con dominio didattico standard
  if (!email.includes('@')) {
    email = `${email}@scuola.it`;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    // Se ha fallito con @scuola.it, prova anche con email pura se diversa o rilancia errore
    throw new Error(error.message || 'Credenziali Supabase non valide');
  }

  return {
    user: data.user,
    session: data.session
  };
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
  loginWithSupabase,
  saveCompitoSupabase,
  getCompitiSupabase,
  isConfigured: () => !!(SUPABASE_URL && SUPABASE_KEY)
};
