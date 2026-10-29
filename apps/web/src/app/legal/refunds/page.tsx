import type { Metadata } from 'next';
import { LegalDraft } from '@/components/legal-draft';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Refund policy (draft)',
  alternates: { canonical: '/legal/refunds' },
};

export default function RefundsPage() {
  return (
    <LegalDraft title="Refund policy" updated="29 October 2026">
      <p>
        You can cancel at any time; your plan stays active until the end of the period you paid for.
        [Refund window and conditions to be decided and reviewed.]
      </p>
      <h2>Web purchases</h2>
      <p>
        Refund requests for web purchases can be sent to{' '}
        <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>. Refunds are issued through
        our merchant of record.
      </p>
      <h2>Google Play purchases</h2>
      <p>
        Purchases made in the Android app are subject to Google Play’s refund policies and are
        requested through Google Play.
      </p>
    </LegalDraft>
  );
}
