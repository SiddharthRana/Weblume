import type { Metadata } from 'next';
import { RequireAuth } from '@/components/auth/require-auth';
import { Container } from '@/components/container';
import { AccountView } from './account-view';

export const metadata: Metadata = {
  title: 'Account settings',
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <Container className="max-w-3xl py-12">
      <h1 className="mb-8 text-3xl font-bold text-fg">Account settings</h1>
      <RequireAuth>
        <AccountView />
      </RequireAuth>
    </Container>
  );
}
