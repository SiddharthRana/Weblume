import type { ReactNode } from 'react';
import { Container } from './container';

/** Wrapper for legal placeholder pages. Content must be reviewed by a lawyer before launch. */
export function LegalDraft({
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
      <div
        role="note"
        className="mb-8 rounded-lg border-2 border-danger bg-sev-critical-bg p-4 text-sm text-sev-critical"
      >
        <strong>DRAFT — requires legal review.</strong> This page is a placeholder written by the
        product team. It is not legal advice and must be reviewed by a qualified lawyer before
        Weblume launches.
      </div>
      <article className="prose">
        <h1>{title}</h1>
        <p className="text-sm text-fg-muted">Last updated: {updated}</p>
        {children}
      </article>
    </Container>
  );
}
