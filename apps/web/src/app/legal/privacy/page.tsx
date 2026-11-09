import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal-page';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'What personal data Weblume collects, why, who it is shared with and your rights.',
  alternates: { canonical: '/legal/privacy' },
};

export default function PrivacyPage() {
  const email = <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>;
  return (
    <LegalPage title="Privacy policy" updated="9 November 2026">
      <p>
        This policy explains what personal data Weblume collects when you use our website (
        {site.url.replace(/^https?:\/\//, '')}) and our Android app, why we collect it, who we share
        it with, how long we keep it and the choices you have. We have written it to meet India’s
        Digital Personal Data Protection Act, 2023 (DPDP Act) and the EU and UK General Data
        Protection Regulation (GDPR).
      </p>

      <h2>Who we are</h2>
      <p>
        Weblume is run by {site.owner.name}, an individual based in {site.owner.location} (“we”,
        “us”). We decide how and why your personal data is used, which makes us the “data fiduciary”
        under the DPDP Act and the “controller” under the GDPR. You can reach us at {email}.
      </p>

      <h2>What we collect</h2>
      <h3>When you create an account</h3>
      <ul>
        <li>Your email address and, if you sign up with a password, a secure hash of it.</li>
        <li>
          If you sign in with Google: your email address, name and profile picture as shared by
          Google. We never see your Google password.
        </li>
        <li>A display name, if you choose to add one.</li>
      </ul>
      <h3>When you scan a website</h3>
      <ul>
        <li>The web address you submit, the address it ended up at, and the date of the scan.</li>
        <li>
          The report we produce: scores and findings, with small pieces of evidence such as the
          address of a broken link or the attribute that is missing. We do not store full copies of
          the pages we scan.
        </li>
        <li>Sites you choose to monitor, how often, and which change emails you want.</li>
      </ul>
      <h3>When you pay for a plan</h3>
      <ul>
        <li>
          Your plan, its status, renewal dates and the reference numbers our payment providers give
          us. Card and bank details are entered on the payment provider’s own checkout and never
          reach us.
        </li>
      </ul>
      <h3>Technical data</h3>
      <ul>
        <li>
          For scans without an account, a scrambled (hashed) form of your IP address, used to apply
          the one-free-scan-a-day limit and to stop abuse. We do not store your actual IP address.
        </li>
        <li>
          Short-lived server logs (time, page requested, result) used to keep the service running.
        </li>
        <li>
          Error reports when something breaks: the error, the page or screen it happened on, and
          your browser or device type. These are cleaned of names, emails, IP addresses and other
          details that could identify you before they are sent.
        </li>
        <li>
          Simple page-view statistics on our website (page, referring site, browser, country),
          collected by Cloudflare Web Analytics without cookies and without tracking you across
          visits.
        </li>
      </ul>
      <p>
        We do not use advertising, we do not sell your data, and we do not track you across other
        websites or apps.
      </p>

      <h2>Why we use it</h2>
      <ul>
        <li>
          <strong>To provide Weblume:</strong> create your account, run scans, show and keep your
          reports, re-scan sites you monitor and email you what changed. (GDPR: performance of our
          contract with you. DPDP Act: your consent and the purpose you gave the data for.)
        </li>
        <li>
          <strong>To take payments and give you your plan.</strong> (Contract, and legal obligations
          for tax and accounting.)
        </li>
        <li>
          <strong>To keep Weblume safe and working:</strong> stop abuse and fraud, enforce fair-use
          limits and fix errors. (Legitimate interests; DPDP Act: legitimate uses.)
        </li>
        <li>
          <strong>To send you service emails</strong> such as sign-up confirmation, password resets
          and monitoring updates you turned on. We don’t send marketing emails.
        </li>
        <li>
          <strong>To meet legal obligations</strong> and respond to lawful requests from
          authorities.
        </li>
      </ul>

      <h2>Who we share it with</h2>
      <p>
        We use the service providers below to run Weblume. They may only use your data to provide
        their service to us.
      </p>
      <ul>
        <li>
          <strong>Supabase:</strong> our database and sign-in system. Stores your account and
          reports.
        </li>
        <li>
          <strong>Fly.io:</strong> runs our servers (in Singapore).
        </li>
        <li>
          <strong>Cloudflare:</strong> hosts our website, runs the bot check on free scans
          (Turnstile) and collects cookieless page-view statistics.
        </li>
        <li>
          <strong>Google PageSpeed Insights:</strong> receives the web address you scan, to measure
          its speed. It does not receive any details about you.
        </li>
        <li>
          <strong>Google:</strong> for “Continue with Google” sign-in, and Google Play for purchases
          in the Android app.
        </li>
        <li>
          <strong>Dodo Payments:</strong> our merchant of record for purchases on the website. They
          process your payment, handle taxes and invoices, and keep their own records under their
          privacy policy.
        </li>
        <li>
          <strong>Resend:</strong> sends our emails, such as monitoring updates.
        </li>
        <li>
          <strong>Sentry:</strong> receives the cleaned error reports described above.
        </li>
      </ul>
      <p>
        If you create a share link for a report, anyone with that link can see that report (the web
        address, scores and findings). It does not show your name, email or other reports. You can
        turn a link off at any time.
      </p>
      <p>
        We may also share data if the law requires it, to protect people’s safety or our rights, or
        with a buyer if Weblume is ever sold (in which case this policy will continue to apply).
      </p>

      <h2>Where your data is stored</h2>
      <p>
        Our providers store and process data on servers outside India, including in Singapore, the
        European Union and the United States. Where the GDPR applies, we rely on safeguards such as
        the European Commission’s standard contractual clauses. We only transfer data to countries
        the Government of India has not restricted under the DPDP Act.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Scans made without an account: deleted after 24 hours.</li>
        <li>Reports on the Free plan: deleted after 30 days.</li>
        <li>Reports on the Starter plan: deleted after 12 months.</li>
        <li>Monitored sites: until you stop monitoring them or delete your account.</li>
        <li>Your account and plan details: until you delete your account.</li>
        <li>Payment event records: details are removed after 30 days.</li>
        <li>
          Payment providers keep transaction records for as long as tax and accounting laws require.
        </li>
      </ul>

      <h2>Your rights</h2>
      <p>You can:</p>
      <ul>
        <li>
          <strong>See and download your data:</strong> Account settings → Download my data.
        </li>
        <li>
          <strong>Correct it:</strong> change your name in Account settings, or ask us to correct
          anything else.
        </li>
        <li>
          <strong>Delete it:</strong> delete reports one by one, or delete your whole account in
          Account settings. See{' '}
          <Link href="/legal/account-deletion">how account deletion works</Link>.
        </li>
        <li>
          <strong>Withdraw consent</strong> at any time, by stopping use of Weblume and deleting
          your account. This doesn’t affect anything we did before you withdrew it.
        </li>
        <li>
          <strong>Nominate someone</strong> to exercise your rights if you die or become unable to
          (DPDP Act).
        </li>
        <li>
          <strong>Object to or restrict</strong> some uses of your data, and move your data to
          another service (GDPR).
        </li>
      </ul>
      <p>
        To use any of these rights, email {email} from the address on your account. We will reply
        within 30 days. If you are not satisfied with our answer, you can complain to the Data
        Protection Board of India, or to the data protection authority where you live if you are in
        the EU or UK.
      </p>

      <h2>Children</h2>
      <p>
        Weblume is for people aged 18 or over. We do not knowingly collect data from children. If
        you believe a child has created an account, email {email} and we will delete it.
      </p>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit (HTTPS) and at rest by our providers. Access to our systems is
        limited and protected. In the Android app, your sign-in is stored encrypted on your device
        and left out of device backups. No system is perfectly secure, but if a breach affects your
        data we will tell you and the authorities as the law requires.
      </p>

      <h2>Cookies and storage on your device</h2>
      <p>
        We don’t use advertising or tracking cookies. Our website stores a few things in your
        browser so it works: your sign-in, your light or dark theme, and a list of your recent free
        scans so you can find them again. Cloudflare’s bot check may set a cookie that is strictly
        needed to tell people from bots. Because these are all essential, we don’t show a cookie
        banner.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If we change this policy, we will update the date at the top. If a change is significant, we
        will also tell you by email or in the app before it takes effect.
      </p>

      <h2>Contact and grievance officer</h2>
      <p>For questions, requests or complaints about your data, contact our grievance officer:</p>
      <p>
        {site.owner.name}
        <br />
        {site.owner.location}
        <br />
        Email: {email}
      </p>
      <p>We will acknowledge complaints within 48 hours and resolve them within 30 days.</p>
    </LegalPage>
  );
}
