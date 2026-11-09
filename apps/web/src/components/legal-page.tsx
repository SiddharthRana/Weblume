import type { ReactNode } from 'react';
import { Container } from './container';

/** Layout for the legal pages (privacy, terms, refunds, account deletion). */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <Container className="py-12">
      <article className="prose">
        <h1>{title}</h1>
        <p className="text-sm text-fg-muted">Last updated: {updated}</p>
        {children}
      </article>
    </Container>
  );
}
