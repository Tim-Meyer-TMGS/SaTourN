export const DATA_API_PATH = '/api/data';
export const SYSTEM_API_PATH = '/api/system';

export function buildApiActionUrl(apiPath: string, action: string) {
  const separator = apiPath.includes('?') ? '&' : '?';
  return `${apiPath}${separator}action=${encodeURIComponent(action)}`;
}
