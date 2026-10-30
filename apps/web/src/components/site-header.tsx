import Link from 'next/link';
import { mainNav } from '@/lib/site';
import { Container } from './container';
import { Logo } from './logo';
import { MobileNav } from './mobile-nav';
import { AuthNav } from './auth-nav';

export function SiteHeader() {
  return (
    <header className="relative border-b border-border bg-surface">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="Weblume home" className="rounded-md">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-fg-muted hover:bg-surface-muted hover:text-fg"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <AuthNav />
          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
