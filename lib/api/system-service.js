import { authenticatedIdentity, sendAuthAccessError } from './auth.js';
import { AdminRequestError, adminOperations } from './admin-service.js';
import { getDatabaseClient, methodNotAllowed, parseBody, sendJson } from './http.js';
import { buildRecordSearchQuery } from './record-query.js';
import { createDatabaseSearchPlan, createMailDraft, sanitizePlainText } from '../integrations/one-intelligence.js';

async function health(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, ['GET']);
  try {
    const sql = getDatabaseClient();
    await sql`SELECT 1`;
    return sendJson(response, 200, { ok: true, database: true });
  } catch (error) {
    console.error('Database health check failed.', error);
    return sendJson(response, 503, { ok: false, database: false });
  }
}

function fallbackSearchTerms(prompt) {
  const stopWords = new Set(['aber', 'alle', 'auch', 'eine', 'einen', 'einer', 'finden', 'fuer', 'haben', 'oder', 'sind', 'suche', 'und', 'von', 'was', 'wie', 'mit']);
  return Array.from(new Set(String(prompt || '').toLowerCase()
    .replace(/[^\p{L}\p{N}-]+/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !stopWords.has(word))))
    .slice(0, 8);
}

async function aiSearch(request, response, identity) {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);
  const body = parseBody(request.body);
  const prompt = sanitizePlainText(body.prompt, 800);
  if (!prompt) return sendJson(response, 400, { error: 'Suchtext fehlt.' });
  const context = body.context || {};
  const plan = await createDatabaseSearchPlan(prompt, context);
  const terms = plan.terms.length ? plan.terms : fallbackSearchTerms(prompt);
  const selectedType = String(context.type || '').trim();
  const filter = buildRecordSearchQuery({
    area: context.area || '',
    city: context.city || '',
    type: selectedType || ''
  }, identity);
  const conditions = [filter.whereSql];
  const parameters = [...filter.parameters];

  if (!selectedType && plan.types.length) {
    parameters.push(plan.types);
    conditions.push(`record_type = ANY($${parameters.length}::text[])`);
  }
  if (plan.categories.length) {
    const categoryClauses = plan.categories.map((category) => {
      parameters.push(`%${category}%`);
      return `catalog.name ILIKE $${parameters.length}`;
    });
    conditions.push(`EXISTS (
      SELECT 1 FROM record_categories AS relation
      JOIN categories AS catalog ON catalog.id = relation.category_id
      WHERE relation.experience = et4_records.experience
        AND relation.record_global_id = et4_records.global_id
        AND (${categoryClauses.join(' OR ')})
    )`);
  }
  if (terms.length) {
    const clauses = terms.map((term) => {
      parameters.push(`%${term}%`);
      const placeholder = `$${parameters.length}`;
      return `(title ILIKE ${placeholder} OR city ILIKE ${placeholder} OR categories::text ILIKE ${placeholder} OR payload->'keywords'::text ILIKE ${placeholder})`;
    });
    conditions.push(`(${clauses.join(' OR ')})`);
  }

  parameters.push(50);
  const sql = getDatabaseClient();
  const rows = await sql.query(
    `SELECT global_id
     FROM et4_records
     WHERE ${conditions.join(' AND ')}
     ORDER BY quality_score ASC NULLS FIRST, changed_at DESC NULLS LAST
     LIMIT $${parameters.length}`,
    parameters
  );
  return sendJson(response, 200, {
    prompt,
    ids: rows.map((row) => row.global_id),
    limit: 50,
    truncated: rows.length === 50
  });
}

async function mailDraft(request, response) {
  if (request.method !== 'POST') return methodNotAllowed(response, ['POST']);
  const body = parseBody(request.body);
  const record = body.record || {};
  const issues = Array.isArray(body.issues) ? body.issues : [];
  if (!sanitizePlainText(record.email, 320)) {
    return sendJson(response, 400, { error: 'Datensatz hat keine E-Mail-Adresse.' });
  }
  if (!issues.length) return sendJson(response, 400, { error: 'Keine Pflegeprobleme übergeben.' });
  return sendJson(response, 200, await createMailDraft({
    record,
    issues,
    issueContext: body.issueContext || {}
  }));
}

const protectedOperations = new Map([
  ...adminOperations,
  ['ai-search', aiSearch],
  ['mail-draft', mailDraft]
]);

export async function handleSystemRequest(request, response) {
  const action = String(Array.isArray(request.query?.action) ? request.query.action[0] : request.query?.action || '').trim();
  if (action === 'health') return health(request, response);
  const operation = protectedOperations.get(action);
  if (!operation) return sendJson(response, 400, { error: 'Unsupported system action' });

  try {
    const identity = await authenticatedIdentity(request);
    return await operation(request, response, identity);
  } catch (error) {
    if (sendAuthAccessError(response, error)) return;
    if (error instanceof AdminRequestError) {
      return sendJson(response, error.status, { error: error.code, message: error.message });
    }
    console.error(`System action ${action} failed.`, error);
    const status = /configuration missing/.test(String(error?.message)) ? 503 : /OI upstream|OI response/.test(String(error?.message)) ? 502 : 500;
    return sendJson(response, status, { error: 'System request failed' });
  }
}
