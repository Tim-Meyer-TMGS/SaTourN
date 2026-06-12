import fetch from 'node-fetch';

import {
  OI_API_BASE,
  OI_API_KEY,
  OI_MAIL_BCC,
  OI_MAIL_CC,
  OI_MODEL_MAIL,
  OI_MODEL_SEARCH
} from '../lib/oi-config.js';

const OI_TIMEOUT_MS = 30000;
const MAX_AI_SEARCH_RESULTS = 50;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const OI_SEARCH_TOOL_IDS = Object.freeze(['server:meta-open-data-sachsen-tourismus']);

const rateLimitStore = new Map();

function applyRateLimit(req, res) {
  const key = `${req.ip || 'unknown'}:${req.path}`;
  const now = Date.now();
  const current = rateLimitStore.get(key);
  if (!current || current.expiresAt <= now) {
    rateLimitStore.set(key, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    res.status(429).json({ error: 'Zu viele KI-Anfragen. Bitte versuche es gleich erneut.' });
    return false;
  }
  current.count += 1;
  return true;
}

function requireOiConfig(res, model, modelEnvName) {
  if (!OI_API_KEY) {
    res.status(503).json({ error: 'Server configuration missing: OI_API_KEY' });
    return false;
  }
  if (!model) {
    res.status(503).json({ error: `Server configuration missing: ${modelEnvName || 'OI model'}` });
    return false;
  }
  return true;
}

function parseMailCopies(value) {
  return String(value || '')
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeChatContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((entry) => {
        if (typeof entry === 'string') return entry;
        if (typeof entry?.text === 'string') return entry.text;
        if (typeof entry?.content === 'string') return entry.content;
        return '';
      })
      .join('\n')
      .trim();
  }
  return '';
}

function extractCompletionText(payload = {}) {
  return normalizeChatContent(
    payload?.choices?.[0]?.message?.content
      ?? payload?.choices?.[0]?.text
      ?? payload?.message?.content
      ?? ''
  );
}

function sanitizePlainText(value, maxLength = 4000) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, maxLength);
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
  if (fenced?.[1]) return safeJsonParse(fenced[1].trim());
  return null;
}

function collectDeepValues(value, bucket = []) {
  if (value == null) return bucket;
  if (Array.isArray(value)) {
    value.forEach((entry) => collectDeepValues(entry, bucket));
    return bucket;
  }
  if (typeof value === 'object') {
    Object.values(value).forEach((entry) => collectDeepValues(entry, bucket));
    return bucket;
  }
  bucket.push(value);
  return bucket;
}

async function callOiChat({ model, messages, extraBody = {}, useJsonResponseFormat = true }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OI_TIMEOUT_MS);

  try {
    const response = await fetch(`${OI_API_BASE}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${OI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0,
        ...(useJsonResponseFormat ? { response_format: { type: 'json_object' } } : {}),
        ...extraBody
      })
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`OI upstream error ${response.status}: ${text.slice(0, 500)}`);
    }
    const payload = safeJsonParse(text);
    if (!payload) throw new Error('OI returned invalid JSON');
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchOiModels() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OI_TIMEOUT_MS);

  try {
    const response = await fetch(`${OI_API_BASE}/models`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${OI_API_KEY}`,
        Accept: 'application/json'
      }
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`OI models error ${response.status}: ${text.slice(0, 500)}`);
    }
    const payload = safeJsonParse(text);
    if (!payload) throw new Error('OI models returned invalid JSON');
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchOiTools() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OI_TIMEOUT_MS);

  try {
    const response = await fetch(`${OI_API_BASE}/v1/tools/`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${OI_API_KEY}`,
        Accept: 'application/json'
      }
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`OI tools error ${response.status}: ${text.slice(0, 500)}`);
    }
    const payload = safeJsonParse(text);
    if (!payload) throw new Error('OI tools returned invalid JSON');
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function buildMailMessages({ record, issues, issueContext }) {
  return [
    {
      role: 'system',
      content: [
        'Erstelle einen kurzen, höflichen und sachlichen E-Mail-Entwurf an einen Dateninhaber.',
        'Schreibe auf Deutsch.',
        'Keine Begrüßung mit unbekannten Namen erfinden.',
        'Keine HTML-Ausgabe.',
        'Keine technischen API- oder Systembegriffe.',
        'Gib ausschließlich JSON im Format {"subject":"...","body":"..."} zurück.'
      ].join(' ')
    },
    {
      role: 'user',
      content: JSON.stringify({
        record,
        issueContext,
        issues
      })
    }
  ];
}

function buildSearchMessages({ prompt, context, requireToolUsage = false }) {
  return [
    {
      role: 'system',
      content: [
        'Du analysierst touristische Suchanfragen für einen Datenqualitätsmonitor.',
        requireToolUsage
          ? 'Nutze vor deiner Antwort die verfügbaren Tools zur Recherche. Wenn kein Tool genutzt werden kann, gib {"ids":[],"reason":"tool_not_used"} zurück.'
          : 'Nutze verfügbare Tools, wenn sie für die Recherche notwendig sind.',
        'Antworte ausschließlich als JSON im Format {"ids":["..."]}.',
        'Verwende nur plausible destination.one Datensatz-IDs als reine Zeichenketten ohne Präfix.',
        'Keine Erklärung, keine Markdown-Ausgabe, keine weiteren Felder.'
      ].join(' ')
    },
    {
      role: 'user',
      content: JSON.stringify({
        prompt,
        context,
        maxResults: MAX_AI_SEARCH_RESULTS
      })
    }
  ];
}

function normalizeSearchIds(value) {
  const list = Array.isArray(value?.ids)
    ? value.ids
    : Array.isArray(value?.globalIds)
      ? value.globalIds
      : Array.isArray(value?.global_ids)
        ? value.global_ids
        : Array.isArray(value?.data?.ids)
          ? value.data.ids
          : Array.isArray(value?.result?.ids)
            ? value.result.ids
            : [];

  return Array.from(new Set(
    list
      .map((entry) => String(entry || '').trim())
      .filter((entry) => /^\d+$/.test(entry) || /^[A-Za-z]+_\d+$/.test(entry))
  )).slice(0, MAX_AI_SEARCH_RESULTS);
}

function extractSearchIdsFromRawText(text) {
  const normalized = String(text || '');
  const directJson = parseJsonFromModelText(normalized);
  const fromJson = directJson ? normalizeSearchIds(directJson) : [];
  if (fromJson.length) return fromJson;

  const digitMatches = normalized.match(/\b\d{5,}\b/g) || [];
  return Array.from(new Set(digitMatches)).slice(0, MAX_AI_SEARCH_RESULTS);
}

function extractMailDraft(parsed, rawText) {
  const subject = sanitizePlainText(
    parsed?.subject || parsed?.betreff || parsed?.title || '',
    240
  );
  const body = sanitizePlainText(
    parsed?.body || parsed?.text || parsed?.message || rawText || '',
    3500
  );
  return {
    subject,
    body
  };
}

function summarizeToolCalls(payload = {}) {
  const toolCalls = Array.isArray(payload?.choices?.[0]?.message?.tool_calls)
    ? payload.choices[0].message.tool_calls
    : [];

  return toolCalls.map((entry) => ({
    id: sanitizePlainText(entry?.id || '', 120),
    type: sanitizePlainText(entry?.type || '', 40),
    name: sanitizePlainText(entry?.function?.name || entry?.name || '', 120)
  }));
}

function buildSearchDebugInfo({ rawText, parsed, ids, payload, requestedToolIds = [], defaultToolsEnabled = false }) {
  if (ids.length) return undefined;
  return {
    requestedToolIds,
    defaultToolsEnabled,
    finishReason: sanitizePlainText(payload?.choices?.[0]?.finish_reason || '', 80),
    messageKeys: payload?.choices?.[0]?.message && typeof payload.choices[0].message === 'object'
      ? Object.keys(payload.choices[0].message)
      : [],
    toolCalls: summarizeToolCalls(payload),
    rawPreview: sanitizePlainText(rawText, 800),
    parsedKeys: parsed && typeof parsed === 'object' ? Object.keys(parsed).slice(0, 20) : [],
    parsedPreview: parsed && typeof parsed === 'object'
      ? sanitizePlainText(JSON.stringify(parsed), 800)
      : ''
  };
}

async function executeSearchRequest({
  prompt,
  context,
  useDefaultTools = false,
  requireToolUsage = false
}) {
  const payload = await callOiChat({
    model: OI_MODEL_SEARCH,
    messages: buildSearchMessages({ prompt, context, requireToolUsage }),
    useJsonResponseFormat: false,
    extraBody: useDefaultTools
      ? {
          tool_ids_enable_default: true
        }
      : {
          tool_ids: OI_SEARCH_TOOL_IDS,
          tool_ids_enable_default: false
        }
  });
  const rawText = extractCompletionText(payload);
  const parsed = parseJsonFromModelText(rawText);
  const ids = parsed && typeof parsed === 'object'
    ? normalizeSearchIds(parsed)
    : extractSearchIdsFromRawText(rawText);
  const debug = buildSearchDebugInfo({
    rawText,
    parsed,
    ids,
    payload,
    requestedToolIds: useDefaultTools ? [] : OI_SEARCH_TOOL_IDS,
    defaultToolsEnabled: useDefaultTools
  });

  return {
    ids,
    debug
  };
}

export function registerOiRoutes(app) {
  app.get('/api/oi/status', async (req, res) => {
    if (!OI_API_KEY) {
      return res.status(503).json({
        ok: false,
        configured: {
          apiKey: false,
          mailModel: Boolean(OI_MODEL_MAIL),
          searchModel: Boolean(OI_MODEL_SEARCH)
        },
        error: 'Server configuration missing: OI_API_KEY'
      });
    }

    try {
      const payload = await fetchOiModels();
      const models = Array.isArray(payload?.data)
        ? payload.data.map((entry) => ({
            id: entry?.id || '',
            name: entry?.name || entry?.id || ''
          }))
        : [];

      return res.json({
        ok: true,
        configured: {
          apiKey: true,
          mailModel: OI_MODEL_MAIL || '',
          searchModel: OI_MODEL_SEARCH || ''
        },
        availableModels: models
      });
    } catch (error) {
      console.error('OI status failed:', error.message || error);
      return res.status(502).json({
        ok: false,
        configured: {
          apiKey: true,
          mailModel: OI_MODEL_MAIL || '',
          searchModel: OI_MODEL_SEARCH || ''
        },
        error: error.message || 'OI status failed'
      });
    }
  });

  app.get('/api/oi/tools', async (req, res) => {
    if (!OI_API_KEY) {
      return res.status(503).json({
        ok: false,
        error: 'Server configuration missing: OI_API_KEY'
      });
    }

    try {
      const payload = await fetchOiTools();
      return res.json(payload);
    } catch (error) {
      console.error('OI tools failed:', error.message || error);
      return res.status(502).json({
        ok: false,
        error: error.message || 'OI tools failed'
      });
    }
  });

  app.post('/api/oi/mail-draft', async (req, res) => {
    if (!applyRateLimit(req, res)) return;
    if (!requireOiConfig(res, OI_MODEL_MAIL, 'OI_MODEL_MAIL')) return;

    const record = req.body?.record || {};
    const issues = Array.isArray(req.body?.issues) ? req.body.issues : [];
    const issueContext = req.body?.issueContext || {};
    const to = sanitizePlainText(record.email, 320);

    if (!to) {
      return res.status(400).json({ error: 'Datensatz hat keine E-Mail-Adresse.' });
    }
    if (!issues.length) {
      return res.status(400).json({ error: 'Keine Pflegeprobleme fuer Mail-Entwurf uebergeben.' });
    }

    try {
      const payload = await callOiChat({
        model: OI_MODEL_MAIL,
        messages: buildMailMessages({ record, issues, issueContext })
      });
      const rawText = extractCompletionText(payload);
      const parsed = parseJsonFromModelText(rawText);
      const draft = extractMailDraft(parsed || {}, rawText);
      if (!draft.subject && !draft.body) {
        return res.status(502).json({ error: 'OI-Antwort fuer Mail-Entwurf war nicht nutzbar.' });
      }

      return res.json({
        to,
        cc: parseMailCopies(OI_MAIL_CC),
        bcc: parseMailCopies(OI_MAIL_BCC),
        subject: draft.subject || `Hinweis zur Datenpflege: ${sanitizePlainText(record.title || record.type || 'Datensatz', 120)}`,
        body: draft.body
      });
    } catch (error) {
      console.error('OI mail draft failed:', error.message || error);
      return res.status(502).json({ error: `Mail-Entwurf konnte nicht erzeugt werden. ${error.message || ''}`.trim() });
    }
  });

  app.post('/api/oi/search-records', async (req, res) => {
    if (!applyRateLimit(req, res)) return;
    if (!requireOiConfig(res, OI_MODEL_SEARCH, 'OI_MODEL_SEARCH')) return;

    const prompt = sanitizePlainText(req.body?.prompt, 800);
    const context = req.body?.context || {};

    if (!prompt) {
      return res.status(400).json({ error: 'Suchtext fehlt.' });
    }

    try {
      const { ids, debug } = await executeSearchRequest({
        prompt,
        context,
        useDefaultTools: false,
        requireToolUsage: false
      });
      return res.json({
        prompt,
        ids,
        limit: MAX_AI_SEARCH_RESULTS,
        truncated: ids.length >= MAX_AI_SEARCH_RESULTS,
        ...(debug ? { debug } : {})
      });
    } catch (error) {
      console.error('OI search failed:', error.message || error);
      return res.status(502).json({ error: `KI-Suche konnte nicht ausgeführt werden. ${error.message || ''}`.trim() });
    }
  });

  app.post('/api/oi/search-records-default-tools', async (req, res) => {
    if (!applyRateLimit(req, res)) return;
    if (!requireOiConfig(res, OI_MODEL_SEARCH, 'OI_MODEL_SEARCH')) return;

    const prompt = sanitizePlainText(req.body?.prompt, 800);
    const context = req.body?.context || {};

    if (!prompt) {
      return res.status(400).json({ error: 'Suchtext fehlt.' });
    }

    try {
      const { ids, debug } = await executeSearchRequest({
        prompt,
        context,
        useDefaultTools: true,
        requireToolUsage: true
      });
      return res.json({
        prompt,
        ids,
        limit: MAX_AI_SEARCH_RESULTS,
        truncated: ids.length >= MAX_AI_SEARCH_RESULTS,
        ...(debug ? { debug } : {})
      });
    } catch (error) {
      console.error('OI default-tool search failed:', error.message || error);
      return res.status(502).json({ error: `KI-Suche mit Modell-Standardwerkzeugen konnte nicht ausgeführt werden. ${error.message || ''}`.trim() });
    }
  });
}
