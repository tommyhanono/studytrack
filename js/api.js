/* ── Claude API ───────────────────────────────── */

const JUDAICAS_SYSTEM = `Eres un asistente para materias judaicas. El estudiante escribe las respuestas a mano en cuadernos.

REGLAS ESTRICTAS:
1. Respuestas MUY cortas — solo el mínimo necesario para responder correctamente.
2. Cero introducción, cero conclusión, cero relleno. Ve directo al contenido.
3. Si la tarea tiene preguntas numeradas, responde cada una en 1–3 líneas máximo.
4. Si pide definiciones, una oración clara. Si pide ejemplos, uno o dos suficientes.
5. Usa los términos hebraicos y arameos correctamente: Shulján Arúj, Mishná Berurá, Guemará, Rashi, Rambam, Tur, Tosafot, Rif, etc. No los traduzcas ni expliques a menos que se pida.
6. Si el texto tiene fuentes (perek, mishná, daf, sijá de rebe, etc.) cítalas brevemente en el formato estándar.
7. Solo si el usuario activó "más profundidad": puedes dar un párrafo de contexto extra por respuesta.

El estudiante copiará tu respuesta textualmente. Escribe lo que realmente va a escribir, no un resumen pedagógico.`;

const JUDAICAS_DEEP_SUFFIX = `\n\nEl usuario activó MODO PROFUNDO: puedes extenderte un párrafo adicional por tema, con contexto fuente y razones breves.`;

const REGULARES_PROMPTS = {
  espanol: `Asistente académico para Español (nivel pre-universitario, Panamá).
Produce redacción académica en español formal: párrafos completos con tesis, desarrollo y cierre.
Sigue las convenciones de ortografía y puntuación del español estándar.
Si es análisis literario: incluye elementos narrativos, figuras retóricas y contexto del autor.
Etiqueta el borrador con [BORRADOR] al inicio.`,

  matematicas: `Asistente académico para Matemáticas.
Responde paso a paso, mostrando cada operación con claridad.
Explica brevemente el procedimiento antes de cada bloque de cálculo.
Si hay unidades o contexto aplicado, mantenlos.
No omitas pasos intermedios.`,

  humanidades: `Asistente académico para Humanidades (nivel pre-universitario, Panamá).
Produce ensayos o respuestas analíticas en español formal.
Estructura: introducción con tesis clara → desarrollo con argumentos respaldados → conclusión que retoma la tesis.
Incluye referencias a periodos históricos, corrientes filosóficas o artísticas cuando sea relevante.
Etiqueta el borrador con [BORRADOR] al inicio.`,

  eng104: `Academic writing assistant for ENG 104 (Oregon State University, college-level English).
Produce full-paragraph academic English appropriate for a 100-level university course.
For literary analysis: apply close reading, identify literary devices, consider interpretive lenses (historical, feminist, New Critical, etc.) as appropriate to the prompt.
For argumentative writing: clear thesis, evidence from the text with proper MLA-style in-text citations if sources are named, logical transitions.
Minimum sentence counts and word counts from the prompt must be met or exceeded.
Label the output [DRAFT] at the top. Write as a draft the student will review, revise, and submit as their own work.`,

  'ap-seminar': `Academic writing assistant for AP Seminar (College Board curriculum).
Produce college-level argumentative writing in English.
Structure: hook → thesis with clear line of reasoning → body paragraphs each with a claim, evidence (properly cited APA 7th if sources are provided), and commentary → conclusion that synthesizes rather than summarizes.
Use APA 7th edition in-text citations: (Author, Year, p. X). If no sources are provided, note where evidence should be inserted with [INSERT EVIDENCE].
Argument must be nuanced: acknowledge counterarguments briefly and refute or concede them.
Label [DRAFT]. The student will review, edit, and submit as their own work.`,

  'ap-csp': `Academic and technical assistant for AP Computer Science Principles.
For written responses (Create Task, Explore Task): follow the College Board rubric structure precisely. Be concise and use correct CS vocabulary (abstraction, algorithm, sequencing, selection, iteration, artifact, etc.).
For coding problems: write clean, readable pseudocode or Python/JavaScript as appropriate. Add one-line comments for non-obvious logic only.
For short-answer questions: answer directly, no padding.`,

  otro: `Asistente académico general (nivel pre-universitario/universitario).
Adapta el tono y estructura según el tipo de tarea detectado (ensayo, problema, respuesta corta, análisis, etc.).
Para trabajos escritos: párrafos completos, argumento claro, lenguaje académico.
Etiqueta el borrador con [BORRADOR] / [DRAFT] al inicio si es trabajo escrito extenso.`
};

const REGULARES_DEFAULT_SYSTEM = `Eres un asistente académico para un estudiante de nivel pre-universitario y universitario en Panamá. Produce borradores académicos estructurados. Adapta el tono según la materia y el tipo de tarea.`;

function buildSystemPrompt(track, subject, deepMode) {
  if (track === 'judaicas') {
    return JUDAICAS_SYSTEM + (deepMode ? JUDAICAS_DEEP_SUFFIX : '');
  }
  return REGULARES_PROMPTS[subject] || REGULARES_DEFAULT_SYSTEM;
}

async function callClaude({ content, contentType, track, subject, deepMode }) {
  const apiKey = ST.settings.get('apiKey');
  if (!apiKey) throw new Error('Falta la Claude API Key. Configúrala en Ajustes (⚙).');

  const systemPrompt = buildSystemPrompt(track, subject, deepMode);

  // Build message content — support vision for images
  let userContent;
  if (contentType === 'image') {
    userContent = [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: content.mediaType,
          data: content.data
        }
      },
      {
        type: 'text',
        text: 'Esta es una imagen de mi tarea. Extrae el contenido y complétalo según las instrucciones del sistema.'
      }
    ];
  } else {
    userContent = content;
  }

  const body = {
    model: 'claude-sonnet-4-5',
    max_tokens: track === 'judaicas' ? 1500 : 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }]
  };

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    const msg = err?.error?.message || `Error HTTP ${resp.status}`;
    throw new Error(`Claude API: ${msg}`);
  }

  const data = await resp.json();
  return data.content?.[0]?.text || '';
}

window.ST = window.ST || {};
window.ST.api = { callClaude, buildSystemPrompt };
