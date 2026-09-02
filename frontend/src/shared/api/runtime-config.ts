export type FrontendRuntimeConfig = {
  dataApiBase: string;
  systemApiBase: string;
};

declare global {
  interface Window {
    SATOURN_DATA_API_BASE?: string;
    SATOURN_SYSTEM_API_BASE?: string;
  }
}

export function getRuntimeConfig(): FrontendRuntimeConfig {
  return {
    dataApiBase: window.SATOURN_DATA_API_BASE || '/api/data',
    systemApiBase: window.SATOURN_SYSTEM_API_BASE || '/api/system'
  };
}

export function buildApiActionUrl(apiBase: string, action: string) {
  const separator = apiBase.includes('?') ? '&' : '?';
  return `${apiBase}${separator}action=${encodeURIComponent(action)}`;
}
