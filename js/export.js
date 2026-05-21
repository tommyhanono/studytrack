/* ── Export functions ─────────────────────────── */

window.ST = window.ST || {};

window.ST.export = {

  copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    // Fallback for non-HTTPS
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return Promise.resolve();
  },

  downloadTxt(text, filename = 'respuesta.txt') {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    this._download(blob, filename);
  },

  async downloadDocx(text, filename = 'respuesta.docx') {
    if (!window.docx) {
      // Fallback: download as .txt if docx library not loaded
      this.downloadTxt(text, filename.replace('.docx', '.txt'));
      ST.app.toast('docx.js no cargó — descargado como .txt');
      return;
    }

    const { Document, Paragraph, TextRun, HeadingLevel, Packer } = window.docx;

    // Split text into paragraphs
    const lines = text.split('\n');
    const children = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        children.push(new Paragraph({ text: '' }));
        continue;
      }

      // Detect markdown-style headings
      if (trimmed.startsWith('### ')) {
        children.push(new Paragraph({ text: trimmed.slice(4), heading: HeadingLevel.HEADING_3 }));
      } else if (trimmed.startsWith('## ')) {
        children.push(new Paragraph({ text: trimmed.slice(3), heading: HeadingLevel.HEADING_2 }));
      } else if (trimmed.startsWith('# ')) {
        children.push(new Paragraph({ text: trimmed.slice(2), heading: HeadingLevel.HEADING_1 }));
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        children.push(new Paragraph({
          bullet: { level: 0 },
          children: [new TextRun(trimmed.replace(/^[-•]\s+/, ''))]
        }));
      } else {
        // Bold/italic markdown handling (simple)
        const runs = this._parseInlineMarkdown(trimmed);
        children.push(new Paragraph({ children: runs }));
      }
    }

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    this._download(blob, filename);
  },

  _parseInlineMarkdown(text) {
    const { TextRun } = window.docx;
    const runs = [];
    // Simple bold (**text**) and italic (*text*) parser
    const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
    let last = 0;
    let m;
    while ((m = regex.exec(text)) !== null) {
      if (m.index > last) runs.push(new TextRun(text.slice(last, m.index)));
      if (m[1]) runs.push(new TextRun({ text: m[1], bold: true }));
      else if (m[2]) runs.push(new TextRun({ text: m[2], italics: true }));
      last = regex.lastIndex;
    }
    if (last < text.length) runs.push(new TextRun(text.slice(last)));
    return runs.length ? runs : [new TextRun(text)];
  },

  _download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

};
