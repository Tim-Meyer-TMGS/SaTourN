import { getDatabaseClient, methodNotAllowed, sendJson } from './_database.js';

export default async function handler(request, response) {
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

