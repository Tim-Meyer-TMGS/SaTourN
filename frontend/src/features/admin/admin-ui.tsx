import { useState, type ReactNode } from 'react';

export function formatAdminDate(value: string | null) {
  if (!value) return '–';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '–' : new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

export function adminErrorText(error: unknown) {
  return error instanceof Error ? error.message : 'Die Aktion konnte nicht ausgeführt werden.';
}

export function AdminDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="context-dialog admin-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title">
        <header>
          <h2 id="admin-dialog-title">{title}</h2>
          <button className="icon-button" type="button" aria-label="Schließen" onClick={onClose}>
            <span className="material-icons" aria-hidden="true">close</span>
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function TemporaryPasswordDialog({ password, onClose }: { password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copyPassword() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
  }

  return (
    <AdminDialog title="Temporäres Passwort" onClose={onClose}>
      <div className="admin-dialog-body">
        <p>Das Passwort wird nur jetzt angezeigt. Der Nutzer muss es bei der ersten Anmeldung ändern.</p>
        <code className="admin-password-value">{password}</code>
      </div>
      <footer>
        <button type="button" onClick={() => void copyPassword()}>{copied ? 'Kopiert' : 'Passwort kopieren'}</button>
        <button className="primary" type="button" onClick={onClose}>Schließen</button>
      </footer>
    </AdminDialog>
  );
}
