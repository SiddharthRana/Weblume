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
    <section className="hero-glow border-b border-border py-14 sm:py-20">
      <Container>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="text-gradient mt-4 max-w-3xl pb-1 text-3xl font-semibold tracking-tight sm:text-5xl">
          {title}
        </h1>
        {children && <div className="mt-4 max-w-2xl text-lg text-fg-muted">{children}</div>}
      </Container>
    </section>
  );
}
