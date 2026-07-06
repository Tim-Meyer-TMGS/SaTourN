const IGNORED_UNHANDLED_REJECTION_PATTERNS = [
  'A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received'
];

function stringifyUnknown(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Error) return `${value.message}\n${value.stack || ''}`;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const message = 'message' in value ? String((value as { message?: unknown }).message || '') : '';
    const stack = 'stack' in value ? String((value as { stack?: unknown }).stack || '') : '';
    if (message || stack) return `${message}\n${stack}`;

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function isIgnoredBrowserNoise(value: unknown) {
  const message = stringifyUnknown(value);
  return IGNORED_UNHANDLED_REJECTION_PATTERNS.some((pattern) => message.includes(pattern));
}

function suppressBrowserNoise(event: Event) {
  event.preventDefault();
  event.stopImmediatePropagation();
}

export function installBrowserNoiseFilters() {
  if (typeof window === 'undefined') return;

  window.addEventListener('unhandledrejection', (event) => {
    if (!isIgnoredBrowserNoise(event.reason)) return;
    suppressBrowserNoise(event);
  }, { capture: true });

  window.addEventListener('error', (event) => {
    if (!isIgnoredBrowserNoise(event.error || event.message)) return;
    suppressBrowserNoise(event);
  }, { capture: true });
}
