export function buildMailtoUrl(payload) {
  const to = String(payload?.to || '').trim();
  if (!to) return '';

  const params = [];
  if (payload?.subject) {
    params.push(`subject=${encodeURIComponent(String(payload.subject).slice(0, 240))}`);
  }
  if (payload?.body) {
    params.push(`body=${encodeURIComponent(String(payload.body).slice(0, 3500))}`);
  }
  if (Array.isArray(payload?.cc) && payload.cc.length) {
    params.push(`cc=${encodeURIComponent(payload.cc.join(','))}`);
  }
  if (Array.isArray(payload?.bcc) && payload.bcc.length) {
    params.push(`bcc=${encodeURIComponent(payload.bcc.join(','))}`);
  }

  const query = params.join('&');
  return query ? `mailto:${to}?${query}` : `mailto:${to}`;
}

export function launchMailto(mailtoUrl, doc = document) {
  if (!mailtoUrl) return false;
  const link = doc.createElement('a');
  link.href = mailtoUrl;
  link.style.display = 'none';
  doc.body.appendChild(link);
  link.click();
  link.remove();
  return true;
}
