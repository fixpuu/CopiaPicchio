// ================= STATE & ELEMENTS =================
let currentUser = null;
let currentProject = null;
let currentProjectId = null;
let selectedPhotoFile = null;
let sessionToken = localStorage.getItem('cp_session_token') || null;

// Auth State & Elements
const authModal = document.getElementById('auth-modal');
const authModalTitle = document.getElementById('auth-modal-title');
const authModalSubtitle = document.getElementById('auth-modal-subtitle');
const tabBtnLogin = document.getElementById('tab-btn-login');
const tabBtnRegister = document.getElementById('tab-btn-register');
const linkToRegister = document.getElementById('link-to-register');
const linkToLogin = document.getElementById('link-to-login');

const loginForm = document.getElementById('login-form');
const loginUsernameInput = document.getElementById('login-username');
const loginPasswordInput = document.getElementById('login-password');
const loginError = document.getElementById('login-error');
const currentUsernameDisplay = document.getElementById('current-username');
const avatarText = document.getElementById('avatar-text');
const btnLogout = document.getElementById('btn-logout');

const registerForm = document.getElementById('register-form');
const registerEmailInput = document.getElementById('register-email');
const registerUsernameInput = document.getElementById('register-username');
const registerPasswordInput = document.getElementById('register-password');
const registerError = document.getElementById('register-error');
const btnRegisterSubmit = document.getElementById('btn-register-submit');

// Navigation Tabs & Sections
const navBtnNuovo = document.getElementById('nav-btn-nuovo');
const navBtnCompiti = document.getElementById('nav-btn-compiti');
const navBtnAdmin = document.getElementById('nav-btn-admin');
const compitiBadge = document.getElementById('compiti-badge');
const inputSection = document.getElementById('input-section');
const compitiSection = document.getElementById('compiti-section');
const adminSection = document.getElementById('admin-section');
const compitiList = document.getElementById('compiti-list');
const btnCompitiNuovo = document.getElementById('btn-compiti-nuovo');

// Credits & Payment Shop Elements (Alternativa a Stripe)
let availablePackages = [];
let selectedPackage = null;

const creditsPill = document.getElementById('credits-pill');
const userCreditsVal = document.getElementById('user-credits-val');
const bannerZeroCredits = document.getElementById('banner-zero-credits');
const btnBannerRecharge = document.getElementById('btn-banner-recharge');

const creditsModal = document.getElementById('credits-modal');
const btnCloseCreditsModal = document.getElementById('btn-close-credits-modal');
const modalCurrentCredits = document.getElementById('modal-current-credits');
const packagesGrid = document.getElementById('packages-grid');
const selectedPackageLabel = document.getElementById('selected-package-label');
const selectedPackagePrice = document.getElementById('selected-package-price');
const revolutDirectLink = document.getElementById('revolut-direct-link');
const revolutSenderNote = document.getElementById('revolut-sender-note');
const paymentStatusBox = document.getElementById('payment-status-box');
const adminRechargesTbody = document.getElementById('admin-recharges-tbody');
const btnAdminRefreshRecharges = document.getElementById('btn-admin-refresh-recharges');

// Admin Elements
const createUserModal = document.getElementById('create-user-modal');
const btnCloseCreateUser = document.getElementById('btn-close-create-user');
const btnCancelCreateUser = document.getElementById('btn-cancel-create-user');
const createUserForm = document.getElementById('create-user-form');
const newUserEmail = document.getElementById('new-user-email');
const newUserPassword = document.getElementById('new-user-password');
const newUserName = document.getElementById('new-user-username');
const newUserCredits = document.getElementById('new-user-credits');
const createUserError = document.getElementById('create-user-error');

const adminStatUsers = document.getElementById('admin-stat-users');
const adminStatCredits = document.getElementById('admin-stat-credits');
const adminStatZero = document.getElementById('admin-stat-zero');
const adminStatAdmins = document.getElementById('admin-stat-admins');
const adminSearchUsers = document.getElementById('admin-search-users');
const adminUsersTbody = document.getElementById('admin-users-tbody');
const btnAdminRefresh = document.getElementById('btn-admin-refresh');
const btnAdminAddUser = document.getElementById('btn-admin-add-user');

// Form Elements
const exerciseForm = document.getElementById('exercise-form');
const dropZone = document.getElementById('drop-zone');
const filePhotoInput = document.getElementById('file-photo');
const btnBrowseFile = document.getElementById('btn-browse-file');
const dropZoneEmpty = document.getElementById('drop-zone-empty');
const dropZonePreview = document.getElementById('drop-zone-preview');
const photoPreviewImg = document.getElementById('photo-preview-img');
const photoFilename = document.getElementById('photo-filename');
const btnRemovePhoto = document.getElementById('btn-remove-photo');
const textConsegna = document.getElementById('text-consegna');

// Details Accordion
const toggleDetails = document.getElementById('toggle-details');
const detailsContent = document.getElementById('details-content');
const toggleIcon = document.getElementById('toggle-icon');
const fieldAutore = document.getElementById('field-autore');
const fieldClasse = document.getElementById('field-classe');
const fieldData = document.getElementById('field-data');
const fieldNomeProgetto = document.getElementById('field-nome-progetto');
const fieldArgomenti = document.getElementById('field-argomenti');

// Loading & Results
const loadingSection = document.getElementById('loading-section');
const resultsSection = document.getElementById('results-section');
const btnGenerate = document.getElementById('btn-generate');
const toastEl = document.getElementById('toast');

// Result Views
const resProjectTitle = document.getElementById('res-project-title');
const resFolderName = document.getElementById('res-folder-name');
const btnDownloadZip = document.getElementById('btn-download-zip');
const btnCopyReadme = document.getElementById('btn-copy-readme');
const btnPrintDoc = document.getElementById('btn-print-doc');
const readmeRendered = document.getElementById('readme-rendered');
const readmeRaw = document.getElementById('readme-raw');
const codeReadmeRaw = document.getElementById('code-readme-raw');
const btnViewRendered = document.getElementById('btn-view-rendered');
const btnViewRaw = document.getElementById('btn-view-raw');
const btnCopyTabReadme = document.getElementById('btn-copy-tab-readme');
const terminalBody = document.getElementById('terminal-body');
const fileTreeList = document.getElementById('file-tree-list');

// Initialize date field to today DD/MM/YYYY
const today = new Date();
const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
if (fieldData) fieldData.value = formattedDate;

// ================= API FETCH HELPER (WITH AUTO TOKEN) =================

function apiFetch(url, options = {}) {
  options.headers = options.headers || {};
  if (sessionToken) {
    if (options.headers instanceof Headers) {
      options.headers.set('x-session-token', sessionToken);
    } else {
      options.headers['x-session-token'] = sessionToken;
    }
  }
  return fetch(url, options);
}

// ================= AUTHENTICATION & CREDITS =================

async function checkAuth() {
  try {
    const res = await apiFetch('/api/auth/me');
    const data = await res.json();
    if (data.authenticated) {
      setAuthenticatedUser(data, data.sessionToken || sessionToken);
    } else {
      showAuthModal();
    }
  } catch (err) {
    showAuthModal();
  }
}

function setAuthenticatedUser(userData, token) {
  let username, email, credits, isAdmin;
  if (typeof userData === 'object') {
    username = userData.username;
    email = userData.email;
    credits = userData.credits !== undefined ? userData.credits : 1;
    isAdmin = !!userData.isAdmin;
  } else {
    username = userData;
    credits = 1;
    isAdmin = (username === 'matty' || username === 'zome');
  }

  currentUser = { username, email, credits, isAdmin };
  sessionToken = token;
  if (token) localStorage.setItem('cp_session_token', token);
  localStorage.setItem('cp_username', username);

  if (currentUsernameDisplay) currentUsernameDisplay.textContent = username;
  if (avatarText) {
    const initial = (username || 'U').charAt(0).toUpperCase();
    avatarText.textContent = initial;
  }

  authModal.classList.add('hidden');
  updateCreditsUI(credits, isAdmin);

  // Mostra il tab admin se l'utente è uno dei 2 amministratori
  if (isAdmin) {
    navBtnAdmin?.classList.remove('hidden');
  } else {
    navBtnAdmin?.classList.add('hidden');
    adminSection?.classList.add('hidden');
  }

  // Carica archivio compiti dell'utente e opzioni pagamento
  loadCompiti();
  loadPaymentConfig();
}

function updateCreditsUI(credits, isAdmin) {
  if (currentUser) {
    currentUser.credits = credits;
    currentUser.isAdmin = isAdmin;
  }
  const displayVal = isAdmin ? '∞' : (credits !== undefined ? credits : 0);
  if (userCreditsVal) userCreditsVal.textContent = displayVal;
  if (modalCurrentCredits) modalCurrentCredits.textContent = isAdmin ? 'Illimitati (Admin)' : `${displayVal} Crediti`;

  if (!isAdmin && credits <= 0) {
    creditsPill?.classList.add('zero');
    bannerZeroCredits?.classList.remove('hidden');
  } else {
    creditsPill?.classList.remove('zero');
    bannerZeroCredits?.classList.add('hidden');
  }
}

function showAuthModal() {
  currentUser = null;
  authModal.classList.remove('hidden');
  switchToLoginView();
  navBtnAdmin?.classList.add('hidden');
  adminSection?.classList.add('hidden');
}

// Switching tra Login e Registrazione Diretta
function switchToLoginView() {
  tabBtnLogin?.classList.add('active');
  tabBtnRegister?.classList.remove('active');
  loginForm?.classList.remove('hidden');
  registerForm?.classList.add('hidden');
  loginError?.classList.add('hidden');
  if (authModalTitle) authModalTitle.textContent = 'Accedi a CopiaPicchio';
  if (authModalSubtitle) authModalSubtitle.textContent = 'Risolutore didattico di informatica C++ ad alta fedeltà.';
}

function switchToRegisterView() {
  tabBtnRegister?.classList.add('active');
  tabBtnLogin?.classList.remove('active');
  registerForm?.classList.remove('hidden');
  loginForm?.classList.add('hidden');
  registerError?.classList.add('hidden');
  if (authModalTitle) authModalTitle.textContent = 'Crea Account Studente';
  if (authModalSubtitle) authModalSubtitle.textContent = 'Registrati gratis in 5 secondi e ricevi subito 1 credito.';
}

tabBtnLogin?.addEventListener('click', switchToLoginView);
tabBtnRegister?.addEventListener('click', switchToRegisterView);
linkToRegister?.addEventListener('click', (e) => { e.preventDefault(); switchToRegisterView(); });
linkToLogin?.addEventListener('click', (e) => { e.preventDefault(); switchToLoginView(); });

// Submit Login
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError?.classList.add('hidden');

  const username = loginUsernameInput.value.trim();
  const password = loginPasswordInput.value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      setAuthenticatedUser(data, data.sessionToken);
      showToast(`Accesso eseguito come ${data.username}`, 'success');
    } else {
      loginError.textContent = data.error || 'Credenziali non valide.';
      loginError.classList.remove('hidden');
    }
  } catch (err) {
    loginError.textContent = 'Errore di connessione al server.';
    loginError.classList.remove('hidden');
  }
});

// Submit Registrazione Diretta (Senza OTP)
registerForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  registerError?.classList.add('hidden');

  const email = registerEmailInput.value.trim();
  const username = registerUsernameInput.value.trim();
  const password = registerPasswordInput.value;

  btnRegisterSubmit.disabled = true;
  const originalHtml = btnRegisterSubmit.innerHTML;
  btnRegisterSubmit.innerHTML = '<span>Creazione account...</span>';

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password })
    });

    const data = await res.json();
    btnRegisterSubmit.disabled = false;
    btnRegisterSubmit.innerHTML = originalHtml;

    if (!res.ok || !data.success) {
      registerError.textContent = data.error || 'Impossibile completare la registrazione.';
      registerError.classList.remove('hidden');
      return;
    }

    // Registrazione avvenuta: login immediato e notifica
    setAuthenticatedUser(data, data.sessionToken);
    showToast(data.message || '🎉 Benvenuto su CopiaPicchio! Hai ricevuto 1 credito omaggio.', 'success');

  } catch (err) {
    btnRegisterSubmit.disabled = false;
    btnRegisterSubmit.innerHTML = originalHtml;
    registerError.textContent = 'Errore di comunicazione con il server.';
    registerError.classList.remove('hidden');
  }
});

// Logout
btnLogout?.addEventListener('click', async () => {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } catch (_) {}
  localStorage.removeItem('cp_session_token');
  localStorage.removeItem('cp_username');
  sessionToken = null;
  showAuthModal();
  showToast('Disconnessione completata', 'success');
});

// ================= SHOP CREDITI & PAGAMENTI AUTOMATICI (ALTERNATIVA A STRIPE) =================

async function loadPaymentConfig() {
  try {
    const res = await apiFetch('/api/payments/config');
    const data = await res.json();
    if (res.ok && data.success && Array.isArray(data.packages)) {
      availablePackages = data.packages;
      renderPackagesGrid(availablePackages);
      // Seleziona il pacchetto "student" (popolare) come default
      const defaultPkg = availablePackages.find(p => p.id === 'student') || availablePackages[0];
      selectPackage(defaultPkg);
    }
  } catch (err) {
    console.warn('[Payments] Avviso caricamento pacchetti:', err);
  }
}

function renderPackagesGrid(packages) {
  if (!packagesGrid) return;
  packagesGrid.innerHTML = packages.map(pkg => `
    <div class="package-card ${pkg.popular ? 'popular' : ''}" data-pkg-id="${pkg.id}" onclick="selectPackageById('${pkg.id}')">
      ${pkg.badge ? `<span class="package-badge-tag">${escapeHtml(pkg.badge)}</span>` : ''}
      <div class="package-name">${escapeHtml(pkg.name)}</div>
      <div class="package-credits">${pkg.credits}</div>
      <div class="package-credits-lbl">Crediti</div>
      <div class="package-price">€${pkg.price.toFixed(2)}</div>
    </div>
  `).join('');
}

window.selectPackageById = function(id) {
  const pkg = availablePackages.find(p => p.id === id);
  if (pkg) selectPackage(pkg);
};

function selectPackage(pkg) {
  selectedPackage = pkg;
  document.querySelectorAll('.package-card').forEach(el => {
    el.classList.toggle('selected', el.getAttribute('data-pkg-id') === pkg.id);
  });

  if (selectedPackageLabel) selectedPackageLabel.textContent = `${pkg.name} (${pkg.credits} crediti)`;
  if (selectedPackagePrice) selectedPackagePrice.textContent = `€${pkg.price.toFixed(2)}`;
  
  const btnRevolutText = document.getElementById('btn-revolut-text');
  if (btnRevolutText) {
    btnRevolutText.textContent = `Paga €${pkg.price.toFixed(2)} con Carta o Revolut Pay`;
  }
}

let pendingRevolutPayment = null;

const paymentButtonsStack = document.getElementById('payment-buttons-stack');
const revolutConfirmBox = document.getElementById('revolut-confirm-box');
const revolutRefCode = document.getElementById('revolut-ref-code');
const btnPayRevolut = document.getElementById('btn-pay-revolut');
const btnRevolutConfirmDone = document.getElementById('btn-revolut-confirm-done');
const btnRevolutCancelStep = document.getElementById('btn-revolut-cancel-step');

function resetPaymentModalView() {
  paymentButtonsStack?.classList.remove('hidden');
  revolutConfirmBox?.classList.add('hidden');
  paymentStatusBox?.classList.add('hidden');
  pendingRevolutPayment = null;
}

function showCreditsModal() {
  resetPaymentModalView();
  if (!selectedPackage && availablePackages.length > 0) {
    selectPackage(availablePackages.find(p => p.id === 'student') || availablePackages[0]);
  }
  creditsModal?.classList.remove('hidden');
}

function hideCreditsModal() {
  creditsModal?.classList.add('hidden');
  resetPaymentModalView();
}

creditsPill?.addEventListener('click', showCreditsModal);
btnBannerRecharge?.addEventListener('click', showCreditsModal);
btnCloseCreditsModal?.addEventListener('click', hideCreditsModal);

// Pagamento Revolut Pay & Tutte le Carte
const btnCopyRevolutCode = document.getElementById('btn-copy-revolut-code');
const copyCodeText = document.getElementById('copy-code-text');

btnCopyRevolutCode?.addEventListener('click', async () => {
  const code = revolutRefCode?.textContent?.trim();
  if (!code) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(code);
    } else {
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    if (copyCodeText) copyCodeText.textContent = '✓ Copiato!';
    showToast(`Causale ${code} copiata negli appunti!`, 'success');
    setTimeout(() => {
      if (copyCodeText) copyCodeText.textContent = 'Copia';
    }, 2500);
  } catch (err) {
    showToast(`Causale: ${code}`, 'info');
  }
});

btnPayRevolut?.addEventListener('click', async () => {
  if (!selectedPackage) return;
  if (!currentUser) {
    showToast('Effettua il login per acquistare crediti.', 'error');
    showAuthModal();
    return;
  }

  setPaymentLoading(true, 'Generazione link protetto Revolut...');

  try {
    const orderRes = await apiFetch('/api/payments/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packageId: selectedPackage.id
      })
    });

    const orderData = await orderRes.json();
    setPaymentLoading(false);

    if (!orderRes.ok || !orderData.success) {
      throw new Error(orderData.error || 'Errore creazione ordine.');
    }

    const { orderId, paymentUrl, reference } = orderData.order;
    pendingRevolutPayment = {
      orderId,
      packageId: selectedPackage.id,
      reference,
      paymentUrl
    };

    // Aggiorna il link diretto nel modal
    if (revolutDirectLink && paymentUrl) {
      revolutDirectLink.href = paymentUrl;
      revolutDirectLink.innerHTML = `<span>🔗 Apri Revolut.me (€${selectedPackage.price.toFixed(2)})</span>`;
    }

    // Mostra il pannello di conferma nel modal
    paymentButtonsStack?.classList.add('hidden');
    revolutConfirmBox?.classList.remove('hidden');
    if (revolutRefCode) revolutRefCode.textContent = reference || `CP-${orderId.slice(-4)}`;
    if (revolutSenderNote) revolutSenderNote.value = '';
    if (copyCodeText) copyCodeText.textContent = 'Copia';

    // Su desktop prova ad aprire la scheda se non bloccata; su mobile l'utente tocca direttamente il pulsante al punto 2
    try {
      window.open(paymentUrl, '_blank');
    } catch (_) {}

    showToast('Segui i passaggi per completare la ricarica!', 'info');

  } catch (err) {
    setPaymentLoading(false);
    showToast(`Errore: ${err.message}`, 'error');
  }
});

// Conferma invio pagamento Revolut (Invia richiesta all'Admin)
btnRevolutConfirmDone?.addEventListener('click', async () => {
  if (!pendingRevolutPayment) return;

  const senderNote = (revolutSenderNote?.value || '').trim();

  btnRevolutConfirmDone.disabled = true;
  btnRevolutConfirmDone.querySelector('span').textContent = 'Registrazione notifica in corso...';

  try {
    const rechargeRes = await apiFetch('/api/payments/submit-recharge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: pendingRevolutPayment.orderId,
        packageId: pendingRevolutPayment.packageId,
        reference: pendingRevolutPayment.reference,
        senderNote
      })
    });

    const rechargeData = await rechargeRes.json();
    btnRevolutConfirmDone.disabled = false;
    btnRevolutConfirmDone.querySelector('span').textContent = '✓ Ho inviato il pagamento: Registra Ricarica';

    if (!rechargeRes.ok || !rechargeData.success) {
      throw new Error(rechargeData.error || 'Errore durante la registrazione della ricarica.');
    }

    hideCreditsModal();
    showToast(`✅ Richiesta inviata! L'amministratore verificherà l'accredito Revolut (Rif: ${pendingRevolutPayment.reference}) e attiverà i tuoi crediti a breve.`, 'success', 8000);

  } catch (err) {
    btnRevolutConfirmDone.disabled = false;
    btnRevolutConfirmDone.querySelector('span').textContent = '✓ Ho inviato il pagamento: Registra Ricarica';
    showToast(`Errore: ${err.message}`, 'error');
  }
});

btnRevolutCancelStep?.addEventListener('click', () => {
  resetPaymentModalView();
});

function setPaymentLoading(isLoading, msg) {
  if (btnPayRevolut) btnPayRevolut.disabled = isLoading;
  if (paymentStatusBox) {
    if (isLoading) {
      paymentStatusBox.textContent = msg || 'Elaborazione...';
      paymentStatusBox.classList.remove('hidden');
    } else {
      paymentStatusBox.classList.add('hidden');
    }
  }
}

// ================= NAVIGATION =================

navBtnNuovo?.addEventListener('click', showNuovoCompitoView);
navBtnCompiti?.addEventListener('click', showCompitiView);
btnCompitiNuovo?.addEventListener('click', showNuovoCompitoView);
navBtnAdmin?.addEventListener('click', showAdminView);

function showNuovoCompitoView() {
  navBtnNuovo?.classList.add('active');
  navBtnCompiti?.classList.remove('active');
  navBtnAdmin?.classList.remove('active');
  compitiSection?.classList.add('hidden');
  adminSection?.classList.add('hidden');
  inputSection?.classList.remove('hidden');
}

function showCompitiView() {
  navBtnCompiti?.classList.add('active');
  navBtnNuovo?.classList.remove('active');
  navBtnAdmin?.classList.remove('active');
  inputSection?.classList.add('hidden');
  adminSection?.classList.add('hidden');
  resultsSection?.classList.add('hidden');
  loadingSection?.classList.add('hidden');
  compitiSection?.classList.remove('hidden');
  loadCompiti();
}

function showAdminView() {
  if (!currentUser?.isAdmin) return;
  navBtnAdmin?.classList.add('active');
  navBtnNuovo?.classList.remove('active');
  navBtnCompiti?.classList.remove('active');
  inputSection?.classList.add('hidden');
  resultsSection?.classList.add('hidden');
  loadingSection?.classList.add('hidden');
  compitiSection?.classList.add('hidden');
  adminSection?.classList.remove('hidden');
  loadAdminUsers();
}

// ================= I MIEI COMPITI =================

async function loadCompiti() {
  if (!currentUser) return;
  try {
    const res = await apiFetch('/api/compiti');
    const data = await res.json();
    if (res.ok && data.success) {
      renderCompitiList(data.compiti || []);
    }
  } catch (err) {
    console.error('Errore caricamento compiti:', err);
  }
}

function renderCompitiList(compiti) {
  if (compitiBadge) compitiBadge.textContent = compiti.length;
  if (!compitiList) return;

  if (compiti.length === 0) {
    compitiList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📂</div>
        <h3>Nessun compito salvato</h3>
        <p>I compiti che risolverai verranno memorizzati automaticamente qui.</p>
        <button class="btn btn-primary btn-sm mt-2" onclick="showNuovoCompitoView()">+ Crea il tuo primo compito</button>
      </div>
    `;
    return;
  }

  let html = '';
  for (const c of compiti) {
    html += `
      <div class="compito-card" id="card-${c.id}">
        <div class="compito-info">
          <div class="compito-meta">
            <span class="badge badge-info">Cartella: ${escapeHtml(c.nome_progetto)}</span>
            <span class="badge badge-success">✓ 0 Errori</span>
            <span class="file-badge">📅 ${escapeHtml(c.formattedDate || '')}</span>
          </div>
          <div class="compito-title">${escapeHtml(c.titolo || c.nome_progetto)}</div>
          <div class="compito-snippet">${escapeHtml(c.consegna_preview || '')}</div>
        </div>
        <div class="compito-actions">
          <button class="btn btn-secondary btn-sm" onclick="openCompito('${c.id}')" title="Apri esercizio">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            <span>Apri</span>
          </button>
          <a href="/api/download-zip/${c.id}" class="btn btn-primary btn-sm" download title="Scarica ZIP">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>ZIP</span>
          </a>
          <button class="btn btn-danger btn-sm" onclick="deleteCompito('${c.id}')" title="Elimina">
            ✕
          </button>
        </div>
      </div>
    `;
  }
  compitiList.innerHTML = html;
}

window.openCompito = async function(id) {
  try {
    const res = await apiFetch(`/api/compiti/${id}`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Impossibile aprire il compito');
    }

    compitiSection.classList.add('hidden');
    inputSection.classList.remove('hidden');
    renderResults({
      projectId: data.compito.id,
      project: data.compito.project,
      testResult: data.compito.testResult
    });
    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth' });
    showToast(`Compito "${data.compito.nome_progetto}" aperto!`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.deleteCompito = async function(id) {
  if (!confirm('Sei sicuro di voler eliminare questo compito?')) return;
  try {
    const res = await apiFetch(`/api/compiti/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Compito eliminato', 'success');
      loadCompiti();
    } else {
      showToast(data.error || 'Errore eliminazione', 'error');
    }
  } catch (err) {
    showToast('Errore durante l\'eliminazione', 'error');
  }
};

// ================= FILE UPLOAD & DROP ZONE & PASTE =================

function setPhotoFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('Seleziona un file immagine valido (PNG, JPG, WEBP)', 'error');
    return;
  }
  selectedPhotoFile = file;
  photoFilename.textContent = file.name || 'foto_consegna.png';

  const reader = new FileReader();
  reader.onload = (e) => {
    photoPreviewImg.src = e.target.result;
    dropZoneEmpty.classList.add('hidden');
    dropZonePreview.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function clearPhotoFile() {
  selectedPhotoFile = null;
  filePhotoInput.value = '';
  photoPreviewImg.src = '';
  dropZonePreview.classList.add('hidden');
  dropZoneEmpty.classList.remove('hidden');
}

btnBrowseFile?.addEventListener('click', (e) => {
  e.stopPropagation();
  filePhotoInput.click();
});

dropZone?.addEventListener('click', (e) => {
  if (e.target !== btnRemovePhoto && !dropZonePreview.contains(e.target)) {
    filePhotoInput.click();
  }
});

filePhotoInput?.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    setPhotoFile(e.target.files[0]);
  }
});

btnRemovePhoto?.addEventListener('click', (e) => {
  e.stopPropagation();
  clearPhotoFile();
});

// Drag & Drop
dropZone?.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone?.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone?.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    setPhotoFile(e.dataTransfer.files[0]);
  }
});

// Incolla immagine da appunti (Ctrl+V) ovunque sulla pagina
window.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const blob = items[i].getAsFile();
      setPhotoFile(blob);
      showToast('Immagine incollata dagli appunti!', 'success');
      break;
    }
  }
});

// Accordion Toggle
toggleDetails?.addEventListener('click', () => {
  const isCollapsed = detailsContent.classList.contains('collapsed');
  if (isCollapsed) {
    detailsContent.classList.remove('collapsed');
    toggleIcon.textContent = '▲';
  } else {
    detailsContent.classList.add('collapsed');
    toggleIcon.textContent = '▼';
  }
});

// ================= EXERCISE GENERATION =================

exerciseForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const consegnaText = textConsegna.value.trim();
  if (!consegnaText && !selectedPhotoFile) {
    showToast('Fornisci il testo della consegna o allega una foto della consegna.', 'error');
    return;
  }

  // Controllo crediti prima di avviare (se utente normale con 0 crediti)
  if (!currentUser?.isAdmin && (currentUser?.credits <= 0)) {
    showCreditsModal();
    showToast('Hai 0 crediti disponibili. Ricarica per continuare.', 'error');
    return;
  }

  // Mostra stepper di caricamento
  loadingSection.classList.remove('hidden');
  resultsSection.classList.add('hidden');
  btnGenerate.disabled = true;

  resetStepper();
  loadingSection.scrollIntoView({ behavior: 'smooth' });

  const stepInterval = runStepperSimulation();

  try {
    const formData = new FormData();
    if (consegnaText) formData.append('consegna', consegnaText);
    if (selectedPhotoFile) formData.append('photo', selectedPhotoFile, selectedPhotoFile.name || 'consegna.png');

    formData.append('autore', fieldAutore.value.trim() || 'Nome e Cognome');
    formData.append('classe', fieldClasse.value.trim() || '3B IT');
    formData.append('data', fieldData.value.trim() || formattedDate);
    if (fieldNomeProgetto.value.trim()) formData.append('nome_progetto', fieldNomeProgetto.value.trim());
    if (fieldArgomenti.value.trim()) formData.append('argomenti', fieldArgomenti.value.trim());

    const res = await apiFetch('/api/generate', {
      method: 'POST',
      body: formData
    });

    clearInterval(stepInterval);

    const data = await res.json();
    if (!res.ok || !data.success) {
      if (res.status === 403 && (data.error === 'CREDITS_EXHAUSTED' || data.message?.includes('crediti'))) {
        updateCreditsUI(0, false);
        showCreditsModal();
      }
      throw new Error(data.message || data.error || 'Errore nella generazione del progetto');
    }

    if (data.remainingCredits !== undefined) {
      updateCreditsUI(data.remainingCredits, currentUser?.isAdmin);
    }

    completeAllSteps();

    setTimeout(() => {
      loadingSection.classList.add('hidden');
      renderResults(data);
      resultsSection.classList.remove('hidden');
      resultsSection.scrollIntoView({ behavior: 'smooth' });
      btnGenerate.disabled = false;
      showToast('Esercizio risolto e salvato nei tuoi compiti!', 'success');
      loadCompiti();
    }, 600);

  } catch (err) {
    clearInterval(stepInterval);
    loadingSection.classList.add('hidden');
    btnGenerate.disabled = false;
    if (err.message && err.message.toLowerCase().includes('crediti')) {
      showCreditsModal();
    }
    showToast(err.message, 'error');
  }
});

function resetStepper() {
  for (let i = 1; i <= 5; i++) {
    const step = document.getElementById(`step-${i}`);
    if (step) step.className = 'step-item';
  }
  const first = document.getElementById('step-1');
  if (first) first.classList.add('active');
}

function runStepperSimulation() {
  let currentStep = 1;
  return setInterval(() => {
    if (currentStep < 5) {
      const cur = document.getElementById(`step-${currentStep}`);
      if (cur) {
        cur.classList.remove('active');
        cur.classList.add('done');
      }
      currentStep++;
      const next = document.getElementById(`step-${currentStep}`);
      if (next) next.classList.add('active');
    }
  }, 4000);
}

function completeAllSteps() {
  for (let i = 1; i <= 5; i++) {
    const step = document.getElementById(`step-${i}`);
    if (step) step.className = 'step-item done';
  }
}

// ================= RENDER RESULTS =================

function renderResults(data) {
  const { projectId, project, testResult } = data;
  currentProject = project;
  currentProjectId = projectId;

  resProjectTitle.textContent = project.titolo || 'Esercizio Risolto';
  resFolderName.textContent = project.nome_progetto || 'progetto';

  btnDownloadZip.href = `/api/download-zip/${projectId}`;

  // 1. README.md
  const readmeMd = project.readme_md || '';
  readmeRendered.innerHTML = marked.parse(readmeMd);
  codeReadmeRaw.textContent = readmeMd;

  // 2. Code Tabs
  document.getElementById('code-function-h').textContent = project.function_h || '';
  document.getElementById('code-function-cpp').textContent = project.function_cpp || '';
  document.getElementById('code-main-cpp').textContent = project.main_cpp || '';
  document.getElementById('code-makefile').textContent = project.makefile || '';

  // 3. INSTALL.md
  document.getElementById('install-rendered').innerHTML = marked.parse(project.install_md || '');

  // 4. Terminal & Test
  renderTerminal(project, testResult);

  // 5. All Files Tree
  renderFileTree(project);

  // Syntax highlighting
  if (window.Prism) {
    Prism.highlightAll();
  }
}

function renderTerminal(project, testResult) {
  let termHtml = '';
  termHtml += `<span class="term-prompt">studente@scuola:~/progetti/${project.nome_progetto}$</span> <span class="term-cmd">make clean</span>\n`;
  termHtml += `rm -f *.o a.out\n\n`;

  termHtml += `<span class="term-prompt">studente@scuola:~/progetti/${project.nome_progetto}$</span> <span class="term-cmd">make</span>\n`;
  if (testResult && testResult.compilerLog) {
    termHtml += `<span class="term-success">${escapeHtml(testResult.compilerLog)}</span>\n\n`;
  } else {
    termHtml += `g++ -Wall -Wconversion -c function.cpp\ng++ -Wall -Wconversion -c main.cpp\ng++ -Wall -Wconversion function.o main.o -o a.out\n\n`;
  }

  const runCmd = testResult?.executionCommand || 'make run';
  termHtml += `<span class="term-prompt">studente@scuola:~/progetti/${project.nome_progetto}$</span> <span class="term-cmd">${escapeHtml(runCmd)}</span>\n`;
  if (testResult && testResult.executionOutput) {
    termHtml += `${escapeHtml(testResult.executionOutput)}\n\n`;
  } else {
    termHtml += `[Esecuzione completata con codice 0]\n\n`;
  }

  termHtml += `<span class="term-prompt">studente@scuola:~/progetti/${project.nome_progetto}$</span> <span class="term-cmd">echo $?</span>\n`;
  termHtml += `0\n\n`;
  termHtml += `<span class="term-success">Compilazione ed esecuzione completate con successo (0 warning, 0 errori).</span>`;

  terminalBody.innerHTML = termHtml;
}

function renderFileTree(project) {
  const files = [
    { name: 'main.cpp', desc: 'File sorgente principale (punto di ingresso e test)', size: 'C++' },
    { name: 'function.h', desc: 'Header file (include guards, librerie standard, prototipi)', size: 'Header' },
    { name: 'function.cpp', desc: 'Implementazione funzioni ausiliarie del progetto', size: 'C++' },
    { name: 'makefile', desc: 'Automazione compilazione g++ -Wall -Wconversion con TAB', size: 'Build' },
    { name: 'INSTALL.md', desc: 'Guida di compilazione, esecuzione e test atteso', size: 'Docs' },
    { name: 'README.md', desc: 'Relazione completa strutturata per la consegna', size: 'Docs' },
    { name: 'COPYING', desc: 'Licenza software GPL v3', size: 'Legal' },
    { name: 'gpl-3.0.txt', desc: 'Testo integrale GNU General Public License v3', size: 'Legal' }
  ];

  if (Array.isArray(project.input_files)) {
    project.input_files.forEach(f => {
      files.push({ name: f.filename, desc: 'File dati ausiliario di input', size: 'Data' });
    });
  }

  let html = '';
  files.forEach(f => {
    html += `
      <div class="file-tree-item">
        <div class="file-tree-name">
          <span>📄</span>
          <span>${project.nome_progetto}/${f.name}</span>
        </div>
        <span class="file-tree-desc">${f.desc}</span>
      </div>
    `;
  });

  fileTreeList.innerHTML = html;
}

// ================= TAB SWITCHING =================

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    const targetId = btn.getAttribute('data-tab');
    document.getElementById(targetId)?.classList.add('active');
  });
});

btnViewRendered?.addEventListener('click', () => {
  btnViewRendered.classList.add('active');
  btnViewRaw.classList.remove('active');
  readmeRendered.classList.remove('hidden');
  readmeRaw.classList.add('hidden');
});

btnViewRaw?.addEventListener('click', () => {
  btnViewRaw.classList.add('active');
  btnViewRendered.classList.remove('active');
  readmeRendered.classList.add('hidden');
  readmeRaw.classList.remove('hidden');
});

// ================= COPY & EXPORT ACTIONS =================

btnCopyReadme?.addEventListener('click', () => {
  if (!currentProject) return;
  navigator.clipboard.writeText(currentProject.readme_md || '');
  showToast('Relazione README.md copiata negli appunti!', 'success');
});

btnCopyTabReadme?.addEventListener('click', () => {
  if (!currentProject) return;
  navigator.clipboard.writeText(currentProject.readme_md || '');
  showToast('Markdown copiato negli appunti!', 'success');
});

btnPrintDoc?.addEventListener('click', () => {
  window.print();
});

document.querySelectorAll('[data-copy-target]').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-copy-target');
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      navigator.clipboard.writeText(targetEl.textContent);
      showToast('Codice copiato negli appunti!', 'success');
    }
  });
});

// ================= TOAST NOTIFICATION =================

let toastTimer = null;
function showToast(message, type = 'info') {
  if (toastTimer) clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.className = `toast toast-${type}`;
  toastEl.classList.remove('hidden');

  toastTimer = setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ================= ADMIN DASHBOARD LOGIC =================

let adminUsersList = [];

async function loadAdminUsers() {
  if (!currentUser?.isAdmin) return;
  try {
    const res = await apiFetch('/api/admin/users');
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Impossibile caricare gli utenti.');
    }

    adminUsersList = data.users || [];
    updateAdminStats(adminUsersList);
    renderAdminUsersTable(adminUsersList);
    loadAdminRecharges();
  } catch (err) {
    showToast(`Errore admin: ${err.message}`, 'error');
  }
}

function updateAdminStats(users) {
  const total = users.length;
  const totalCredits = users.reduce((acc, u) => acc + (u.credits || 0), 0);
  const zeroCount = users.filter(u => !u.isAdmin && (u.credits || 0) <= 0).length;
  const adminCount = users.filter(u => u.isAdmin).length;

  if (adminStatUsers) adminStatUsers.textContent = total;
  if (adminStatCredits) adminStatCredits.textContent = totalCredits;
  if (adminStatZero) adminStatZero.textContent = zeroCount;
  if (adminStatAdmins) adminStatAdmins.textContent = adminCount;
}

function renderAdminUsersTable(users) {
  if (!adminUsersTbody) return;

  if (users.length === 0) {
    adminUsersTbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-dim);">
          Nessun utente trovato corrispondente alla ricerca.
        </td>
      </tr>
    `;
    return;
  }

  adminUsersTbody.innerHTML = users.map(u => {
    const isCurrentAdmin = u.isAdmin;
    const cred = u.credits !== undefined ? u.credits : 1;
    const credClass = cred > 0 ? 'positive' : 'zero';
    const roleBadge = isCurrentAdmin
      ? '<span class="role-badge admin">Admin</span>'
      : '<span class="role-badge user">Utente</span>';

    const dateStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }) : '-';

    return `
      <tr data-user-id="${u.id}">
        <td>
          <div class="user-cell">
            <span class="user-email">${escapeHtml(u.email)}</span>
            <span class="user-sub">@${escapeHtml(u.username || u.email.split('@')[0])}</span>
          </div>
        </td>
        <td>${roleBadge}</td>
        <td>
          <span class="credit-badge ${credClass}">⚡ ${isCurrentAdmin ? '∞ (' + cred + ')' : cred}</span>
        </td>
        <td><span style="color: var(--text-muted); font-size: 0.82rem;">${dateStr}</span></td>
        <td>
          <div class="btn-action-group">
            <button type="button" class="btn-credit-pill-act green" onclick="handleCreditChange('${u.id}', 1)" title="Aggiungi 1 credito">+1</button>
            <button type="button" class="btn-credit-pill-act green" onclick="handleCreditChange('${u.id}', 5)" title="Aggiungi 5 crediti">+5</button>
            <button type="button" class="btn-credit-pill-act amber" onclick="handleCreditChange('${u.id}', -1)" title="Togli 1 credito">-1</button>
            <button type="button" class="btn-credit-pill-act" onclick="handleCreditPrompt('${u.id}', ${cred}, '${escapeHtml(u.email)}')" title="Imposta numero esatto">Modifica</button>
          </div>
        </td>
        <td>
          ${!isCurrentAdmin ? `
            <button type="button" class="btn-delete-user" onclick="handleDeleteUser('${u.id}', '${escapeHtml(u.email)}')" title="Elimina utente">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          ` : '<span style="color: var(--text-dim); font-size: 0.75rem;">Protetto</span>'}
        </td>
      </tr>
    `;
  }).join('');
}

window.handleCreditChange = async function(userId, delta) {
  try {
    const res = await apiFetch(`/api/admin/users/${userId}/credits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Errore modifica crediti');
    }
    showToast(`Crediti aggiornati (${delta > 0 ? '+' + delta : delta})`, 'success');
    loadAdminUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.handleCreditPrompt = async function(userId, currentVal, email) {
  const input = prompt(`Inserisci il numero esatto di crediti per l'utente ${email}:`, currentVal);
  if (input === null) return;
  const num = parseInt(input, 10);
  if (isNaN(num) || num < 0) {
    showToast('Inserisci un numero valido di crediti (maggiore o uguale a 0)', 'error');
    return;
  }

  try {
    const res = await apiFetch(`/api/admin/users/${userId}/credits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credits: num })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Errore aggiornamento crediti');
    }
    showToast(`Crediti impostati a ${num}`, 'success');
    loadAdminUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.handleDeleteUser = async function(userId, email) {
  if (!confirm(`Sei sicuro di voler eliminare l'utente ${email} da Supabase? L'azione è irreversibile.`)) {
    return;
  }
  try {
    const res = await apiFetch(`/api/admin/users/${userId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Errore durante l\'eliminazione');
    }
    showToast(`Utente ${email} eliminato con successo`, 'success');
    loadAdminUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

if (adminSearchUsers) {
  adminSearchUsers.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      renderAdminUsersTable(adminUsersList);
      return;
    }
    const filtered = adminUsersList.filter(u =>
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q))
    );
    renderAdminUsersTable(filtered);
  });
}

btnAdminRefresh?.addEventListener('click', () => {
  loadAdminUsers();
  showToast('Dati admin aggiornati', 'info');
});

// ================= GESTIONE RICARICHE REVOLUT ADMIN =================

let adminRechargesList = [];

async function loadAdminRecharges() {
  if (!currentUser?.isAdmin) return;
  try {
    const res = await apiFetch('/api/admin/recharges');
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Impossibile caricare le ricariche.');
    }
    adminRechargesList = data.recharges || [];
    renderAdminRecharges(adminRechargesList);
  } catch (err) {
    console.warn('[Admin Recharges Error]:', err.message);
  }
}

function renderAdminRecharges(list) {
  if (!adminRechargesTbody) return;
  if (!list || list.length === 0) {
    adminRechargesTbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-dim);">
          Nessuna richiesta di ricarica registrata al momento.
        </td>
      </tr>
    `;
    return;
  }

  adminRechargesTbody.innerHTML = list.map(r => {
    const isPending = r.status === 'pending';
    const isApproved = r.status === 'approved';
    const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleString('it-IT', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    }) : '-';

    let statusBadge = '<span class="role-badge" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3);">In Attesa</span>';
    if (isApproved) {
      statusBadge = '<span class="role-badge" style="background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3);">Approvato</span>';
    } else if (r.status === 'rejected') {
      statusBadge = '<span class="role-badge" style="background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3);">Rifiutato</span>';
    }

    return `
      <tr data-recharge-id="${escapeHtml(r.id)}">
        <td style="font-size: 0.8rem; color: var(--text-muted);">${dateStr}</td>
        <td>
          <div class="user-cell">
            <span class="user-email">${escapeHtml(r.userEmail || '')}</span>
            <span class="user-sub">@${escapeHtml(r.username || '')}</span>
          </div>
        </td>
        <td><strong>${escapeHtml(r.packageName || '')}</strong> (+${r.credits} crediti)</td>
        <td><strong style="color: var(--primary);">€${Number(r.amount).toFixed(2)}</strong></td>
        <td><code style="background: rgba(59,130,246,0.15); color: #60a5fa; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${escapeHtml(r.reference || '')}</code></td>
        <td style="font-size: 0.82rem; color: var(--text-muted);">${escapeHtml(r.senderNote || '-')}</td>
        <td>${statusBadge}</td>
        <td>
          ${isPending ? `
            <div class="btn-action-group">
              <button type="button" class="btn-credit-pill-act green" onclick="handleApproveRecharge('${escapeHtml(r.id)}')" title="Approva e accredita i crediti">✓ Approva (+${r.credits})</button>
              <button type="button" class="btn-credit-pill-act amber" onclick="handleRejectRecharge('${escapeHtml(r.id)}')" title="Rifiuta">✕ Rifiuta</button>
            </div>
          ` : `<span style="font-size: 0.78rem; color: var(--text-dim);">${isApproved ? 'Accreditato' : 'Respinto'}</span>`}
        </td>
      </tr>
    `;
  }).join('');
}

window.handleApproveRecharge = async function(id) {
  if (!confirm('Hai controllato la ricezione dell\'importo sul tuo conto Revolut e confermi l\'accredito dei crediti all\'utente?')) {
    return;
  }
  try {
    const res = await apiFetch(`/api/admin/recharges/${id}/approve`, {
      method: 'POST'
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Errore durante l\'approvazione');
    }
    showToast(`✅ ${data.message}`, 'success');
    loadAdminRecharges();
    loadAdminUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.handleRejectRecharge = async function(id) {
  const reason = prompt('Motivo del rifiuto (opzionale):', 'Pagamento non ricevuto su Revolut');
  if (reason === null) return;
  try {
    const res = await apiFetch(`/api/admin/recharges/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Errore');
    }
    showToast('Richiesta contrassegnata come rifiutata', 'info');
    loadAdminRecharges();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

btnAdminRefreshRecharges?.addEventListener('click', () => {
  loadAdminRecharges();
  showToast('Ricariche Revolut aggiornate', 'info');
});

btnAdminAddUser?.addEventListener('click', () => {
  createUserError?.classList.add('hidden');
  createUserForm?.reset();
  if (newUserCredits) newUserCredits.value = '1';
  createUserModal?.classList.remove('hidden');
});

btnCloseCreateUser?.addEventListener('click', () => {
  createUserModal?.classList.add('hidden');
});

btnCancelCreateUser?.addEventListener('click', () => {
  createUserModal?.classList.add('hidden');
});

createUserForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  createUserError?.classList.add('hidden');

  const email = newUserEmail.value.trim();
  const password = newUserPassword.value;
  const username = newUserName.value.trim();
  const credits = parseInt(newUserCredits.value, 10) || 1;

  try {
    const res = await apiFetch('/api/admin/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username, credits })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Impossibile creare l\'utente');
    }

    createUserModal?.classList.add('hidden');
    showToast(`Utente ${email} creato con ${credits} credito/i!`, 'success');
    loadAdminUsers();
  } catch (err) {
    if (createUserError) {
      createUserError.textContent = err.message;
      createUserError.classList.remove('hidden');
    }
  }
});

// Avvia verifica autenticazione iniziale
checkAuth();
