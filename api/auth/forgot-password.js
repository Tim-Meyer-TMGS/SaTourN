import { methodNotAllowed, sendJson } from '../_database.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, ['GET']);
  return sendJson(response, 200, {
    message: 'Ein automatischer Passwortversand ist derzeit nicht eingerichtet. Bitte wenden Sie sich an Ihren zuständigen Administrator.'
  });
}
