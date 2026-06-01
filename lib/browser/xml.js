export function parseXml(text, mime = 'application/xml') {
  const parser = new DOMParser();
  const cleanText = sanitizeXml(String(text || ''));

  // quick truncation check: find root tag and ensure closing tag exists
  const withoutDecl = cleanText.replace(/^\s*<\?xml[\s\S]*?\?>\s*/i, '');
  const m = withoutDecl.match(/^\s*<\s*([^\s/>]+)/);
  if (m) {
    const root = m[1].replace(/^[^:]+:/, ''); // strip namespace prefix if present
    if (!new RegExp(`<\\/${root}>`, 'i').test(cleanText)) {
      const preview = cleanText.slice(0, 300);
      throw new Error(`XML scheint unvollständig/trunkiert zu sein. Beginn: \"${preview}...\"`);
    }
  }

  const xml = parser.parseFromString(cleanText, mime);
  if (xml.querySelector('parsererror')) {
    const preview = cleanText.slice(0, 300);
    const isHtml = /<html|<!DOCTYPE|<body/i.test(preview);
    const hint = isHtml ? ' (Sieht nach Error-HTML aus – API-Key oder Konfiguration überprüfen?)' : '';
    throw new Error(`XML Parse-Fehler. Inhalt: \"${preview}...\"${hint}`);
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
    .replace(/&(?![a-zA-Z]+;|#\d+;|#x[a-fA-F0-9]+;)/g, '&amp;')
    .replace(/[\u201C\u201D]/g, '"') // Smart quotes to regular quotes
    .replace(/[\u2018\u2019]/g, "'") // Smart single quotes to regular quotes
    .replace(/[\u2013\u2014]/g, '-') // En-dash, em-dash to hyphen
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove control characters
}
