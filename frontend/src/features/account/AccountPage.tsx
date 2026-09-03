import { useState, type FormEvent } from 'react';

import { useAuth } from '../../shared/auth/auth-context';

const ROLE_LABELS = {
  USER: 'Nutzer',
  GROUP_ADMIN: 'Gruppen-Admin',
  SUPER_ADMIN: 'Super-Admin'
} as const;

function formatDate(value: string | null) {
  if (!value) return 'Noch nicht erfasst';
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function AccountPage() {
  const { user, changePassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (newPassword !== confirmation) return setError('Die neuen Passwörter stimmen nicht überein.');
    if (newPassword.length < 12) return setError('Das neue Passwort muss mindestens 12 Zeichen lang sein.');
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
      setMessage('Passwort geändert. Andere Sitzungen wurden beendet.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Das Passwort konnte nicht geändert werden.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  return (
    <section className="content-panel account-page">
      <header className="panel-header"><div><h1>Mein Konto</h1><p>Persönliche Angaben und Passwort</p></div><span className="status-chip">Aktiv</span></header>
      <div className="account-grid">
        <section className="panel-card account-profile-card">
          <h2>Profil</h2>
          <dl>
            <div><dt>Name</dt><dd>{user.name}</dd></div>
            <div><dt>E-Mail</dt><dd>{user.email}</dd></div>
            <div><dt>Nutzergruppe</dt><dd>{user.tenant.name}</dd></div>
            <div><dt>Rolle</dt><dd>{ROLE_LABELS[user.role]}</dd></div>
            <div><dt>Passwort zuletzt geändert</dt><dd>{formatDate(user.passwordChangedAt)}</dd></div>
          </dl>
          <button type="button" className="plain-button" onClick={() => void logout()}>Abmelden</button>
        </section>
        <section className="panel-card account-password-card">
          <h2>Passwort ändern</h2>
          <form className="admin-form-grid" onSubmit={submit}>
            <label className="admin-form-full">Aktuelles Passwort<input type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
            <label>Neues Passwort<input type="password" autoComplete="new-password" minLength={12} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
            <label>Neues Passwort wiederholen<input type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
            {error ? <p className="tool-message tool-message-error admin-form-full" role="alert">{error}</p> : null}
            {message ? <p className="tool-message admin-form-full" role="status">{message}</p> : null}
            <div className="tool-actions admin-form-full"><button className="tool-primary-button" type="submit" disabled={submitting}>{submitting ? 'Wird gespeichert …' : 'Passwort speichern'}</button></div>
          </form>
        </section>
      </div>
    </section>
  );
}
