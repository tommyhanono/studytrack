/* ── StudyTrack — Main App Controller ────────── */

window.ST = window.ST || {};

/* Settings */
ST.settings = {
  get(key) { return localStorage.getItem('st_' + key) || (window.ST.CONFIG && ST.CONFIG[key]) || ''; },
  set(key, val) { localStorage.setItem('st_' + key, val); }
};

/* App state */
ST.app = {
  track: null,       // 'judaicas' | 'regulares'
  subject: null,
  deepMode: false,
  parsedInput: null, // { type, content } — last parsed file/image
  activeTab: 'file',
  classroomText: '',
  classroomTitle: '',
  driveData: null,
  driveFilename: '',

  /* ── Boot ─────────────────────────────────── */
  init() {
    this._loadSettings();
    this._bindLanding();
    this._bindSettings();
    this._bindInput();
    this._bindOutput();

    // Restore last track
    const lastTrack = ST.settings.get('lastTrack');
    if (lastTrack) {
      // Just show landing, don't auto-navigate
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  },

  /* ── Landing ──────────────────────────────── */
  _bindLanding() {
    document.querySelectorAll('.track-card').forEach(card => {
      card.addEventListener('click', () => {
        this.track = card.dataset.track;
        ST.settings.set('lastTrack', this.track);
        // Defer past current event loop so the click event fully resolves
        // before new screen buttons become visible (prevents ghost-clicks).
        setTimeout(() => this._showInput(), 0);
      });
    });
  },

  /* ── Settings modal ───────────────────────── */
  _loadSettings() {
    document.getElementById('input-api-key').value = ST.settings.get('apiKey');
    document.getElementById('input-google-client-id').value = ST.settings.get('googleClientId');
    document.getElementById('input-google-api-key').value = ST.settings.get('googleApiKey');
  },

  _bindSettings() {
    document.querySelectorAll('.btn-open-settings').forEach(btn => {
      btn.addEventListener('click', () => this._openSettings());
    });
    document.getElementById('btn-close-settings').addEventListener('click', () => this._closeSettings());
    document.getElementById('modal-settings').addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal-settings')) this._closeSettings();
    });
    document.getElementById('btn-save-settings').addEventListener('click', () => {
      ST.settings.set('apiKey', document.getElementById('input-api-key').value.trim());
      ST.settings.set('googleClientId', document.getElementById('input-google-client-id').value.trim());
      ST.settings.set('googleApiKey', document.getElementById('input-google-api-key').value.trim());
      ST.google.init();
      const confirm = document.getElementById('save-confirm');
      confirm.classList.add('visible');
      setTimeout(() => confirm.classList.remove('visible'), 2000);
    });
  },

  _openSettings() {
    this._loadSettings();
    document.getElementById('modal-settings').classList.remove('hidden');
  },
  _closeSettings() {
    document.getElementById('modal-settings').classList.add('hidden');
  },

  /* ── Input screen ─────────────────────────── */
  _showInput() {
    // Reset state
    this.parsedInput = null;
    this.classroomText = '';
    this.classroomTitle = '';
    this.driveData = null;
    this.driveFilename = '';
    this.deepMode = false;
    this.activeTab = 'file';

    // Update UI for track
    const isJudaicas = this.track === 'judaicas';
    const badge = document.getElementById('input-track-badge');
    badge.textContent = isJudaicas ? 'Judaicas' : 'Materias Regulares';
    badge.className = 'input-track-badge ' + (isJudaicas ? 'badge-judaicas' : 'badge-regulares');

    const tabsRow = document.getElementById('input-tabs-row');
    tabsRow.className = 'input-tabs ' + (isJudaicas ? 'tab-judaicas' : 'tab-regulares');

    document.getElementById('subject-row').classList.toggle('hidden', isJudaicas);
    document.getElementById('depth-row').classList.toggle('hidden', !isJudaicas);
    document.getElementById('chk-deep').checked = false;

    const submitBtn = document.getElementById('btn-submit');
    submitBtn.className = 'btn-primary ' + (isJudaicas ? 'btn-judaicas' : 'btn-regulares');

    // Reset file UI
    this._resetFileZone();
    document.getElementById('text-input').value = '';
    document.getElementById('classroom-dynamic').innerHTML = '';
    document.getElementById('drive-dynamic').innerHTML = '';
    document.getElementById('input-error').textContent = '';
    document.getElementById('input-error').classList.remove('visible');

    this._switchTab('file');
    this._showScreen('screen-input');
  },

  _bindInput() {
    // Back button
    document.getElementById('btn-back').addEventListener('click', () => {
      this._showScreen('screen-landing');
    });

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this._switchTab(btn.dataset.tab));
    });

    // File drop zone
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    document.getElementById('btn-choose-file').addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('click', (e) => {
      if (e.target.id === 'drop-zone' || e.target.closest('.drop-zone-placeholder')) {
        fileInput.click();
      }
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) this._handleFile(e.target.files[0]);
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) this._handleFile(file);
    });

    document.getElementById('btn-remove-file').addEventListener('click', () => this._resetFileZone());

    // Deep mode toggle
    document.getElementById('chk-deep').addEventListener('change', (e) => {
      this.deepMode = e.target.checked;
    });

    // Subject
    document.getElementById('subject-select').addEventListener('change', (e) => {
      this.subject = e.target.value;
    });

    // Google buttons
    document.getElementById('btn-classroom-connect').addEventListener('click', () => {
      ST.google.requestToken('classroom');
    });
    document.getElementById('btn-drive-connect').addEventListener('click', () => {
      ST.google.requestToken('drive');
    });

    // Submit
    document.getElementById('btn-submit').addEventListener('click', () => this._submit());
  },

  _switchTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === 'pane-' + tab));
  },

  async _handleFile(file) {
    const placeholder = document.getElementById('drop-placeholder');
    const preview = document.getElementById('file-preview-row');
    const nameEl = document.getElementById('file-preview-name');
    const errorEl = document.getElementById('input-error');

    placeholder.classList.add('hidden');
    nameEl.textContent = file.name;
    preview.classList.remove('hidden');
    errorEl.classList.remove('visible');
    this.parsedInput = null;

    try {
      this.parsedInput = await ST.parsers.parse(file);
    } catch (e) {
      errorEl.textContent = e.message;
      errorEl.classList.add('visible');
      this._resetFileZone();
    }
  },

  _resetFileZone() {
    document.getElementById('drop-placeholder').classList.remove('hidden');
    document.getElementById('file-preview-row').classList.add('hidden');
    document.getElementById('file-input').value = '';
    this.parsedInput = null;
  },

  setClassroomContent(text, title) {
    this.classroomText = text;
    this.classroomTitle = title;
    this.toast('✓ Tarea cargada desde Classroom');
  },

  setDriveContent(parsed, filename) {
    this.driveData = parsed;
    this.driveFilename = filename;
    this.toast('✓ Archivo cargado desde Drive');
  },

  /* ── Submit ───────────────────────────────── */
  async _submit() {
    const errorEl = document.getElementById('input-error');
    errorEl.classList.remove('visible');

    // Validate
    if (this.track === 'regulares' && !this.subject) {
      errorEl.textContent = 'Selecciona una materia antes de continuar.';
      errorEl.classList.add('visible');
      return;
    }

    // Gather content
    let contentType = 'text';
    let content = '';
    let originalDisplay = '';

    if (this.activeTab === 'file') {
      if (!this.parsedInput) {
        errorEl.textContent = 'Sube un archivo primero.';
        errorEl.classList.add('visible');
        return;
      }
      if (this.parsedInput.type === 'image') {
        contentType = 'image';
        content = this.parsedInput.content;
        originalDisplay = '[Imagen — ver panel izquierdo]';
      } else {
        content = this.parsedInput.content;
        originalDisplay = content;
      }
    } else if (this.activeTab === 'text') {
      content = document.getElementById('text-input').value.trim();
      if (!content) {
        errorEl.textContent = 'Pega el texto de tu tarea primero.';
        errorEl.classList.add('visible');
        return;
      }
      originalDisplay = content;
    } else if (this.activeTab === 'classroom') {
      if (!this.classroomText) {
        errorEl.textContent = 'Selecciona una tarea de Classroom primero.';
        errorEl.classList.add('visible');
        return;
      }
      content = this.classroomText;
      originalDisplay = content;
    } else if (this.activeTab === 'drive') {
      if (!this.driveData) {
        errorEl.textContent = 'Selecciona un archivo de Drive primero.';
        errorEl.classList.add('visible');
        return;
      }
      if (this.driveData.type === 'image') {
        contentType = 'image';
        content = this.driveData.content;
        originalDisplay = `[Imagen desde Drive: ${this.driveFilename}]`;
      } else {
        content = this.driveData.content;
        originalDisplay = content;
      }
    }

    // Show processing
    const spinner = document.getElementById('processing-spinner');
    spinner.className = 'spinner ' + (this.track === 'judaicas' ? 'spinner-gold' : '');
    this._showScreen('screen-processing');

    try {
      const result = await ST.api.callClaude({
        content,
        contentType,
        track: this.track,
        subject: this.subject,
        deepMode: this.deepMode
      });

      this._showOutput(originalDisplay, result, contentType === 'image' ? this.parsedInput || this.driveData : null);
    } catch (e) {
      this._showScreen('screen-input');
      errorEl.textContent = e.message;
      errorEl.classList.add('visible');
    }
  },

  /* ── Output screen ────────────────────────── */
  _showOutput(original, response, imageData) {
    const isJudaicas = this.track === 'judaicas';

    // Draft banner
    document.getElementById('draft-banner').classList.toggle('hidden', isJudaicas);

    // Panel headers
    const leftHeader = document.getElementById('output-left-header');
    const rightHeader = document.getElementById('output-right-header');
    leftHeader.className = 'panel-header ' + (isJudaicas ? 'judaicas-header' : 'regulares-header');
    rightHeader.className = 'panel-header ' + (isJudaicas ? 'judaicas-header' : 'regulares-header');

    // Original content
    const origBox = document.getElementById('original-content');
    if (imageData) {
      // Show the image
      const img = document.createElement('img');
      img.style.cssText = 'max-width:100%;border-radius:6px';
      img.src = `data:${imageData.content.mediaType};base64,${imageData.content.data}`;
      origBox.innerHTML = '';
      origBox.appendChild(img);
    } else {
      origBox.textContent = original;
    }

    // Response content (editable)
    const respBox = document.getElementById('response-content');
    respBox.textContent = response;

    this._showScreen('screen-output');
  },

  _bindOutput() {
    document.getElementById('btn-new-task').addEventListener('click', () => {
      this._showScreen('screen-landing');
    });

    document.getElementById('btn-copy').addEventListener('click', async () => {
      const text = document.getElementById('response-content').innerText;
      try {
        await ST.export.copyToClipboard(text);
        const btn = document.getElementById('btn-copy');
        btn.textContent = '✓ Copiado';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = '📋 Copiar';
          btn.classList.remove('copied');
        }, 2000);
      } catch {
        this.toast('No se pudo copiar');
      }
    });

    document.getElementById('btn-download-txt').addEventListener('click', () => {
      const text = document.getElementById('response-content').innerText;
      ST.export.downloadTxt(text, 'respuesta.txt');
    });

    document.getElementById('btn-download-docx').addEventListener('click', () => {
      const text = document.getElementById('response-content').innerText;
      ST.export.downloadDocx(text, 'respuesta.docx');
    });
  },

  /* ── Utilities ────────────────────────────── */
  _showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  },

  toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
  }
};

/* Boot */
document.addEventListener('DOMContentLoaded', () => {
  ST.google.init();
  ST.app.init();
});
