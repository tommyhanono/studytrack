# StudyTrack

Asistente de estudio personal — Judaicas y Materias Regulares.

🔗 **[Abrir StudyTrack](https://tommyhanono.github.io/studytrack/)**

> Funciona directo, sin configuración. Solo abrí el link.

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
