import type { PropsWithChildren } from 'react';

import { AuthProvider } from '../../shared/auth/auth-context';

export function AppProviders({ children }: PropsWithChildren) {
  return <AuthProvider>{children}</AuthProvider>;
}
