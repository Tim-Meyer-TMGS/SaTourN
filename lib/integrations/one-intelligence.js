const OI_TIMEOUT_MS = 60_000;

function env(name) {
  return String(process.env[name] || '').trim();
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function parseJsonFromModelText(text) {
  const raw = String(text || '').trim();
  const direct = safeJsonParse(raw);
  if (direct) return direct;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenced?.[1] ? safeJsonParse(fenced[1].trim()) : null;
}

function completionText(payload = {}) {
  const content = payload?.choices?.[0]?.message?.content
    ?? payload?.choices?.[0]?.text
    ?? payload?.message?.content
    ?? '';
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((entry) => (
    typeof entry === 'string' ? entry : entry?.text ?? entry?.content ?? ''
  )).join('\n').trim();
}

export function sanitizePlainText(value, maxLength = 4000) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, maxLength);
}

async function callChat({ model, messages, json = true }) {
  const apiKey = env('OI_API_KEY');
  if (!apiKey) throw new Error('Server configuration missing: OI_API_KEY');
  if (!model) throw new Error('Server configuration missing: OI model');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OI_TIMEOUT_MS);
  try {
    const baseUrl = env('OI_API_BASE') || 'https://oi.destination.one/api';
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0,
        ...(json ? { response_format: { type: 'json_object' } } : {})
      })
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`OI upstream error ${response.status}: ${text.slice(0, 300)}`);
    const payload = safeJsonParse(text);
    if (!payload) throw new Error('OI returned invalid JSON');
    return completionText(payload);
  } finally {
    clearTimeout(timeout);
  }
}

function stringList(value, maximum = 12) {
  return Array.from(new Set((Array.isArray(value) ? value : [])
    .map((entry) => sanitizePlainText(entry, 80))
    .filter(Boolean)))
    .slice(0, maximum);
}

export async function createDatabaseSearchPlan(prompt, context) {
  const rawText = await callChat({
    model: env('OI_MODEL_SEARCH'),
    messages: [
      {
        role: 'system',
        content: [
          'Erzeuge einen Suchplan fuer eine lokale touristische PostgreSQL-Datenbank.',
          'Du hast keinen Zugriff auf externe Datensaetze oder Suchwerkzeuge.',
          'Antworte nur als JSON: {"terms":["..."],"types":["POI|Tour|Hotel|Event|Gastro|Package"]}.',
          'terms enthaelt kurze deutsche Suchwoerter, sinnvolle Synonyme und keine Fuellwoerter.'
        ].join(' ')
      },
      { role: 'user', content: JSON.stringify({ prompt, context }) }
    ]
  });
  const parsed = parseJsonFromModelText(rawText) || {};
  const allowedTypes = new Set(['POI', 'Tour', 'Hotel', 'Event', 'Gastro', 'Package']);
  return {
    terms: stringList(parsed.terms),
    types: stringList(parsed.types, 6).filter((type) => allowedTypes.has(type))
  };
}

function parseCopies(value) {
  return String(value || '').split(/[;,]/).map((entry) => entry.trim()).filter(Boolean);
}

export async function createMailDraft({ record, issues, issueContext }) {
  const rawText = await callChat({
    model: env('OI_MODEL_MAIL'),
    messages: [
      {
        role: 'system',
        content: [
          'Erstelle einen kurzen, hoeflichen und sachlichen E-Mail-Entwurf an einen Dateninhaber.',
          'Schreibe auf Deutsch. Erfinde keine Namen. Verwende kein HTML und keine technischen API-Begriffe.',
          'Antworte nur als JSON im Format {"subject":"...","body":"..."}.'
        ].join(' ')
      },
      { role: 'user', content: JSON.stringify({ record, issueContext, issues }) }
    ]
  });
  const parsed = parseJsonFromModelText(rawText) || {};
  const subject = sanitizePlainText(parsed.subject || parsed.betreff || parsed.title, 240);
  const body = sanitizePlainText(parsed.body || parsed.text || parsed.message || rawText, 3500);
  if (!subject && !body) throw new Error('OI response was not usable.');
  return {
    to: sanitizePlainText(record.email, 320),
    cc: parseCopies(env('OI_MAIL_CC')),
    bcc: parseCopies(env('OI_MAIL_BCC')),
    subject: subject || `Hinweis zur Datenpflege: ${sanitizePlainText(record.title || record.type || 'Datensatz', 120)}`,
    body
  };
}
