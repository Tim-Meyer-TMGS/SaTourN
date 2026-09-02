import { FormEvent, useState } from 'react';

import { useAuth } from '../../shared/auth/auth-context';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [forgotten, setForgotten] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Anmeldung nicht möglich.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <header className="auth-brand">
          <span className="auth-brand-mark" aria-hidden="true" />
          <div>
            <strong>SaTourN</strong>
            <span>Datenqualitäts-Monitor</span>
          </div>
        </header>

        <div>
          <h1 id="login-title">Anmelden</h1>
          <p>Mit E-Mail-Adresse und Passwort fortfahren.</p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label>
            E-Mail-Adresse
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Passwort
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p className="auth-error" role="alert">{error}</p> : null}
          <button className="auth-primary" type="submit" disabled={submitting}>
            {submitting ? 'Anmeldung läuft …' : 'Anmelden'}
          </button>
        </form>

        <button className="auth-link-button" type="button" onClick={() => setForgotten((value) => !value)}>
          Passwort vergessen?
        </button>
        {forgotten ? (
          <p className="auth-note">
            Ein automatischer Passwortversand ist derzeit nicht eingerichtet. Bitte wenden Sie sich an Ihren zuständigen Administrator.
          </p>
        ) : null}
      </section>
    </main>
  );
}
