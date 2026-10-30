import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

type Variant = 'primary' | 'secondary';

const styles: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
};

export function ButtonLink({
  href,
  children,
  variant = 'primary',
  className = '',
}: {
  href: ComponentProps<typeof Link>['href'];
  children: ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold ${styles[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}
