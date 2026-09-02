import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!databaseUrl) throw new Error('DATABASE_URL is required.');

const sql = neon(databaseUrl);
const [summary] = await sql.query(`
  SELECT
    (SELECT COUNT(*)::integer FROM app_tenant) AS tenants,
    (SELECT COUNT(*)::integer FROM app_tenant WHERE is_root AND access_all_areas AND active) AS root_tenants,
    (SELECT COUNT(*)::integer FROM app_user_profile) AS users,
    (SELECT COUNT(*)::integer FROM app_user_profile WHERE role = 'SUPER_ADMIN' AND active) AS super_admins,
    (SELECT COUNT(*)::integer FROM app_user_profile WHERE auth_user_id IS NOT NULL) AS linked_auth_users,
    (SELECT COUNT(*)::integer FROM neon_auth.account WHERE "providerId" = 'credential' AND password IS NOT NULL AND LENGTH(password) > 40) AS hashed_password_accounts,
    (SELECT COUNT(*)::integer FROM neon_auth.session WHERE "expiresAt" > NOW()) AS active_sessions,
    (SELECT COUNT(*)::integer FROM app_audit_log) AS audit_events
`);

if (summary.root_tenants < 1) throw new Error('No active root tenant is configured.');
if (summary.super_admins < 1) throw new Error('No active super admin exists.');
if (summary.linked_auth_users < summary.users) throw new Error('At least one SaTourN profile is not linked to Neon Auth.');
if (summary.hashed_password_accounts < summary.users) throw new Error('At least one Neon Auth user has no stored password hash.');

console.log(JSON.stringify({ authentication: 'verified', ...summary }, null, 2));
