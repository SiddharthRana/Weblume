import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal-page';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Terms of service',
  description: 'The terms for using Weblume’s website, Android app and paid plans.',
  alternates: { canonical: '/legal/terms' },
};

export default function TermsPage() {
  const email = <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>;
  return (
    <LegalPage title="Terms of service" updated="9 November 2026">
      <p>
        These terms are an agreement between you and {site.owner.name}, an individual based in{' '}
        {site.owner.location}, who runs Weblume (“we”, “us”). They cover our website, our Android
        app and our paid plans (together, “Weblume”). By using Weblume you agree to these terms and
        to our <Link href="/legal/privacy">privacy policy</Link>. If you don’t agree, please don’t
        use Weblume.
      </p>

      <h2>1. What Weblume does</h2>
      <p>
        Weblume checks a publicly available web page for performance, search (SEO), accessibility
        and technical issues, and explains what it finds in plain language. Paid plans add more
        scans, longer report history, monitoring, PDF export and share links, as described on our{' '}
        <Link href="/pricing">pricing page</Link>.
      </p>

      <h2>2. Who can use it</h2>
      <p>
        You must be at least 18 years old and able to enter a binding contract. If you use Weblume
        for a business, you confirm you are allowed to accept these terms on its behalf.
      </p>

      <h2>3. Your account</h2>
      <p>
        Keep your sign-in details safe and tell us at {email} if you think someone else has used
        your account. You are responsible for what happens in your account. Give us accurate
        information, and keep your email address up to date so you get important messages.
      </p>

      <h2>4. Fair and lawful use</h2>
      <p>
        When Weblume scans a page, our crawler (<Link href="/bot">WeblumeBot</Link>) fetches the one
        page you asked for, the way a browser would. It doesn’t log in, submit forms, test for
        vulnerabilities or crawl a whole site. You agree not to:
      </p>
      <ul>
        <li>scan pages you aren’t allowed to access, or try to get past logins or other blocks;</li>
        <li>use Weblume to overload, attack, disrupt or harm any website or system;</li>
        <li>
          get around scan limits, for example by creating many accounts or automating the website or
          app;
        </li>
        <li>
          copy, resell or reverse engineer Weblume, or use it to build a competing product, except
          where the law allows it;
        </li>
        <li>break any law, or anyone else’s rights, while using Weblume.</li>
      </ul>
      <p>
        You are responsible for the addresses you submit and for how you use the reports. Each plan
        has a scan limit, and we may slow down or limit use that harms the service for others.
      </p>

      <h2>5. Plans, payments and renewal</h2>
      <ul>
        <li>
          The Free plan costs nothing. Paid plans are billed in advance, monthly or yearly. The
          price and any taxes are shown before you pay.
        </li>
        <li>
          <strong>Paid plans renew automatically</strong> at the end of each period until you
          cancel. You can cancel at any time, and you keep your plan until the end of the period you
          paid for.
        </li>
        <li>
          On the website, payments are handled by <strong>Dodo Payments</strong>, our merchant of
          record. They are the seller on your invoice, collect any taxes, and their terms also apply
          to your purchase. You manage or cancel from Weblume’s Account settings.
        </li>
        <li>
          In the Android app, payments are handled by <strong>Google Play</strong> under Google’s
          terms. You manage or cancel in Google Play’s subscriptions page.
        </li>
        <li>
          If we change the price of a plan, we will tell you at least 30 days before your next
          renewal. The new price applies from that renewal, and you can cancel before it if you
          don’t want to continue.
        </li>
        <li>
          If a payment fails, the provider may retry it. If it still fails, your account moves to
          the Free plan.
        </li>
      </ul>

      <h2>6. Refunds</h2>
      <p>
        See our <Link href="/legal/refunds">refund policy</Link>. Nothing in these terms takes away
        refund rights you have under consumer law.
      </p>

      <h2>7. About the reports</h2>
      <p>
        Reports are produced automatically from what is publicly visible on the page at the moment
        of the scan, and from Google PageSpeed Insights measurements. Results can change between
        scans and may miss issues or flag something that isn’t a real problem. A report is not a
        certificate of accessibility compliance, a security audit, legal advice or a promise of
        search ranking or business results. Please use your own judgement, or a qualified expert,
        before relying on it for important decisions.
      </p>

      <h2>8. Your content and ours</h2>
      <p>
        The addresses you submit and your reports belong to you. You give us permission to process
        them only to run and improve Weblume, as described in our privacy policy. If you share a
        report link, anyone with the link can see that report until you turn it off or it expires.
      </p>
      <p>
        Weblume itself, including its software, design, text, logo and name, belongs to us. You may
        use and share your reports, but you may not copy Weblume or present it as your own.
      </p>

      <h2>9. Changes and availability</h2>
      <p>
        We work to keep Weblume available and accurate, but we can’t promise it will always be
        available, error-free or unchanged. We may add, change or remove features. If we remove a
        feature you paid for in a way that matters, we will give you notice and, where fair, a
        pro-rata refund.
      </p>

      <h2>10. Ending your use</h2>
      <p>
        You can stop using Weblume and{' '}
        <Link href="/legal/account-deletion">delete your account</Link> at any time. We may suspend
        or close an account that seriously or repeatedly breaks these terms, or where the law
        requires it. Where reasonable, we will warn you first and give you a chance to download your
        data. If we close your account without you being at fault, we will refund the unused part of
        your paid period.
      </p>

      <h2>11. Disclaimer</h2>
      <p>
        Apart from what these terms expressly say, Weblume is provided “as is” and “as available”.
        To the extent the law allows, we don’t give any other promises, such as that Weblume is fit
        for a particular purpose. Some laws don’t allow these exclusions, so they may not all apply
        to you.
      </p>

      <h2>12. Limit on our liability</h2>
      <p>
        To the extent the law allows, we are not liable for indirect or consequential losses, such
        as lost profits, revenue, data or business opportunities. Our total liability to you for any
        claim about Weblume is limited to the amount you paid us in the 12 months before the claim,
        or ₹1,000 if that is more. Nothing in these terms limits liability that cannot be limited by
        law, such as for fraud.
      </p>

      <h2>13. Your responsibility to us</h2>
      <p>
        If someone makes a claim against us because you misused Weblume or broke these terms, you
        agree to cover our reasonable costs of dealing with it.
      </p>

      <h2>14. Law and disputes</h2>
      <p>
        These terms are governed by the laws of India. Please contact us first, so we can try to
        solve any problem informally. If we can’t, the courts in {site.owner.courts} have
        jurisdiction. If you are a consumer, you also keep any right you have to bring a claim in
        the courts or consumer forums where you live.
      </p>

      <h2>15. Changes to these terms</h2>
      <p>
        We may update these terms from time to time. We will change the date at the top and, for
        significant changes, tell you by email or in the app at least 15 days before they take
        effect. If you keep using Weblume after that, the new terms apply. If you don’t agree, you
        can cancel and delete your account.
      </p>

      <h2>16. Other legal points</h2>
      <p>
        If part of these terms can’t be enforced, the rest still applies. If we don’t enforce a
        right straight away, we can still do so later. You may not transfer these terms to someone
        else without our agreement. These terms, together with the privacy and refund policies, are
        the whole agreement between you and us about Weblume.
      </p>

      <h2>17. Contact and grievances</h2>
      <p>
        Questions or complaints: {site.owner.name}, {site.owner.location}. Email: {email}. We will
        acknowledge complaints within 48 hours and aim to resolve them within 30 days.
      </p>
    </LegalPage>
  );
}
