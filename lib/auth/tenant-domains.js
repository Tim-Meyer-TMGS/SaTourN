const VALID_ROLES = new Set(['USER', 'GROUP_ADMIN', 'SUPER_ADMIN']);

// Security configuration: change only through code review and deployment.
// Empty lists intentionally block user assignment until real domains are known.
export const TENANT_EMAIL_DOMAINS = Object.freeze({
  tmgs: Object.freeze(['sachsen-tour.de']),
  chemnitz: Object.freeze([]),
  'saechsische-schweiz': Object.freeze(['saechsische-schweiz.de']),
  leipzig: Object.freeze(['leipzig.travel', 'ltm-leipzig.de']),
  'chemnitz-zwickau-region': Object.freeze([]),
  dresden: Object.freeze([]),
  oberlausitz: Object.freeze([]),
  erzgebirge: Object.freeze([]),
  vogtland: Object.freeze([])
});

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function isValidApplicationRole(role) {
  return VALID_ROLES.has(String(role || '').trim().toUpperCase());
}

export function emailDomain(email) {
  const normalized = normalizeEmail(email);
  const separator = normalized.lastIndexOf('@');
  if (separator <= 0 || separator === normalized.length - 1) return '';
  const localPart = normalized.slice(0, separator);
  const domain = normalized.slice(separator + 1);
  if (!localPart || /\s/.test(localPart) || /\s/.test(domain) || domain.includes('@')) return '';
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) return '';
  return domain;
}

export function allowedDomainsForTenant(tenantSlug) {
  return TENANT_EMAIL_DOMAINS[String(tenantSlug || '').trim().toLowerCase()] || [];
}

export function isEmailAllowedForTenant(email, tenantSlug) {
  const domain = emailDomain(email);
  return Boolean(domain && allowedDomainsForTenant(tenantSlug).includes(domain));
}
