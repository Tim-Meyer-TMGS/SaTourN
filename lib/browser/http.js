const DEFAULT_TIMEOUT = 30000;
const REQUEST_OPTION_KEYS = new Set([
  'method', 'headers', 'body', 'timeout', 'signal', 'cache', 'credentials',
  'integrity', 'keepalive', 'mode', 'redirect', 'referrer', 'referrerPolicy'
]);

function isAbortSignal(value) {
  return value && typeof value === 'object' && typeof value.aborted === 'boolean' && typeof value.addEventListener === 'function';
}

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
  if (isAbortSignal(options)) {
    options = { signal: options };
  }

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

function withQueryParams(url, params) {
  const query = buildParams(params);
  if (!query) return url;
  const joiner = String(url).includes('?') ? '&' : '?';
  return `${url}${joiner}${query}`;
}

function splitJsonArgs(options = {}, externalSignal) {
  if (isAbortSignal(options)) {
    return { urlParams: null, requestOptions: { signal: options } };
  }

  const rawOptions = options && typeof options === 'object' ? options : {};
  const hasRequestOptions = Object.keys(rawOptions).some((key) => REQUEST_OPTION_KEYS.has(key));
  const urlParams = rawOptions.params || (!hasRequestOptions ? rawOptions : null);
  const requestOptions = hasRequestOptions ? { ...rawOptions } : {};
  delete requestOptions.params;

  if (externalSignal && !requestOptions.signal) {
    requestOptions.signal = externalSignal;
  }

  return { urlParams, requestOptions };
}

export async function fetchJson(url, options = {}, externalSignal) {
  const { urlParams, requestOptions } = splitJsonArgs(options, externalSignal);
  const result = await fetchText(withQueryParams(url, urlParams), requestOptions);
  if (!result.ok) {
    throw new Error(`HTTP ${result.status}: ${result.text}`);
  }
  return JSON.parse(result.text.trim());
}
