const parseJson = (raw, fallback = null) => {
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export function loadJsonFromLocalStorage(key, fallback = null) {
  return parseJson(localStorage.getItem(key), fallback);
}

export function saveJsonToLocalStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getDeepLApiKey(storageKey = 'ceDeepLApiKey') {
  const cached = sessionStorage.getItem(storageKey) || '';
  if (cached) return cached;

  const key = prompt('DeepL API Key für diese Sitzung eingeben:');
  if (key && key.trim()) {
    sessionStorage.setItem(storageKey, key.trim());
    return key.trim();
  }

  return '';
}
