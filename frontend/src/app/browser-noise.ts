const IGNORED_UNHANDLED_REJECTION_PATTERNS = [
  'A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received'
];

function getReasonMessage(reason: unknown) {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === 'string') return reason;
  if (reason && typeof reason === 'object' && 'message' in reason) {
    return String((reason as { message?: unknown }).message || '');
  }
  return '';
}

export function installBrowserNoiseFilters() {
  if (typeof window === 'undefined') return;

  window.addEventListener('unhandledrejection', (event) => {
    const message = getReasonMessage(event.reason);
    if (!IGNORED_UNHANDLED_REJECTION_PATTERNS.some((pattern) => message.includes(pattern))) return;
    event.preventDefault();
  });
}
