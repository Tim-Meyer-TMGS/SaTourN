import { buildApiActionUrl, SYSTEM_API_PATH } from '../../shared/api/api-paths';

export type AdminRole = 'USER' | 'GROUP_ADMIN' | 'SUPER_ADMIN';

export type AdminUser = {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
  must_change_password: boolean;
  last_login_at: string | null;
  password_changed_at: string | null;
  created_at: string;
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  active_sessions: number;
};

export type AdminTenant = {
  id: string;
  name: string;
  slug: string;
  parent_tenant_id: string | null;
  parent_name: string | null;
  is_root: boolean;
  access_all_areas: boolean;
  active: boolean;
  theme: string;
  user_count: number;
  area_ids: string[];
};

export type AdminArea = {
  id: string;
  external_id: string;
  name: string;
  slug: string;
  active: boolean;
};

export type AdminAuditEntry = {
  id: number;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  actor_email: string | null;
  actor_name: string | null;
};

export type AdminQualityCriterion = {
  id: string;
  label: string;
  recommendation: string;
  active: boolean;
  severity: string;
  types: string[];
  method: string;
};

export type AdminSyncState = {
  record_type: string;
  status: string;
  last_attempt_at: string | null;
  last_success_at: string | null;
  imported_count: number;
  error_message: string | null;
};

export type AdminOverview = {
  metrics: {
    active_users: number;
    inactive_users: number;
    active_tenants: number;
    active_sessions: number;
  };
  sync: {
    last_import_at: string | null;
    all_imports_successful: boolean | null;
    failed_imports: number;
  };
  recentAudit: AdminAuditEntry[];
};

export type AdminStatus = {
  database: { ok: boolean; latencyMs: number };
  authentication: {
    active_users: number;
    inactive_users: number;
    active_sessions: number;
  };
  imports: AdminSyncState[];
};

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
  query?: Record<string, string | number>;
  signal?: AbortSignal;
};

async function request<T>(action: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(
    buildApiActionUrl(SYSTEM_API_PATH, action),
    window.location.origin
  );
  Object.entries(options.query || {}).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const response = await fetch(url.toString(), {
    method: options.method || 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    signal: options.signal,
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (!response.ok) {
    let message = 'Die Anfrage konnte nicht ausgeführt werden.';
    try {
      const payload = await response.json() as { message?: string; error?: string };
      message = payload.message || payload.error || message;
    } catch {
      // Keep the local fallback for non-JSON responses.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export const adminApi = {
  overview: (signal?: AbortSignal) => request<AdminOverview>('admin-overview', { signal }),
  users: (signal?: AbortSignal) => request<{ users: AdminUser[] }>('admin-users', { signal }),
  createUser: (body: { name: string; email: string; tenantId: string; role: AdminRole }) =>
    request<{ user: { id: string; name: string; email: string; role: AdminRole; tenantId: string }; temporaryPassword: string; mustChangePassword: boolean }>('admin-users', { method: 'POST', body }),
  updateUser: (body: Record<string, unknown>) =>
    request<{ ok: boolean; sessionsRevoked: boolean }>('admin-user-update', { method: 'POST', body }),
  resetPassword: (userId: string) =>
    request<{ temporaryPassword: string; mustChangePassword: boolean }>('admin-user-reset-password', { method: 'POST', body: { userId } }),
  revokeSessions: (userId: string) =>
    request<{ revokedSessions: number }>('admin-user-revoke-sessions', { method: 'POST', body: { userId } }),
  tenants: (signal?: AbortSignal) =>
    request<{ tenants: AdminTenant[]; areas: AdminArea[] }>('admin-tenants', { signal }),
  createTenant: (body: { name: string; slug: string; parentTenantId: string; theme: string }) =>
    request<{ tenant: { id: string; name: string; slug: string }; domainConfigured: boolean }>('admin-tenants', { method: 'POST', body }),
  updateTenant: (body: Record<string, unknown>) =>
    request<{ ok: boolean; sessionsRevoked: boolean }>('admin-tenant-update', { method: 'POST', body }),
  updateTenantAreas: (tenantId: string, areaIds: string[]) =>
    request<{ ok: boolean; areaIds: string[] }>('admin-tenant-areas', { method: 'POST', body: { tenantId, areaIds } }),
  quality: (signal?: AbortSignal) =>
    request<{ criteria: AdminQualityCriterion[] }>('admin-quality', { signal }),
  audit: (signal?: AbortSignal) =>
    request<{ entries: AdminAuditEntry[]; count: number }>('admin-audit', { query: { limit: 100 }, signal }),
  status: (signal?: AbortSignal) => request<AdminStatus>('admin-status', { signal })
};
