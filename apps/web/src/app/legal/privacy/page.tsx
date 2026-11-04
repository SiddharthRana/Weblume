import type { Metadata } from 'next';
import { LegalDraft } from '@/components/legal-draft';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy policy (draft)',
  alternates: { canonical: '/legal/privacy' },
};

export default function PrivacyPage() {
  return (
    <LegalDraft title="Privacy policy" updated="29 October 2026">
      <p>
        This draft describes how Weblume intends to handle personal data. It is written with the
        EU/UK GDPR and India’s Digital Personal Data Protection Act, 2023 (DPDP Act) in mind, and
        must be finalised with legal advice.
      </p>
      <h2>Data we collect</h2>
      <ul>
        <li>
          <strong>Account data:</strong> email address, optional display name, and authentication
          records.
        </li>
        <li>
          <strong>Scan data:</strong> the URLs you submit and the findings we generate. We do not
          store full page HTML.
        </li>
        <li>
          <strong>Billing data:</strong> subscription status and identifiers from our payment
          providers. Card details are handled by the payment provider, not by us.
        </li>
        <li>
          <strong>Technical data:</strong> limited logs (request time, path, status) and a hashed
          form of IP addresses for abuse prevention and guest-scan limits.
        </li>
      </ul>
      <h2>Why we use it</h2>
      <ul>
        <li>To provide scans, reports and your account (performance of a contract).</li>
        <li>To prevent abuse and keep the service secure (legitimate interests).</li>
        <li>To meet legal, tax and accounting obligations.</li>
      </ul>
      <h2>Service providers we use</h2>
      <p>
        Supabase (database and authentication), Google PageSpeed Insights (the URL you submit is
        sent to Google for measurement), our payment providers (a merchant of record for web
        payments and Google Play for Android), an email delivery provider, and optionally an
        error-monitoring provider. A full list will be maintained here.
      </p>
      <h2>Retention</h2>
      <p>
        Guest scans are deleted after 24 hours. Account scans are kept according to your plan (for
        example 30 days on Free and 12 months on Starter) and then deleted automatically. Sites you
        monitor are kept until you stop monitoring them or delete your account, and we email change
        summaries for them to your account address.
      </p>
      <h2>Your rights</h2>
      <p>
        You can access, export and delete your data from your account settings, or by contacting{' '}
        <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>. Depending on where you live
        you may also have rights to correction, restriction, objection and to complain to a data
        protection authority or, in India, the Data Protection Board.
      </p>
      <h2>Contact</h2>
      <p>
        Questions: <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>. [Legal entity
        name, address and grievance officer details to be added.]
      </p>
    </LegalDraft>
  );
}
