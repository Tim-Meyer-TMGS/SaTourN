import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';

function encryptionKeys() {
  const secrets = [process.env.TENANT_INTEGRATION_SECRET, process.env.DATABASE_URL]
    .map((value) => String(value || '').trim())
    .filter((value, index, values) => value.length >= 32 && values.indexOf(value) === index);
  if (!secrets.length) throw new Error('Tenant integration encryption configuration missing.');
  return secrets.map((secret) => createHash('sha256').update(secret).digest());
}

export function encryptIntegrationSecret(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKeys()[0], iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptIntegrationSecret(value) {
  const [version, iv, tag, encrypted] = String(value || '').split('.');
  if (version !== 'v1' || !iv || !tag || !encrypted) throw new Error('Invalid encrypted integration secret.');
  for (const key of encryptionKeys()) {
    try {
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
      decipher.setAuthTag(Buffer.from(tag, 'base64url'));
      return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8');
    } catch {
      // Preserve access to values written with the fallback before a dedicated key was configured.
    }
  }
  throw new Error('Invalid encrypted integration secret.');
}

export function maskSecret(value) {
  const text = String(value || '');
  return text ? `••••••••${text.slice(-4)}` : '';
}

export async function tenantIntegration(sql, tenantId, provider = 'outdooractive') {
  const [row] = await sql.query(`SELECT id, tenant_id, provider, project_key, api_key_encrypted, active, last_tested_at, last_test_succeeded, updated_at FROM tenant_integrations WHERE tenant_id = $1 AND provider = $2`, [tenantId, provider]);
  return row || null;
}

export async function saveTenantIntegration(sql, { tenantId, provider = 'outdooractive', projectKey, apiKey, active, actorId }) {
  const current = await tenantIntegration(sql, tenantId, provider);
  const encrypted = apiKey ? encryptIntegrationSecret(apiKey) : current?.api_key_encrypted;
  if (!encrypted) throw new Error('API key missing.');
  const id = current?.id || `integration_${randomUUID().replaceAll('-', '')}`;
  await sql.query(`INSERT INTO tenant_integrations (id, tenant_id, provider, project_key, api_key_encrypted, active, updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (tenant_id, provider) DO UPDATE SET project_key=EXCLUDED.project_key, api_key_encrypted=EXCLUDED.api_key_encrypted, active=EXCLUDED.active, updated_at=NOW(), updated_by=EXCLUDED.updated_by`, [id, tenantId, provider, projectKey, encrypted, active, actorId]);
  return tenantIntegration(sql, tenantId, provider);
}
