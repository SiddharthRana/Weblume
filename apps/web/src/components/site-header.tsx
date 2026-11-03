import Link from 'next/link';
import { mainNav } from '@/lib/site';
import { Container } from './container';
import { Logo } from './logo';
import { MobileNav } from './mobile-nav';
import { AuthNav } from './auth-nav';
import { ThemeToggle } from './theme-toggle';

export function SiteHeader() {
  return (
    <header className="header-glass sticky top-0 z-40 border-b border-border/70">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="Weblume home" className="flex items-center rounded-md">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-0.5 xl:gap-1">
            {/* The "Scan a website" button covers /scan on wide screens. */}
            {mainNav.slice(1).map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium text-fg-muted transition-colors hover:text-fg xl:px-3"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-1 lg:gap-2">
          <AuthNav />
          <ThemeToggle />
          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
