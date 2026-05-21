/* ── File parsers ─────────────────────────────── */

window.ST = window.ST || {};

window.ST.parsers = {

  async parse(file) {
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'pdf') return this.parsePDF(file);
    if (ext === 'docx' || ext === 'doc') return this.parseDocx(file);
    if (['jpg','jpeg','png','webp','gif','bmp'].includes(ext)) return this.parseImage(file);

    throw new Error(`Formato no compatible: .${ext}. Usa PDF, Word, JPG o PNG.`);
  },

  async parsePDF(file) {
    if (!window.pdfjsLib) throw new Error('pdf.js no cargó. Verifica tu conexión.');

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      pages.push(pageText);
    }

    const text = pages.join('\n\n').trim();
    if (!text) throw new Error('El PDF no tiene texto extraíble. Intenta subir una imagen si es un scan.');
    return { type: 'text', content: text };
  },

  async parseDocx(file) {
    if (!window.mammoth) throw new Error('mammoth.js no cargó. Verifica tu conexión.');

    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value.trim();
    if (!text) throw new Error('El archivo Word no tiene texto legible.');
    return { type: 'text', content: text };
  },

  async parseImage(file) {
    // Convert to base64 and send to Claude Vision — much better than Tesseract for Hebrew/handwriting
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        // dataUrl = "data:image/jpeg;base64,XXXX..."
        const [header, data] = dataUrl.split(',');
        const mediaType = header.match(/:(.*?);/)[1];
        resolve({ type: 'image', content: { mediaType, data } });
      };
      reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      reader.readAsDataURL(file);
    });
  }

};
