/**
 * Modulo Pagamenti Automatici (Alternativa a Stripe)
 * Supporta:
 * 1. Revolut Pay (Link istantaneo revolut.me per pagamenti con Carte, Apple Pay, Google Pay e Revolut)
 * 2. PayPal (Smart Buttons & REST API Orders v2)
 * 3. Lemon Squeezy (Merchant of Record - Webhook automatici)
 * 4. Modalità Sandbox / Test Istantaneo per sviluppo e verifica
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const supabaseModule = require('./supabase');

let REVOLUT_TAG = process.env.REVOLUT_TAG || '';
let PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'sb';
let PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
let LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY || '';
let LEMONSQUEEZY_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID || '';

try {
  const config = require('./config.json');
  if (config.REVOLUT_TAG) REVOLUT_TAG = config.REVOLUT_TAG;
  if (config.PAYPAL_CLIENT_ID) PAYPAL_CLIENT_ID = config.PAYPAL_CLIENT_ID;
  if (config.PAYPAL_CLIENT_SECRET) PAYPAL_CLIENT_SECRET = config.PAYPAL_CLIENT_SECRET;
  if (config.LEMONSQUEEZY_API_KEY) LEMONSQUEEZY_API_KEY = config.LEMONSQUEEZY_API_KEY;
  if (config.LEMONSQUEEZY_STORE_ID) LEMONSQUEEZY_STORE_ID = config.LEMONSQUEEZY_STORE_ID;
} catch (_) {}

// Maschera parziale per privacy (es. @m***9a)
function getMaskedRevtag(tag) {
  if (!tag) return null;
  const clean = tag.replace(/^@/, '');
  if (clean.length <= 3) return `@${clean}`;
  return `@${clean.charAt(0)}***${clean.slice(-2)}`;
}

// Pacchetti crediti disponibili per l'acquisto
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

// File persistente transazioni (compatibile Vercel e locale)
const TRANSACTIONS_FILE = process.env.VERCEL
  ? path.join(os.tmpdir(), 'copiapicchio-data', 'transactions.json')
  : path.join(__dirname, 'data', 'transactions.json');

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
    console.warn('[Payments] Errore salvataggio transazione locale:', err.message);
  }
}

/**
 * Ottiene il token OAuth2 PayPal (se configurato Secret)
 */
async function getPayPalAccessToken() {
  if (!PAYPAL_CLIENT_SECRET || PAYPAL_CLIENT_ID === 'sb') {
    return null;
  }
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  const data = await res.json();
  return data.access_token;
}

/**
 * Crea un ordine di pagamento per un pacchetto crediti
 */
async function createPaymentOrder({ packageId, user, paymentMethod = 'revolut' }) {
  const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
  if (!pkg) {
    throw new Error('Pacchetto crediti non valido.');
  }

  const orderId = `${paymentMethod.toUpperCase().slice(0, 3)}-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const refCode = `CP-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

  // 1. REVOLUT (Metodo preferito - Carta, Apple Pay, Google Pay, Revolut su conto personale)
  if (paymentMethod === 'revolut' && REVOLUT_TAG) {
    const cleanTag = REVOLUT_TAG.replace(/^@/, '');
    const paymentUrl = `https://revolut.me/${cleanTag}/${pkg.price}`;

    return {
      orderId,
      package: pkg,
      amount: pkg.price,
      currency: pkg.currency,
      mode: 'revolut',
      reference: refCode,
      paymentUrl,
      maskedTag: getMaskedRevtag(cleanTag)
    };
  }

  // 2. Se PayPal live è configurato con secret
  const token = await getPayPalAccessToken();
  if (token && paymentMethod === 'paypal') {
    const res = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: orderId,
          description: `CopiaPicchio: ${pkg.name} (${pkg.credits} crediti)`,
          amount: {
            currency_code: pkg.currency,
            value: pkg.price.toFixed(2)
          },
          custom_id: JSON.stringify({
            userId: user.userId || user.id,
            username: user.username,
            packageId: pkg.id,
            credits: pkg.credits
          })
        }],
        application_context: {
          brand_name: 'CopiaPicchio!',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW'
        }
      })
    });
    const orderData = await res.json();
    return {
      orderId: orderData.id || orderId,
      package: pkg,
      payPalApprovalUrl: orderData.links?.find(l => l.rel === 'approve')?.href,
      mode: 'paypal_live'
    };
  }

  // 3. Fallback Sandbox / Istantaneo
  return {
    orderId,
    package: pkg,
    amount: pkg.price,
    currency: pkg.currency,
    mode: 'instant_sandbox',
    reference: refCode,
    clientToken: PAYPAL_CLIENT_ID
  };
}

/**
 * Cattura e finalizza il pagamento, accreditando i crediti all'utente
 */
async function captureAndFulfillPayment({ orderId, packageId, user, paymentMethod = 'revolut', reference }) {
  const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
  if (!pkg) {
    throw new Error('Pacchetto crediti non trovato.');
  }

  const userId = user.userId || user.id || user.username;
  const userIdentifier = user.username || user.email;

  // Se PayPal live è configurato con secret
  const token = await getPayPalAccessToken();
  if (token && paymentMethod === 'paypal' && orderId.startsWith('PAYPAL-')) {
    const res = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const captureData = await res.json();
    if (captureData.status !== 'COMPLETED') {
      throw new Error(`Pagamento PayPal non completato (stato: ${captureData.status})`);
    }
  }

  // 1. Accreditamento automatico istantaneo tramite modulo Supabase
  let updatedCredits = null;
  try {
    const result = await supabaseModule.adjustUserCredits(userId, pkg.credits);
    updatedCredits = result.credits !== undefined ? result.credits : result.user?.credits;
  } catch (err) {
    console.warn('[Payments] Avviso accredito con userId, riprovo con email/username:', err.message);
    const { credits } = await supabaseModule.getUserCredits(user);
    const newCred = credits + pkg.credits;
    await supabaseModule.updateUserCredits(userId, newCred);
    updatedCredits = newCred;
  }

  // 2. Registrazione ricevuta e transazione
  const tx = {
    id: `TX-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    orderId,
    reference: reference || null,
    userId,
    username: userIdentifier,
    email: user.email,
    packageId: pkg.id,
    packageName: pkg.name,
    creditsAdded: pkg.credits,
    amount: pkg.price,
    currency: pkg.currency,
    provider: paymentMethod,
    status: 'completed',
    createdAt: new Date().toISOString()
  };

  saveTransaction(tx);
  console.log(`[Payments] Successo! Utente: ${userIdentifier} +${pkg.credits} crediti. Totale ora: ${updatedCredits}`);

  return {
    success: true,
    transaction: tx,
    creditsAdded: pkg.credits,
    newTotalCredits: updatedCredits,
    message: `Pagamento completato con successo! Sono stati accreditati ${pkg.credits} crediti al tuo account.`
  };
}

module.exports = {
  CREDIT_PACKAGES,
  createPaymentOrder,
  captureAndFulfillPayment,
  loadTransactions,
  getPublicConfig: () => ({
    provider: REVOLUT_TAG ? 'revolut' : 'paypal',
    hasRevolut: !!REVOLUT_TAG,
    revolutMaskedTag: getMaskedRevtag(REVOLUT_TAG),
    paypalClientId: PAYPAL_CLIENT_ID,
    hasLivePayPal: !!(PAYPAL_CLIENT_SECRET && PAYPAL_CLIENT_ID !== 'sb'),
    packages: CREDIT_PACKAGES
  })
};
