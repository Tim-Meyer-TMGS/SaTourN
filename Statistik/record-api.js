export async function runAiRecordSearch({
  apiBase,
  fetchJson,
  prompt,
  context
}) {
  return fetchJson(apiBase, {
    method: 'POST',
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
