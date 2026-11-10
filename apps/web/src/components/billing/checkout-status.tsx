'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { site } from '@/lib/site';
import { LogoMark } from '../logo';

export type CheckoutState = 'confirming' | 'active' | 'pending' | 'failed';

/**
 * Statuses the payment provider can put on the return URL (`?status=`) for a checkout that didn't
 * go through. Anything else (succeeded, active, processing or none) waits for the webhook.
 */
const FAILED_STATUSES = new Set([
  'failed',
  'cancelled',
  'canceled',
  'expired',
  'declined',
  'requires_payment_method',
]);

export function checkoutFailed(status: string | null): boolean {
  return status !== null && FAILED_STATUSES.has(status.toLowerCase());
}

/** The card shown at the top of the account page after returning from checkout. */
export function CheckoutStatus({
  state,
  planName,
  onCheckAgain,
  onDismiss,
}: {
  state: CheckoutState;
  planName: string;
  onCheckAgain: () => void;
  onDismiss: () => void;
}) {
  const dismiss = (
    <button
      type="button"
      onClick={onDismiss}
      className="btn-secondary rounded-lg px-4 py-2 text-sm font-semibold"
    >
      Dismiss
    </button>
  );
  switch (state) {
    case 'confirming':
      return (
        <Card tone="brand" badge={<ConfirmingBadge />} live="polite">
          <Title>
            Confirming your payment
            <span aria-hidden="true" className="loader-dots" />
          </Title>
          <Body>This usually takes a few seconds. You can stay on this page.</Body>
          <span
            aria-hidden="true"
            className="relative mt-4 block h-1 overflow-hidden rounded-full bg-primary/10"
          >
            <span className="scan-indeterminate absolute inset-y-0 left-0 w-1/3 rounded-full bg-[image:var(--wl-brand-gradient)]" />
          </span>
        </Card>
      );
    case 'active':
      return (
        <Card tone="success" badge={<SuccessBadge />} live="polite">
          <Title>You’re on {planName}</Title>
          <Body>Thank you! Your new limits and features are ready to use.</Body>
          <Actions>{dismiss}</Actions>
        </Card>
      );
    case 'pending':
      return (
        <Card tone="warning" badge={<PendingBadge />} live="polite">
          <Title>Still confirming your payment</Title>
          <Body>
            Our payment provider hasn’t confirmed it to us yet. It’s usually quick, but it can take
            up to 10 minutes. Please don’t pay again.
          </Body>
          <Body>
            You can leave this page: your plan switches on automatically once it’s confirmed, and
            the receipt is emailed to you. We’ll keep checking here too. If your plan hasn’t updated
            after 15 minutes, email{' '}
            <a href={`mailto:${site.supportEmail}`} className="font-medium underline">
              {site.supportEmail}
            </a>
            .
          </Body>
          <Actions>
            <button
              type="button"
              onClick={onCheckAgain}
              className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold"
            >
              Check again
            </button>
            {dismiss}
          </Actions>
        </Card>
      );
    case 'failed':
      return (
        <Card tone="danger" badge={<FailedBadge />} live="assertive">
          <Title>Your payment didn’t go through</Title>
          <Body>
            You haven’t been charged. Try again with a different card or payment method, or contact
            your bank if it keeps happening.
          </Body>
          <Actions>
            <Link
              href="/pricing"
              className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold"
            >
              Try again
            </Link>
            {dismiss}
          </Actions>
        </Card>
      );
  }
}

const TONES = {
  brand: 'border-primary/30',
  success: 'border-success/40',
  warning: 'border-sev-medium/40',
  danger: 'border-sev-critical/40',
} as const;

function Card({
  tone,
  badge,
  live,
  children,
}: {
  tone: keyof typeof TONES;
  badge: ReactNode;
  live: 'polite' | 'assertive';
  children: ReactNode;
}) {
  return (
    <div
      role={live === 'assertive' ? 'alert' : 'status'}
      aria-live={live}
      className={`card animate-pop flex items-start gap-4 border p-5 ${TONES[tone]}`}
    >
      <div aria-hidden="true" className="shrink-0">
        {badge}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Title({ children }: { children: ReactNode }) {
  return <p className="font-semibold text-fg">{children}</p>;
}

function Body({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-sm text-fg-muted">{children}</p>;
}

function Actions({ children }: { children: ReactNode }) {
  return <div className="mt-4 flex flex-wrap gap-2">{children}</div>;
}

/** The brand loader ring around the logo, as on the full-page loader. */
function ConfirmingBadge() {
  return (
    <span className="relative grid size-12 place-items-center">
      <span className="loader-ring absolute inset-0 rounded-full" />
      <span className="absolute inset-[4px] rounded-full bg-surface" />
      <LogoMark size={22} className="loader-breathe relative" />
    </span>
  );
}

function SuccessBadge() {
  return (
    <span className="checkout-badge-in grid size-12 place-items-center rounded-full bg-success/15 text-success">
      <svg
        viewBox="0 0 24 24"
        className="size-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} className="checkout-draw" />
      </svg>
    </span>
  );
}

function PendingBadge() {
  return (
    <span className="checkout-badge-in grid size-12 place-items-center rounded-full bg-sev-medium-bg text-sev-medium">
      <svg
        viewBox="0 0 24 24"
        className="size-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12" className="checkout-tick origin-[12px_12px]" />
        <path d="M12 12l3 2" />
      </svg>
    </span>
  );
}

function FailedBadge() {
  return (
    <span className="checkout-badge-in checkout-shake grid size-12 place-items-center rounded-full bg-sev-critical-bg text-sev-critical">
      <svg
        viewBox="0 0 24 24"
        className="size-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <path d="M7 7l10 10" pathLength={1} className="checkout-draw" />
        <path d="M17 7L7 17" pathLength={1} className="checkout-draw [animation-delay:0.15s]" />
      </svg>
    </span>
  );
}
