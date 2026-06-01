export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function rateLimit(minIntervalMs, state) {
  const now = performance.now();
  const elapsed = now - (state.lastStart || 0);
  const wait = Math.max(0, minIntervalMs - elapsed);
  if (wait > 0) await sleep(wait);
  state.lastStart = performance.now();
}
