/**
 * Modulo Pagamenti Revolut & Gestione Ricariche Crediti
 * Sistema sicuro con approvazione amministratore:
 * 1. L'utente genera il link personalizzato Revolut.me con importo e causale di riferimento univoca (es. CP-A8B9).
 * 2. L'utente invia il pagamento su Revolut con causale o il proprio username.
 * 3. L'utente invia la notifica di ricarica che viene registrata come 'in attesa' (pending).
 * 4. L'amministratore (matty, zome) verifica l'accredito su Revolut e approva con 1 clic dalla dashboard Admin.
 * 5. I crediti vengono accreditati su Supabase solo dopo l'approvazione!
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const supabaseModule = require('./supabase');

let REVOLUT_TAG = process.env.REVOLUT_TAG || 'maurizzx9a';

try {
  const config = require('./config.json');
  if (config.REVOLUT_TAG) REVOLUT_TAG = config.REVOLUT_TAG;
} catch (_) {}

// Pacchetti crediti acquistabili
const CREDIT_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 5,
    price: 2.99,
    currency: 'EUR',
    popular: false,
    badge: 'Base',
    features: ['5 Risoluzioni complete C++', 'Makefile + zero warning', 'Archivio progetti ZIP']
  },
  {
    id: 'student',
    name: 'Studente',
    credits: 15,
    price: 6.99,
    currency: 'EUR',
    popular: true,
    badge: 'Più Popolare',
    features: ['15 Risoluzioni complete C++', 'Auto-guarigione errori Gemini', 'Supporto prioritario compiti']
  },
  {
    id: 'pro',
    name: 'Pro Esami',
    credits: 40,
    price: 14.99,
    currency: 'EUR',
    popular: false,
    badge: 'Miglior Valore',
    features: ['40 Risoluzioni complete C++', 'Ideale per tutto il quadrimestre', 'Relazioni tecniche approfondite']
  },
  {
    id: 'classe',
    name: 'Classe & Gruppo',
    credits: 100,
    price: 29.99,
    currency: 'EUR',
    popular: false,
    badge: 'Super Risparmio',
    features: ['100 Risoluzioni complete C++', 'Condivisibile nel gruppo classe', 'Massimo risparmio per credito']
  }
];

// File persistente richieste di ricarica
const RECHARGES_FILE = process.env.VERCEL
  ? path.join(os.tmpdir(), 'copiapicchio-data', 'recharges.json')
  : path.join(__dirname, 'data', 'recharges.json');

// File persistente transazioni completate
const TRANSACTIONS_FILE = process.env.VERCEL
  ? path.join(os.tmpdir(), 'copiapicchio-data', 'transactions.json')
  : path.join(__dirname, 'data', 'transactions.json');

function loadRecharges() {
  try {
    if (fs.existsSync(RECHARGES_FILE)) {
      return JSON.parse(fs.readFileSync(RECHARGES_FILE, 'utf8'));
    }
  } catch (_) {}
  return [];
}

function saveRecharges(list) {
  try {
    const dir = path.dirname(RECHARGES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(RECHARGES_FILE, JSON.stringify(list.slice(0, 500), null, 2), 'utf8');
  } catch (err) {
    console.warn('[Payments] Errore salvataggio recharges:', err.message);
  }
}

function loadTransactions() {
  try {
    if (fs.existsSync(TRANSACTIONS_FILE)) {
      return JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, 'utf8'));
    }
  } catch (_) {}
  return [];
}

function saveTransaction(tx) {
  try {
    const dir = path.dirname(TRANSACTIONS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const list = loadTransactions();
    list.unshift(tx);
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(list.slice(0, 500), null, 2), 'utf8');
  } catch (err) {
    console.warn('[Payments] Errore salvataggio transazione:', err.message);
  }
}

/**
 * Crea un ordine di pagamento con Revolut e genera il riferimento univoco
 */
async function createPaymentOrder({ packageId, user }) {
  const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
  if (!pkg) {
    throw new Error('Pacchetto crediti non valido.');
  }

  const cleanTag = (REVOLUT_TAG || 'maurizzx9a').replace(/^@/, '');
  const refCode = `CP-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  const orderId = `REV-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const paymentUrl = `https://revolut.me/${cleanTag}/${pkg.price.toFixed(2)}`;

  return {
    orderId,
    package: pkg,
    amount: pkg.price,
    currency: pkg.currency,
    mode: 'revolut',
    reference: refCode,
    paymentUrl,
    revolutTag: cleanTag
  };
}

/**
 * Registra una richiesta di ricarica inviata dall'utente (in attesa di verifica admin)
 */
async function submitRechargeRequest({ orderId, packageId, user, reference, senderNote }) {
  const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
  if (!pkg) {
    throw new Error('Pacchetto crediti non trovato.');
  }

  const userId = user.userId || user.id || user.username;
  const username = user.username || (user.email ? user.email.split('@')[0] : 'utente');
  const userEmail = user.email || `${username}@copiapicchio.it`;

  const newRequest = {
    id: orderId || `REQ-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
    userId,
    userEmail,
    username,
    packageId: pkg.id,
    packageName: pkg.name,
    credits: pkg.credits,
    amount: pkg.price,
    currency: pkg.currency,
    reference: reference || `CP-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
    senderNote: (senderNote || '').trim(),
    status: 'pending', // 'pending' | 'approved' | 'rejected'
    createdAt: new Date().toISOString()
  };

  const list = loadRecharges();
  // Evita duplicati dello stesso orderId
  const existingIdx = list.findIndex(r => r.id === newRequest.id);
  if (existingIdx >= 0) {
    list[existingIdx] = newRequest;
  } else {
    list.unshift(newRequest);
  }
  saveRecharges(list);

  // Backup opzionale su user_metadata di Supabase se disponibile
  const supabase = supabaseModule.getSupabase();
  if (supabase && userId && !userId.startsWith('admin-')) {
    try {
      const { data } = await supabase.auth.admin.getUserById(userId);
      if (data?.user) {
        const meta = data.user.user_metadata || {};
        const userRecharges = Array.isArray(meta.recharges) ? meta.recharges : [];
        userRecharges.unshift(newRequest);
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { ...meta, recharges: userRecharges.slice(0, 20) }
        });
      }
    } catch (_) {}
  }

  console.log(`[Payments] Nuova richiesta di ricarica in attesa: ${userEmail} per ${pkg.name} (${pkg.price}€, rif: ${newRequest.reference})`);

  return {
    success: true,
    request: newRequest,
    message: `Richiesta di ricarica per ${pkg.name} (${pkg.credits} crediti) registrata con successo! Non appena l'amministratore verificherà il pagamento su Revolut, i crediti verranno accreditati.`
  };
}

/**
 * Ottiene tutte le richieste di ricarica per il pannello Admin
 */
async function listAllRecharges() {
  const localList = loadRecharges();
  const map = new Map();

  // Aggiunge elementi locali
  for (const r of localList) {
    map.set(r.id, r);
  }

  // Sincronizza anche da Supabase se attivo per persistenza su Vercel
  const supabase = supabaseModule.getSupabase();
  if (supabase) {
    try {
      const { data } = await supabase.auth.admin.listUsers();
      if (data?.users) {
        for (const u of data.users) {
          const uRecharges = u.user_metadata?.recharges;
          if (Array.isArray(uRecharges)) {
            for (const r of uRecharges) {
              if (!map.has(r.id)) {
                map.set(r.id, r);
              }
            }
          }
        }
      }
    } catch (_) {}
  }

  const list = Array.from(map.values());
  // Ordina: prima i 'pending', poi i più recenti
  list.sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return list;
}

/**
 * Approva una ricarica: aggiunge i crediti all'utente nel database
 */
async function approveRecharge({ requestId, adminUser }) {
  const list = await listAllRecharges();
  const reqItem = list.find(r => r.id === requestId);

  if (!reqItem) {
    throw new Error('Richiesta di ricarica non trovata.');
  }

  if (reqItem.status === 'approved') {
    throw new Error('Questa richiesta è già stata approvata.');
  }

  // Accredita i crediti su Supabase
  let updatedCredits = null;
  try {
    const res = await supabaseModule.adjustUserCredits(reqItem.userId, reqItem.credits);
    updatedCredits = res.credits !== undefined ? res.credits : res.user?.credits;
  } catch (err) {
    console.warn('[Payments] Accredito fallito con userId, provo username/email:', err.message);
    const { credits } = await supabaseModule.getUserCredits({
      username: reqItem.username,
      email: reqItem.userEmail
    });
    const nextVal = (credits || 0) + reqItem.credits;
    await supabaseModule.updateUserCredits(reqItem.userId, nextVal);
    updatedCredits = nextVal;
  }

  reqItem.status = 'approved';
  reqItem.approvedAt = new Date().toISOString();
  reqItem.approvedBy = adminUser.username || adminUser.email;

  // Salva stato aggiornato
  const localList = loadRecharges();
  const idx = localList.findIndex(r => r.id === requestId);
  if (idx >= 0) {
    localList[idx] = reqItem;
  } else {
    localList.unshift(reqItem);
  }
  saveRecharges(localList);

  // Aggiorna stato anche nei metadata Supabase dell'utente
  const supabase = supabaseModule.getSupabase();
  if (supabase && reqItem.userId && !reqItem.userId.startsWith('admin-')) {
    try {
      const { data } = await supabase.auth.admin.getUserById(reqItem.userId);
      if (data?.user) {
        const meta = data.user.user_metadata || {};
        const uRecharges = Array.isArray(meta.recharges) ? meta.recharges : [];
        const uIdx = uRecharges.findIndex(r => r.id === requestId);
        if (uIdx >= 0) {
          uRecharges[uIdx] = reqItem;
        } else {
          uRecharges.unshift(reqItem);
        }
        await supabase.auth.admin.updateUserById(reqItem.userId, {
          user_metadata: { ...meta, recharges: uRecharges }
        });
      }
    } catch (_) {}
  }

  // Registra ricevuta transazione
  const tx = {
    id: `TX-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    orderId: reqItem.id,
    reference: reqItem.reference,
    userId: reqItem.userId,
    username: reqItem.username,
    email: reqItem.userEmail,
    packageId: reqItem.packageId,
    packageName: reqItem.packageName,
    creditsAdded: reqItem.credits,
    amount: reqItem.amount,
    currency: reqItem.currency,
    provider: 'revolut',
    status: 'completed',
    approvedBy: reqItem.approvedBy,
    createdAt: new Date().toISOString()
  };
  saveTransaction(tx);

  console.log(`[Payments] Ricarica APPROVATA dall'admin ${reqItem.approvedBy}: +${reqItem.credits} crediti a ${reqItem.userEmail}`);

  return {
    success: true,
    request: reqItem,
    creditsAdded: reqItem.credits,
    newTotalCredits: updatedCredits,
    message: `Ricarica approvata! Sono stati accreditati ${reqItem.credits} crediti all'utente ${reqItem.username}.`
  };
}

/**
 * Rifiuta una richiesta di ricarica
 */
async function rejectRecharge({ requestId, adminUser, reason }) {
  const list = await listAllRecharges();
  const reqItem = list.find(r => r.id === requestId);

  if (!reqItem) {
    throw new Error('Richiesta di ricarica non trovata.');
  }

  reqItem.status = 'rejected';
  reqItem.rejectedAt = new Date().toISOString();
  reqItem.rejectedBy = adminUser.username || adminUser.email;
  reqItem.rejectReason = reason || 'Pagamento non riscontrato su Revolut.';

  const localList = loadRecharges();
  const idx = localList.findIndex(r => r.id === requestId);
  if (idx >= 0) {
    localList[idx] = reqItem;
  } else {
    localList.unshift(reqItem);
  }
  saveRecharges(localList);

  const supabase = supabaseModule.getSupabase();
  if (supabase && reqItem.userId && !reqItem.userId.startsWith('admin-')) {
    try {
      const { data } = await supabase.auth.admin.getUserById(reqItem.userId);
      if (data?.user) {
        const meta = data.user.user_metadata || {};
        const uRecharges = Array.isArray(meta.recharges) ? meta.recharges : [];
        const uIdx = uRecharges.findIndex(r => r.id === requestId);
        if (uIdx >= 0) uRecharges[uIdx] = reqItem;
        await supabase.auth.admin.updateUserById(reqItem.userId, {
          user_metadata: { ...meta, recharges: uRecharges }
        });
      }
    } catch (_) {}
  }

  return {
    success: true,
    request: reqItem,
    message: `Richiesta ${reqItem.reference} contrassegnata come rifiutata.`
  };
}

module.exports = {
  CREDIT_PACKAGES,
  createPaymentOrder,
  submitRechargeRequest,
  listAllRecharges,
  approveRecharge,
  rejectRecharge,
  loadTransactions,
  getPublicConfig: () => ({
    provider: 'revolut',
    hasRevolut: true,
    revolutTag: (REVOLUT_TAG || 'maurizzx9a').replace(/^@/, ''),
    packages: CREDIT_PACKAGES
  })
};
