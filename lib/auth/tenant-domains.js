const VALID_ROLES = new Set(['USER', 'GROUP_ADMIN', 'SUPER_ADMIN']);

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function isValidApplicationRole(role) {
  return VALID_ROLES.has(String(role || '').trim().toUpperCase());
}
