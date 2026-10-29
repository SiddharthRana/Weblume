import type { ReactNode } from 'react';
import { Container } from './container';

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-border bg-surface py-14 sm:py-20">
      <Container>
        {eyebrow && (
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
        )}
        <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-fg sm:text-5xl">
          {title}
        </h1>
        {children && <div className="mt-4 max-w-2xl text-lg text-fg-muted">{children}</div>}
      </Container>
    </section>
  );
}
