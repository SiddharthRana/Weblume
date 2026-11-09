import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal-page';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Delete your account',
  description: 'How to delete your Weblume account and associated data.',
  alternates: { canonical: '/legal/account-deletion' },
};

// Public page required by Google Play's account-deletion policy.
export default function AccountDeletionPage() {
  return (
    <LegalPage title="Delete your Weblume account" updated="9 November 2026">
      <h2>In the app or on the web</h2>
      <ol>
        <li>
          Sign in and open <strong>Account settings</strong>.
        </li>
        <li>
          Choose <strong>Delete account</strong> and confirm.
        </li>
      </ol>
      <h2>By email</h2>
      <p>
        If you can’t sign in, email <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>{' '}
        from the address on your account and ask us to delete it.
      </p>
      <h2>What gets deleted</h2>
      <p>
        Your profile, scans, findings and share links are deleted within 30 days. Payment providers
        (Dodo Payments and Google Play) keep transaction records they are legally required to
        retain. Cancel any active Google Play subscription in Google Play, because deleting your
        account doesn’t cancel it automatically.
      </p>
    </LegalPage>
  );
}
