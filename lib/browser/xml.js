export function parseXml(text, mime = 'application/xml') {
  const parser = new DOMParser();
  const xml = parser.parseFromString(String(text || ''), mime);
  if (xml.querySelector('parsererror')) {
    throw new Error('Ungültiges XML');
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
