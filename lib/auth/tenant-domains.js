const VALID_ROLES = new Set(['USER', 'GROUP_ADMIN', 'SUPER_ADMIN']);

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function emailDomain(email) {
  const normalized = normalizeEmail(email);
  const match = normalized.match(/^[^\s@]+@([^\s@]+)$/);
  if (!match || !match[1] || match[1].startsWith('.') || match[1].endsWith('.')) return '';
  return match[1];
}

export function tenantEmailDomains() {
  const source = String(process.env.TENANT_EMAIL_DOMAINS_JSON || '').trim();
  if (!source) throw new Error('TENANT_EMAIL_DOMAINS_JSON is not configured.');

  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error('TENANT_EMAIL_DOMAINS_JSON is invalid JSON.');
  }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('TENANT_EMAIL_DOMAINS_JSON must be an object.');
  }

  const result = new Map();
  for (const [tenantSlug, values] of Object.entries(parsed)) {
    if (!Array.isArray(values)) continue;
    const domains = new Set(values
      .map((value) => String(value || '').trim().toLowerCase().replace(/^@/, ''))
      .filter(Boolean));
    if (domains.size) result.set(String(tenantSlug).trim().toLowerCase(), domains);
  }
  return result;
}

export function isEmailAllowedForTenant(email, tenantSlug) {
  const domain = emailDomain(email);
  const allowedDomains = tenantEmailDomains().get(String(tenantSlug || '').trim().toLowerCase());
  return Boolean(domain && allowedDomains?.has(domain));
}

export function isValidApplicationRole(role) {
  return VALID_ROLES.has(String(role || '').trim().toUpperCase());
}
