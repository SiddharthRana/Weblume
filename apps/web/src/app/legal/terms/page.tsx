import type { Metadata } from 'next';
import { LegalDraft } from '@/components/legal-draft';

export const metadata: Metadata = {
  title: 'Terms of service (draft)',
  alternates: { canonical: '/legal/terms' },
};

export default function TermsPage() {
  return (
    <LegalDraft title="Terms of service" updated="29 October 2026">
      <h2>Using Weblume</h2>
      <p>
        Weblume provides automated audits of publicly accessible web pages. You may only scan
        websites you own or are authorised to evaluate, and you must not use Weblume to overload,
        attack or harm any website.
      </p>
      <h2>No guarantees</h2>
      <p>
        Reports are generated automatically and may be incomplete or inaccurate. They are not a
        guarantee of accessibility compliance, search ranking, security or business results, and are
        not professional legal, accessibility or security advice.
      </p>
      <h2>Subscriptions</h2>
      <p>
        Paid plans renew automatically until cancelled. Web purchases are processed by our merchant
        of record, whose terms also apply. Android purchases are processed and managed by Google
        Play.
      </p>
      <h2>Fair use and limits</h2>
      <p>
        Each plan includes a scan quota. We may limit or suspend accounts that abuse the service.
      </p>
      <h2>Liability</h2>
      <p>
        [Limitation of liability, governing law and dispute resolution to be drafted by a lawyer.]
      </p>
    </LegalDraft>
  );
}
