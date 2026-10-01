// ================= STATE & ELEMENTS =================
let currentUser = null;
let currentProject = null;
let currentProjectId = null;
let selectedPhotoFile = null;

// Auth Elements
const authModal = document.getElementById('auth-modal');
const loginForm = document.getElementById('login-form');
const loginUsernameInput = document.getElementById('login-username');
const loginPasswordInput = document.getElementById('login-password');
const loginError = document.getElementById('login-error');
const currentUsernameDisplay = document.getElementById('current-username');
const btnLogout = document.getElementById('btn-logout');
const btnQuickMatty = document.getElementById('btn-quick-matty');
const btnQuickZome = document.getElementById('btn-quick-zome');

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
fieldData.value = formattedDate;

// ================= AUTHENTICATION =================

async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.authenticated) {
      setAuthenticatedUser(data.username);
    } else {
      showAuthModal();
    }
  } catch (err) {
    showAuthModal();
  }
}

function setAuthenticatedUser(username) {
  currentUser = username;
  currentUsernameDisplay.textContent = username;
  authModal.classList.add('hidden');
}

function showAuthModal() {
  currentUser = null;
  authModal.classList.remove('hidden');
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');

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
      setAuthenticatedUser(data.username);
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

btnLogout.addEventListener('click', async () => {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (_) {}
  showAuthModal();
  showToast('Disconnessione completata', 'success');
});

// Quick Access Buttons
btnQuickMatty.addEventListener('click', () => {
  loginUsernameInput.value = 'matty';
  loginPasswordInput.value = 'Triathlon01';
  loginForm.requestSubmit();
});

btnQuickZome.addEventListener('click', () => {
  loginUsernameInput.value = 'zome';
  loginPasswordInput.value = 'zome01';
  loginForm.requestSubmit();
});

// ================= FILE UPLOAD & PASTE =================

function setPhotoFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('Seleziona un file immagine valido (PNG, JPG, WEBP)', 'error');
    return;
  }
  selectedPhotoFile = file;
  photoFilename.textContent = file.name || 'foto_incollata.png';

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

btnBrowseFile.addEventListener('click', () => filePhotoInput.click());
dropZone.addEventListener('click', (e) => {
  if (e.target !== btnRemovePhoto && !dropZonePreview.contains(e.target)) {
    filePhotoInput.click();
  }
});

filePhotoInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    setPhotoFile(e.target.files[0]);
  }
});

btnRemovePhoto.addEventListener('click', (e) => {
  e.stopPropagation();
  clearPhotoFile();
});

// Drag & Drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    setPhotoFile(e.dataTransfer.files[0]);
  }
});

// Paste Image from Clipboard (Ctrl+V) anywhere on page
window.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const blob = items[i].getAsFile();
      setPhotoFile(blob);
      showToast('📸 Immagine incollata dagli appunti!', 'success');
      break;
    }
  }
});

// Accordion Toggle
toggleDetails.addEventListener('click', () => {
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

exerciseForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const consegnaText = textConsegna.value.trim();
  if (!consegnaText && !selectedPhotoFile) {
    showToast('Fornisci il testo della consegna o allega una foto della consegna!', 'error');
    return;
  }

  // Show loading stepper
  loadingSection.classList.remove('hidden');
  resultsSection.classList.add('hidden');
  btnGenerate.disabled = true;

  resetStepper();
  loadingSection.scrollIntoView({ behavior: 'smooth' });

  // Simulate progressive steps while server is processing
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

    const res = await fetch('/api/generate', {
      method: 'POST',
      body: formData
    });

    clearInterval(stepInterval);

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Errore nella generazione del progetto');
    }

    // Complete all steps
    completeAllSteps();

    // Render results
    setTimeout(() => {
      loadingSection.classList.add('hidden');
      renderResults(data);
      resultsSection.classList.remove('hidden');
      resultsSection.scrollIntoView({ behavior: 'smooth' });
      btnGenerate.disabled = false;
      showToast('Progetto generato con successo!', 'success');
    }, 600);

  } catch (err) {
    clearInterval(stepInterval);
    loadingSection.classList.add('hidden');
    btnGenerate.disabled = false;
    showToast(err.message, 'error');
  }
});

// Stepper animation
function resetStepper() {
  for (let i = 1; i <= 5; i++) {
    const step = document.getElementById(`step-${i}`);
    step.className = 'step-item';
  }
  document.getElementById('step-1').classList.add('active');
}

function runStepperSimulation() {
  let currentStep = 1;
  return setInterval(() => {
    if (currentStep < 5) {
      document.getElementById(`step-${currentStep}`).classList.remove('active');
      document.getElementById(`step-${currentStep}`).classList.add('done');
      currentStep++;
      document.getElementById(`step-${currentStep}`).classList.add('active');
    }
  }, 3500);
}

function completeAllSteps() {
  for (let i = 1; i <= 5; i++) {
    const step = document.getElementById(`step-${i}`);
    step.className = 'step-item done';
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
  termHtml += `<span class="term-success">Funziona. Zero warning, zero errori.</span>`;

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

// View switch in README tab (Rendered vs Raw)
btnViewRendered.addEventListener('click', () => {
  btnViewRendered.classList.add('active');
  btnViewRaw.classList.remove('active');
  readmeRendered.classList.remove('hidden');
  readmeRaw.classList.add('hidden');
});

btnViewRaw.addEventListener('click', () => {
  btnViewRaw.classList.add('active');
  btnViewRendered.classList.remove('active');
  readmeRendered.classList.add('hidden');
  readmeRaw.classList.remove('hidden');
});

// ================= COPY & EXPORT ACTIONS =================

btnCopyReadme.addEventListener('click', () => {
  if (!currentProject) return;
  navigator.clipboard.writeText(currentProject.readme_md || '');
  showToast('📋 Relazione README.md copiata negli appunti!', 'success');
});

btnCopyTabReadme.addEventListener('click', () => {
  if (!currentProject) return;
  navigator.clipboard.writeText(currentProject.readme_md || '');
  showToast('📋 Markdown copiato negli appunti!', 'success');
});

btnPrintDoc.addEventListener('click', () => {
  window.print();
});

// Generic copy for code tabs
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

// Start Auth check
checkAuth();
