/**
 * Modulo di integrazione Mailgun per invio email e OTP
 * Documentazione: https://documentation.mailgun.com/docs/mailgun/api-reference/intro/
 */

let MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
let MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
let MAILGUN_FROM = process.env.MAILGUN_FROM;

try {
  const config = require('./config.json');
  if (!MAILGUN_API_KEY && config.MAILGUN_API_KEY) {
    MAILGUN_API_KEY = config.MAILGUN_API_KEY;
  }
  if (!MAILGUN_DOMAIN && config.MAILGUN_DOMAIN) {
    MAILGUN_DOMAIN = config.MAILGUN_DOMAIN;
  }
  if (!MAILGUN_FROM && config.MAILGUN_FROM) {
    MAILGUN_FROM = config.MAILGUN_FROM;
  }
} catch (_) {}

if (!MAILGUN_FROM && MAILGUN_DOMAIN) {
  MAILGUN_FROM = `CopiaPicchio <postmaster@${MAILGUN_DOMAIN}>`;
}

/**
 * Invia un codice OTP via email tramite le API REST di Mailgun
 * @param {Object} params
 * @param {string} params.to - Indirizzo email destinatario
 * @param {string} params.otp - Codice OTP numerico a 6 cifre
 * @param {string} [params.username] - Nome utente opzionale
 * @returns {Promise<{success: boolean, id?: string, simulated?: boolean, note?: string, otp?: string}>}
 */
async function sendOtpEmail({ to, otp, username }) {
  if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
    console.warn('[Mailgun] Nessuna chiave API configurata. OTP di test:', otp);
    return {
      success: true,
      simulated: true,
      note: 'MAILGUN_API_KEY non impostata. Modalità sviluppo attiva.',
      otp
    };
  }

  const cleanTo = (to || '').trim().toLowerCase();
  const displayName = username ? ` ${username}` : '';

  const htmlBody = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Codice di verifica CopiaPicchio</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0f19; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #151b28; border: 1px solid #26334d; border-radius: 12px; overflow: hidden; padding: 32px 28px;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px; border-bottom: 1px solid #26334d;">
              <span style="font-size: 32px; line-height: 1;">🦜</span>
              <h1 style="margin: 10px 0 4px 0; font-size: 22px; font-weight: 700; color: #f8fafc; letter-spacing: -0.02em;">CopiaPicchio!</h1>
              <p style="margin: 0; font-size: 13px; color: #94a3b8;">Verifica account & risolutore didattico C++</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 28px 0 20px 0;">
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #cbd5e1; line-height: 1.5;">
                Ciao${displayName},<br>
                per completare la registrazione su CopiaPicchio e attivare il tuo account, inserisci il seguente codice di verifica OTP:
              </p>

              <!-- OTP Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td align="center" style="background-color: #0e1320; border: 1px solid #3b82f6; border-radius: 8px; padding: 18px 24px;">
                    <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #60a5fa; font-family: monospace;">
                      ${otp}
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
                ⏱️ Il codice è valido per <strong>10 minuti</strong>. Non condividerlo con nessuno.
              </p>
              <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                Se non hai richiesto tu la registrazione a CopiaPicchio, puoi ignorare tranquillamente questa email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 24px; border-top: 1px solid #26334d; font-size: 12px; color: #64748b;">
              CopiaPicchio! • Risolutore compiti C++ ad alta fedeltà didattica
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const auth = Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64');
    const endpoint = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`;

    const formParams = new URLSearchParams();
    formParams.append('from', MAILGUN_FROM);
    formParams.append('to', cleanTo);
    formParams.append('subject', `${otp} è il tuo codice di verifica CopiaPicchio`);
    formParams.append('text', `Il tuo codice di verifica CopiaPicchio è: ${otp}. Scade tra 10 minuti.`);
    formParams.append('html', htmlBody);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formParams.toString()
    });

    let data = {};
    try {
      data = await response.json();
    } catch (_) {
      data = { message: `HTTP ${response.status}` };
    }

    if (response.ok && data.id) {
      console.log(`[Mailgun] Email OTP inviata con successo a ${cleanTo}, ID: ${data.id}`);
      return { success: true, id: data.id };
    }

    // Gestione restrizioni del Sandbox Mailgun (destinatari non autorizzati o attivazione account)
    const errMsg = data.message || '';
    if (
      response.status === 403 ||
      errMsg.includes('authorized recipients') ||
      errMsg.includes('activate your Mailgun account') ||
      errMsg.includes('Free accounts are for test purposes only')
    ) {
      console.warn(`[Mailgun Sandbox Notice]: ${errMsg}`);
      return {
        success: true,
        simulated: true,
        note: `Mailgun Sandbox: su account sandbox gratuiti le email possono essere recapitate solo a destinatari autorizzati nella dashboard Mailgun (${cleanTo} non è ancora autorizzato o l'account Mailgun attende conferma). Codice OTP di prova: ${otp}`,
        otp
      };
    }

    throw new Error(errMsg || `Errore Mailgun: HTTP ${response.status}`);
  } catch (err) {
    console.error('[Mailgun Error]', err.message);
    throw err;
  }
}

module.exports = {
  sendOtpEmail,
  isConfigured: () => !!MAILGUN_API_KEY
};
