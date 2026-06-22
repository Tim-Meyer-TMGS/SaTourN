const OI_SEARCH_TIMEOUT_MS = 60_000;
const RECORD_RESOLVE_TIMEOUT_MS = 45_000;
const OI_MAIL_TIMEOUT_MS = 45_000;

export async function runAiRecordSearch({
  apiBase,
  fetchJson,
  prompt,
  context
}) {
  return fetchJson(apiBase, {
    method: 'POST',
    timeout: OI_SEARCH_TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      context: {
        area: context?.area || '',
        city: context?.city || '',
        type: context?.type || ''
      }
    })
  });
}

export async function resolveRecordsByIds({
  apiBase,
  fetchJson,
  ids,
  type
}) {
  return fetchJson(apiBase, {
    method: 'POST',
    timeout: RECORD_RESOLVE_TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ids,
      type: type || ''
    })
  });
}

export async function requestRecordMailDraft({
  apiBase,
  fetchJson,
  payload
}) {
  return fetchJson(apiBase, {
    method: 'POST',
    timeout: OI_MAIL_TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
