export type ServerWarmupResult = {
  ok: boolean;
  attempts: number;
};

const WARMUP_TIMEOUT_MS = 14000;
const WARMUP_RETRY_DELAY_MS = 1200;
const MAX_WARMUP_ATTEMPTS = 3;

function wait(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(resolve, milliseconds);

    signal.addEventListener('abort', () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException('Warmup aborted', 'AbortError'));
    }, { once: true });
  });
}

async function fetchWithTimeout(url: string, signal: AbortSignal) {
  const timeoutController = new AbortController();
  const timeoutId = window.setTimeout(() => timeoutController.abort(), WARMUP_TIMEOUT_MS);

  function abortTimeoutRequest() {
    timeoutController.abort();
  }

  signal.addEventListener('abort', abortTimeoutRequest, { once: true });

  try {
    return await fetch(url, {
      method: 'GET',
      signal: timeoutController.signal,
      cache: 'no-store'
    });
  } finally {
    window.clearTimeout(timeoutId);
    signal.removeEventListener('abort', abortTimeoutRequest);
  }
}

export async function wakeRenderServer(url: string, signal: AbortSignal): Promise<ServerWarmupResult> {
  for (let attempt = 1; attempt <= MAX_WARMUP_ATTEMPTS; attempt += 1) {
    if (signal.aborted) throw new DOMException('Warmup aborted', 'AbortError');

    try {
      const response = await fetchWithTimeout(url, signal);
      if (response.ok) return { ok: true, attempts: attempt };
    } catch (error) {
      if (signal.aborted) throw error;
    }

    if (attempt < MAX_WARMUP_ATTEMPTS) {
      await wait(WARMUP_RETRY_DELAY_MS, signal);
    }
  }

  return { ok: false, attempts: MAX_WARMUP_ATTEMPTS };
}
