export class TTLCache {
  #ttlMs;
  #store;

  constructor(ttlMs) {
    this.#ttlMs = ttlMs;
    this.#store = new Map();
  }

  get(key) {
    const entry = this.#store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.#store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value) {
    this.#store.set(key, {
      expires: Date.now() + this.#ttlMs,
      value
    });
  }

  clear() {
    this.#store.clear();
  }
}
