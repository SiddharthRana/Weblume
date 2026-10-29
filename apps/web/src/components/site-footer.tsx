import Link from 'next/link';
import { footerNav, site } from '@/lib/site';
import { Container } from './container';
import { Logo } from './logo';

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-fg-muted">{site.tagline}.</p>
        </div>
        {Object.entries(footerNav).map(([heading, links]) => (
          <nav key={heading} aria-label={heading}>
            <h2 className="text-sm font-semibold text-fg">{heading}</h2>
            <ul className="mt-3 space-y-2">
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-fg-muted hover:text-fg hover:underline"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>
      <Container className="border-t border-border py-6 text-sm text-fg-muted">
        © {new Date().getFullYear()} Weblume. Automated audits can’t guarantee accessibility
        compliance, search rankings, security or business results.
      </Container>
    </footer>
  );
}
