'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { CodeFix, CodeSnippet } from '@weblume/shared';

/** Copy-paste code for a finding (Starter), or a pointer to the plan that includes it. */
export function CodeFixSection({ fix, available }: { fix?: CodeFix; available: boolean }) {
  if (!fix && !available) return null;
  return (
    <section>
      <h4 className="flex items-center gap-2 font-semibold text-fg">
        Code fix
        <span className="rounded-full bg-brand-gradient px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-white">
          Starter
        </span>
      </h4>
      {fix ? (
        <div className="mt-2 space-y-3">
          {fix.snippets.map((s, i) => (
            <Snippet key={i} snippet={s} />
          ))}
          {fix.note && <p className="text-fg-muted">{fix.note}</p>}
        </div>
      ) : (
        <div className="mt-2 rounded-md border border-dashed border-border p-3 text-fg-muted">
          <p>
            Copy-paste code for this fix, written for your page, is included in the Starter plan.
          </p>
          <Link href="/pricing" className="mt-1 inline-block font-medium text-primary underline">
            See Starter
          </Link>
        </div>
      )}
    </section>
  );
}

function Snippet({ snippet }: { snippet: CodeSnippet }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (permissions, insecure context): the code is still selectable.
    }
  };
  return (
    <figure className="overflow-hidden rounded-md border border-border">
      <figcaption className="flex items-center justify-between gap-3 border-b border-border bg-surface-muted px-3 py-1.5 text-xs text-fg-muted">
        <span className="min-w-0 break-all">{snippet.label}</span>
        <button
          type="button"
          onClick={copy}
          className="min-h-8 shrink-0 rounded px-2 font-medium text-primary hover:bg-surface"
        >
          {copied ? 'Copied' : 'Copy'}
          <span className="sr-only"> code: {snippet.label}</span>
        </button>
      </figcaption>
      <pre className="overflow-x-auto bg-surface-muted/50 p-3 font-mono text-xs leading-relaxed text-fg [font-variant-ligatures:none]">
        <code>{snippet.code}</code>
      </pre>
      <span aria-live="polite" className="sr-only">
        {copied ? 'Copied to clipboard' : ''}
      </span>
    </figure>
  );
}
