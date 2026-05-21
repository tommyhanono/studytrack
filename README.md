# StudyTrack

Asistente de estudio personal — Judaicas y Materias Regulares.

---

## Configuración rápida

### 1. Claude API Key (requerida)

1. Ve a [console.anthropic.com](https://console.anthropic.com) → **API Keys** → crea una clave.
2. Abre la app → toca **⚙** (Ajustes) → pega la clave en el campo **Claude API Key** → Guardar.

La clave se guarda en `localStorage` de tu navegador y nunca sale de tu dispositivo (solo se usa para llamar directamente a la API de Anthropic desde el navegador).

---

### 2. Google Classroom + Drive (opcional)

Si quieres conectar Google Classroom o Drive, necesitas una cuenta en Google Cloud:

#### Paso A — Crear proyecto y credenciales

1. Ve a [console.cloud.google.com](https://console.cloud.google.com).
2. Crea un proyecto nuevo (ej. "StudyTrack").
3. Habilita estas APIs en **APIs y servicios → Biblioteca**:
   - Google Classroom API
   - Google Drive API
   - Google Picker API
4. Ve a **APIs y servicios → Credenciales → Crear credenciales → ID de cliente OAuth 2.0**.
   - Tipo de aplicación: **Aplicación web**
   - Orígenes autorizados de JavaScript:
     - Para local: `http://localhost:8080` (o el puerto que uses)
     - Para GitHub Pages: `https://TU-USUARIO.github.io`
   - Copia el **Client ID** (termina en `.apps.googleusercontent.com`).
5. En la misma página de Credenciales, crea también una **Clave de API** (para el Drive Picker).

#### Paso B — Pantalla de consentimiento OAuth

En **APIs y servicios → Pantalla de consentimiento de OAuth**:
- Tipo: **Externo** → agrega tu cuenta como usuario de prueba.
- Scopes requeridos: `classroom.courses.readonly`, `classroom.coursework.me.readonly`, `drive.readonly`.

#### Paso C — Configurar en la app

En **⚙ Ajustes**:
- **Google Client ID**: pega el Client ID de OAuth.
- **Google API Key**: pega la clave de API (para Drive Picker).

---

## Ejecutar localmente

Los navegadores modernos bloquean módulos ES y Service Workers con `file://`. Sirve la carpeta con cualquier servidor local:

```bash
# Python (incluido en Mac/Linux)
cd studytrack
python3 -m http.server 8080
# Abre http://localhost:8080
```

Alternativas: VS Code → extensión **Live Server**, o `npx serve .`

---

## Instalar como PWA (iPad / iPhone / Mac)

### iPhone / iPad
1. Abre la app en Safari (`http://localhost:8080` o tu URL de GitHub Pages).
2. Toca el botón de compartir → **Añadir a pantalla de inicio**.

### Mac (Chrome / Edge)
1. Abre la app en Chrome.
2. En la barra de URL, toca el ícono de instalar (⊕) → **Instalar StudyTrack**.

> **Nota:** Para instalación en iOS se requiere HTTPS. En local funciona solo en navegador. Para instalar en iPhone/iPad, despliega en GitHub Pages (ver abajo).

---

## Desplegar en GitHub Pages

1. Sube la carpeta `studytrack/` a un repositorio de GitHub.
2. Ve a **Settings → Pages → Source: main branch → / (root)**.
3. La app estará en `https://TU-USUARIO.github.io/studytrack/`.
4. Actualiza los **Orígenes autorizados** en Google Cloud con esa URL.

---

## Estructura de archivos

```
studytrack/
├── index.html          — App completa (single page)
├── manifest.json       — Configuración PWA
├── sw.js               — Service worker (offline shell)
├── styles.css          — Estilos
├── js/
│   ├── app.js          — Controlador principal
│   ├── api.js          — Integración Claude API + prompts
│   ├── parsers.js      — PDF, Word, imagen
│   ├── google.js       — Google OAuth, Classroom, Drive
│   └── export.js       — Copiar, .txt, .docx
└── icons/
    └── icon.svg        — Ícono de la app
```

---

## Nota de privacidad

- Tu API Key de Claude y tus credenciales de Google se almacenan **solo en `localStorage`** de tu dispositivo.
- El contenido de tus tareas se envía a la API de Anthropic (Claude) para generar respuestas. No se almacena en ningún servidor propio.
- Los archivos de Google Drive se descargan directamente desde la API de Google a tu navegador; no pasan por ningún servidor intermedio.
