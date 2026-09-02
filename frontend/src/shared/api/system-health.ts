export type SystemHealthResult = {
  ok: boolean;
  attempts: number;
};

const REQUEST_TIMEOUT_MS = 14_000;
const RETRY_DELAY_MS = 1_200;
const MAX_ATTEMPTS = 3;

function wait(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(resolve, milliseconds);
    signal.addEventListener('abort', () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException('Health check aborted', 'AbortError'));
    }, { once: true });
  });
}

async function fetchWithTimeout(url: string, signal: AbortSignal) {
  const timeoutController = new AbortController();
  const timeoutId = window.setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);
  const abort = () => timeoutController.abort();
  signal.addEventListener('abort', abort, { once: true });
  try {
    return await fetch(url, { method: 'GET', signal: timeoutController.signal, cache: 'no-store' });
  } finally {
    window.clearTimeout(timeoutId);
    signal.removeEventListener('abort', abort);
  }
}

export async function checkSystemHealth(url: string, signal: AbortSignal): Promise<SystemHealthResult> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    if (signal.aborted) throw new DOMException('Health check aborted', 'AbortError');
    try {
      const response = await fetchWithTimeout(url, signal);
      if (response.ok) return { ok: true, attempts: attempt };
    } catch (error) {
      if (signal.aborted) throw error;
    }
    if (attempt < MAX_ATTEMPTS) await wait(RETRY_DELAY_MS, signal);
  }
  return { ok: false, attempts: MAX_ATTEMPTS };
}
