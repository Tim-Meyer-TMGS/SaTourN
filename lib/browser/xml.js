export function parseXml(text, mime = 'application/xml') {
  const parser = new DOMParser();
  const cleanText = sanitizeXml(String(text || ''));
  const xml = parser.parseFromString(cleanText, mime);
  if (xml.querySelector('parsererror')) {
    const preview = cleanText.slice(0, 300);
    const isHtml = /<html|<!DOCTYPE|<body/i.test(preview);
    const hint = isHtml ? ' (Sieht nach Error-HTML aus – API-Key oder Konfiguration überprüfen?)' : '';
    throw new Error(`XML Parse-Fehler. Inhalt: "${preview}..."${hint}`);
  }
  return xml;
}

export function serializeXml(node) {
  return new XMLSerializer().serializeToString(node);
}

export function sanitizeXml(text) {
  return String(text || '')
    .replace(/<texts[\s\S]*?<\/texts>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&(?![a-zA-Z]+;|#\d+;|#x[a-fA-F0-9]+;)/g, '&amp;');
}
