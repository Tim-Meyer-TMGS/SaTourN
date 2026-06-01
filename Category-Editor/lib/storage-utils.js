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
