import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal-page';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Refund and cancellation policy',
  description: 'How to cancel a Weblume plan and when you can get a refund.',
  alternates: { canonical: '/legal/refunds' },
};

export default function RefundsPage() {
  const email = <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>;
  return (
    <LegalPage title="Refund and cancellation policy" updated="9 November 2026">
      <h2>Cancelling</h2>
      <p>
        You can cancel a paid plan at any time. Your plan stays active until the end of the period
        you have already paid for, then your account moves to the Free plan. Your reports stay
        available within the Free plan’s limits. We don’t charge cancellation fees.
      </p>
      <ul>
        <li>
          <strong>Bought on the website:</strong> Account settings → Manage subscription.
        </li>
        <li>
          <strong>Bought in the Android app:</strong> Google Play → Payments &amp; subscriptions →
          Subscriptions → Weblume.
        </li>
      </ul>

      <h2>Refunds for website purchases</h2>
      <ul>
        <li>
          <strong>First payment:</strong> if Weblume isn’t right for you, ask within 7 days of your
          first payment for a plan and we will refund it in full. No questions asked.
        </li>
        <li>
          <strong>Renewals:</strong> renewal payments (monthly or yearly) are not refunded, but you
          can cancel at any time to stop the next one.
        </li>
        <li>
          <strong>Our mistakes:</strong> if you were charged twice, charged after cancelling, or a
          paid feature didn’t work because of a problem on our side, we will refund the affected
          amount whenever it happened.
        </li>
      </ul>
      <p>
        To ask for a refund, email {email} from the address on your account, with the date of the
        payment. Website payments are processed by Dodo Payments, our merchant of record, who sends
        the refund to your original payment method. Refunds usually arrive within 5 to 10 working
        days, depending on your bank.
      </p>

      <h2>Refunds for Google Play purchases</h2>
      <p>
        Purchases in the Android app are made through Google Play, so Google Play’s refund policy
        applies. Within 48 hours of buying you can usually request a refund directly in Google Play.
        After that, email {email} and we will help, applying the same rules as website purchases
        where Google Play lets us.
      </p>

      <h2>Your legal rights</h2>
      <p>
        This policy doesn’t take away any rights you have under consumer protection law. See also
        our <Link href="/legal/terms">terms of service</Link>.
      </p>
    </LegalPage>
  );
}
