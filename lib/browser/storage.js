export function loadJson(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadText(key, fallback = '') {
  const value = localStorage.getItem(key);
  return value === null || value === undefined ? fallback : value;
}

export function saveText(key, value) {
  localStorage.setItem(key, String(value));
}

export function removeItem(key) {
  localStorage.removeItem(key);
}
