const DEFAULT_TIMEOUT = 30000;

function createAbortController(timeout, externalSignal) {
  const controller = new AbortController();
  const timer = timeout > 0 ? setTimeout(() => controller.abort(), timeout) : null;

  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      if (timer) clearTimeout(timer);
    },
  };
}

export function buildParams(params = {}) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === '') continue;
    searchParams.set(key, String(value));
  }
  return searchParams.toString();
}

export async function fetchText(url, options = {}) {
  const { method = 'GET', headers = {}, body, timeout = DEFAULT_TIMEOUT, signal } = options;
  const { signal: abortSignal, cleanup } = createAbortController(timeout, signal);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: abortSignal,
    });

    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      text,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      contentType: '',
      text: String(error?.message || error),
    };
  } finally {
    cleanup();
  }
}

export async function fetchJson(url, options = {}) {
  const result = await fetchText(url, options);
  if (!result.ok) {
    throw new Error(`HTTP ${result.status}: ${result.text}`);
  }
  return JSON.parse(result.text);
}
