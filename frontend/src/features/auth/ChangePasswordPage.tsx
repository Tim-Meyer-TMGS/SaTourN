import { FormEvent, useState } from 'react';

import { useAuth } from '../../shared/auth/auth-context';

export function ChangePasswordPage() {
  const { changePassword, logout, user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (newPassword !== confirmation) {
      setError('Die neuen Passwörter stimmen nicht überein.');
      return;
    }
    if (newPassword.length < 12) {
      setError('Das neue Passwort muss mindestens 12 Zeichen lang sein.');
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Das Passwort konnte nicht geändert werden.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="change-password-title">
        <header className="auth-brand">
          <span className="auth-brand-mark" aria-hidden="true" />
          <div>
            <strong>SaTourN</strong>
            <span>{user?.tenant.name}</span>
          </div>
        </header>
        <div>
          <h1 id="change-password-title">Passwort ändern</h1>
          <p>Vor dem ersten Zugriff muss das temporäre Passwort ersetzt werden.</p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <label>
            Aktuelles Passwort
            <input type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          </label>
          <label>
            Neues Passwort
            <input type="password" autoComplete="new-password" minLength={12} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
          </label>
          <label>
            Neues Passwort wiederholen
            <input type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
          </label>
          {error ? <p className="auth-error" role="alert">{error}</p> : null}
          <button className="auth-primary" type="submit" disabled={submitting}>
            {submitting ? 'Passwort wird geändert …' : 'Passwort speichern'}
          </button>
        </form>
        <button className="auth-link-button" type="button" onClick={() => void logout()}>Abmelden</button>
      </section>
    </main>
  );
}
