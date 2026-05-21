/* ── Google OAuth + Classroom + Drive ─────────── */

window.ST = window.ST || {};

window.ST.google = {
  tokenClient: null,
  accessToken: null,
  pickerApiLoaded: false,

  SCOPES: [
    'https://www.googleapis.com/auth/classroom.courses.readonly',
    'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
    'https://www.googleapis.com/auth/classroom.coursework.students.readonly',
    'https://www.googleapis.com/auth/drive.readonly'
  ].join(' '),

  init() {
    // GIS is loaded async; check if ready
    if (window.google && window.google.accounts) {
      this._initClient();
    } else {
      // Wait for GIS to load
      const interval = setInterval(() => {
        if (window.google && window.google.accounts) {
          clearInterval(interval);
          this._initClient();
        }
      }, 300);
    }
  },

  _initClient() {
    const clientId = ST.settings.get('googleClientId');
    if (!clientId) return;

    this.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: this.SCOPES,
      callback: (resp) => {
        if (resp.error) {
          ST.app.toast('Error de autorización: ' + resp.error);
          return;
        }
        this.accessToken = resp.access_token;
        this._onTokenReady();
      }
    });
  },

  _pendingAction: null,

  requestToken(action) {
    const clientId = ST.settings.get('googleClientId');
    if (!clientId) {
      ST.app.toast('Configura el Google Client ID en Ajustes (⚙)');
      return;
    }

    if (!this.tokenClient) this._initClient();
    if (!this.tokenClient) {
      ST.app.toast('Google Identity Services no cargó. Verifica tu conexión.');
      return;
    }

    this._pendingAction = action;
    if (this.accessToken) {
      this._onTokenReady();
    } else {
      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    }
  },

  _onTokenReady() {
    if (this._pendingAction === 'classroom') this.loadClassroom();
    else if (this._pendingAction === 'drive') this.openDrivePicker();
    this._pendingAction = null;
  },

  /* ── Google Classroom ─────────────────────── */

  async loadClassroom() {
    const el = document.getElementById('classroom-dynamic');
    if (!el) return;
    el.innerHTML = '<p style="color:var(--subtext);font-size:0.85rem">Cargando cursos...</p>';

    try {
      const courses = await this._fetchJSON(
        'https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE&pageSize=20'
      );

      if (!courses.courses?.length) {
        el.innerHTML = '<p style="color:var(--subtext);font-size:0.85rem">No se encontraron cursos activos.</p>';
        return;
      }

      el.innerHTML = '<p class="section-label">Selecciona un curso</p>';
      const list = document.createElement('div');
      list.className = 'picker-list';

      for (const course of courses.courses) {
        const btn = document.createElement('button');
        btn.className = 'picker-item';
        btn.innerHTML = `<div>${course.name}</div><div class="item-sub">${course.section || ''}</div>`;
        btn.onclick = () => this.loadAssignments(course.id, course.name, el);
        list.appendChild(btn);
      }
      el.appendChild(list);
    } catch (e) {
      el.innerHTML = `<p style="color:var(--error);font-size:0.85rem">Error: ${e.message}</p>`;
    }
  },

  async loadAssignments(courseId, courseName, el) {
    el.innerHTML = `<p style="color:var(--subtext);font-size:0.85rem">Cargando tareas de "${courseName}"...</p>`;

    try {
      const works = await this._fetchJSON(
        `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork?courseWorkStates=PUBLISHED&pageSize=20`
      );

      if (!works.courseWork?.length) {
        el.innerHTML = `<p style="color:var(--subtext);font-size:0.85rem">No hay tareas publicadas en "${courseName}".</p>`;
        return;
      }

      el.innerHTML = `
        <button class="picker-item" style="margin-bottom:8px;color:var(--subtext)" onclick="ST.google.loadClassroom()">← Volver a cursos</button>
        <p class="section-label">Tareas de ${courseName}</p>
      `;
      const list = document.createElement('div');
      list.className = 'picker-list';

      for (const work of works.courseWork) {
        const btn = document.createElement('button');
        btn.className = 'picker-item';
        const due = work.dueDate ? `Entrega: ${work.dueDate.month}/${work.dueDate.day}/${work.dueDate.year}` : '';
        btn.innerHTML = `<div>${work.title}</div><div class="item-sub">${due}</div>`;
        btn.onclick = () => this.selectAssignment(work, el);
        list.appendChild(btn);
      }
      el.appendChild(list);
    } catch (e) {
      el.innerHTML = `<p style="color:var(--error);font-size:0.85rem">Error: ${e.message}</p>`;
    }
  },

  selectAssignment(work, el) {
    const text = [
      work.title,
      work.description || ''
    ].join('\n\n').trim();

    ST.app.setClassroomContent(text, work.title);

    el.innerHTML = `
      <div style="padding:12px;background:var(--surface2);border-radius:var(--radius-sm);border:1px solid var(--border)">
        <div style="font-weight:600;margin-bottom:4px">${work.title}</div>
        <div style="font-size:0.82rem;color:var(--subtext)">${work.description ? work.description.slice(0, 120) + '...' : 'Sin descripción'}</div>
        <button class="picker-item" style="margin-top:10px;color:var(--subtext)" onclick="ST.google.loadAssignments('${work.courseId}','',document.getElementById('classroom-dynamic'))">← Cambiar tarea</button>
      </div>
    `;
  },

  /* ── Google Drive Picker ──────────────────── */

  openDrivePicker() {
    const apiKey = ST.settings.get('googleApiKey');
    if (!apiKey) {
      ST.app.toast('Configura el Google API Key en Ajustes para Drive Picker.');
      return;
    }

    if (!this.pickerApiLoaded) {
      gapi.load('picker', () => {
        this.pickerApiLoaded = true;
        this._showPicker(apiKey);
      });
    } else {
      this._showPicker(apiKey);
    }
  },

  _showPicker(apiKey) {
    const picker = new google.picker.PickerBuilder()
      .addView(new google.picker.DocsView()
        .setIncludeFolders(false)
        .setMimeTypes('application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/jpeg,image/png'))
      .setOAuthToken(this.accessToken)
      .setDeveloperKey(apiKey)
      .setCallback((data) => this._pickerCallback(data))
      .build();
    picker.setVisible(true);
  },

  async _pickerCallback(data) {
    if (data.action !== google.picker.Action.PICKED) return;
    const file = data.docs[0];
    const driveEl = document.getElementById('drive-dynamic');

    if (driveEl) driveEl.innerHTML = `<p style="color:var(--subtext);font-size:0.85rem">Descargando "${file.name}"...</p>`;

    try {
      const mimeType = file.mimeType;
      let content, parsed;

      if (mimeType === 'application/pdf') {
        const blob = await this._fetchBlob(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`);
        const f = new File([blob], file.name, { type: 'application/pdf' });
        parsed = await ST.parsers.parse(f);
      } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const blob = await this._fetchBlob(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`);
        const f = new File([blob], file.name, { type: mimeType });
        parsed = await ST.parsers.parse(f);
      } else if (mimeType.startsWith('image/')) {
        const blob = await this._fetchBlob(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`);
        const f = new File([blob], file.name, { type: mimeType });
        parsed = await ST.parsers.parse(f);
      } else if (mimeType === 'text/plain') {
        const text = await this._fetchText(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`);
        parsed = { type: 'text', content: text };
      } else {
        throw new Error(`Tipo de archivo no compatible: ${mimeType}`);
      }

      ST.app.setDriveContent(parsed, file.name);

      if (driveEl) {
        driveEl.innerHTML = `
          <div style="padding:12px;background:var(--surface2);border-radius:var(--radius-sm);border:1px solid var(--border)">
            <div style="font-weight:600">📄 ${file.name}</div>
            <div style="font-size:0.82rem;color:var(--success);margin-top:4px">✓ Archivo cargado</div>
          </div>
        `;
      }
    } catch (e) {
      if (driveEl) driveEl.innerHTML = `<p style="color:var(--error);font-size:0.85rem">Error: ${e.message}</p>`;
    }
  },

  /* ── Fetch helpers ────────────────────────── */

  async _fetchJSON(url) {
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${this.accessToken}` } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  },

  async _fetchBlob(url) {
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${this.accessToken}` } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.blob();
  },

  async _fetchText(url) {
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${this.accessToken}` } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.text();
  }
};
