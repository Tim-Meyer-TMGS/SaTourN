export function sanitizeXML(str) {
  return String(str || '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

export function isValidSchemaorg(val) {
  if (!val) return true;
  if (/^https?:\/\/./.test(val)) return true;
  return String(val)
    .split(',')
    .every((token) => /^[A-Za-z][A-Za-z0-9]*$/.test(token.trim()));
}

export function formatXml(xml) {
  const INDENT = '  ';
  let pad = 0;
  return String(xml || '')
    .replace(/>\s*</g, '>' + '\n' + '<')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('</')) pad = Math.max(0, pad - 1);
      const result = INDENT.repeat(pad) + trimmed;
      if (
        trimmed.startsWith('<') &&
        !trimmed.startsWith('</') &&
        !trimmed.startsWith('<?') &&
        !trimmed.endsWith('/>') &&
        !trimmed.includes('</')
      ) {
        pad += 1;
      }
      return result;
    })
    .join('\n');
}
