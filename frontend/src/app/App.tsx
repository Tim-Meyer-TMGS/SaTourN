import { AppProviders } from './providers/AppProviders';
import { AppRouter } from './router/AppRouter';
import { ChangePasswordPage } from '../features/auth/ChangePasswordPage';
import { LoginPage } from '../features/auth/LoginPage';
import { useAuth } from '../shared/auth/auth-context';

function AuthenticatedApp() {
  const { loading, user } = useAuth();
  if (loading) return <main className="auth-page"><p className="auth-loading">Sitzung wird geprüft …</p></main>;
  if (!user) return <LoginPage />;
  if (user.mustChangePassword) return <ChangePasswordPage />;
  return <AppRouter />;
}

export function App() {
  return (
    <AppProviders>
      <AuthenticatedApp />
    </AppProviders>
  );
}
