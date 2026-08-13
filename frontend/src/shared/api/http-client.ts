export type JsonRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
};

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_PARALLEL_REQUESTS = 4;

type QueuedRequest = {
  run: () => void;
};

const requestQueue: QueuedRequest[] = [];
const inFlightRequests = new Map<string, Promise<unknown>>();
let activeRequestCount = 0;

function runNextQueuedRequest() {
  while (activeRequestCount < MAX_PARALLEL_REQUESTS && requestQueue.length) {
    const request = requestQueue.shift();
    if (!request) return;
    activeRequestCount += 1;
    request.run();
  }
}

function scheduleRequest<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    requestQueue.push({
      run: () => {
        Promise.resolve()
          .then(task)
          .then(resolve, reject)
          .finally(() => {
            activeRequestCount = Math.max(0, activeRequestCount - 1);
            runNextQueuedRequest();
          });
      }
    });

    runNextQueuedRequest();
  });
}

function buildHeaderKey(headers: Record<string, string>) {
  return Object.keys(headers)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => `${key.toLowerCase()}:${headers[key]}`)
    .join('|');
}

function buildRequestKey(url: string, options: Required<Pick<JsonRequestOptions, 'method' | 'headers'>> & Pick<JsonRequestOptions, 'body'>) {
  return [
    options.method,
    url,
    buildHeaderKey(options.headers),
    options.body || ''
  ].join('\n');
}

function createTimeoutSignal(timeoutMs: number, externalSignal?: AbortSignal) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => window.clearTimeout(timer)
  };
}

function buildHttpError(status: number, body: string) {
  return new Error(`HTTP ${status}: ${body}`);
}

function parseJsonResponse<T>(text: string): T {
  return JSON.parse(text) as T;
}

async function executeJsonRequest<T>(url: string, options: JsonRequestOptions): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal
  } = options;

  const { signal: requestSignal, cleanup } = createTimeoutSignal(timeoutMs, signal);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: requestSignal
    });

    const text = await response.text();
    if (!response.ok) {
      throw buildHttpError(response.status, text);
    }

    return parseJsonResponse<T>(text);
  } finally {
    cleanup();
  }
}

export async function fetchJson<T>(url: string, options: JsonRequestOptions = {}): Promise<T> {
  const method = options.method || 'GET';
  const headers = options.headers || {};
  const requestKey = buildRequestKey(url, { method, headers, body: options.body });

  // Dedupe only requests that are not tied to a caller-owned AbortSignal.
  // Otherwise one cancelled caller could abort the shared network request.
  if (!options.signal && inFlightRequests.has(requestKey)) {
    return inFlightRequests.get(requestKey) as Promise<T>;
  }

  const request = scheduleRequest(() => executeJsonRequest<T>(url, {
    ...options,
    method,
    headers
  }));

  if (!options.signal) {
    inFlightRequests.set(requestKey, request);
    request.then(
      () => inFlightRequests.delete(requestKey),
      () => inFlightRequests.delete(requestKey)
    );
  }

  return request;
}
