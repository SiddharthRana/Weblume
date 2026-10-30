'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Paddle?: {
      Environment: { set: (env: string) => void };
      Initialize: (opts: Record<string, unknown>) => void;
    };
  }
}

const TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? '';
const ENV = process.env.NEXT_PUBLIC_PADDLE_ENV === 'production' ? 'production' : 'sandbox';

/**
 * Paddle's "default payment link" page. The API creates the transaction (with our user id) and sends
 * the customer here with ?_ptxn=…; Paddle.js opens the checkout for that transaction automatically.
 */
export function PaddleCheckout() {
  const [failed, setFailed] = useState(!TOKEN);

  useEffect(() => {
    if (!TOKEN) return;
    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;
    script.onload = () => {
      if (!window.Paddle) return setFailed(true);
      if (ENV === 'sandbox') window.Paddle.Environment.set('sandbox');
      window.Paddle.Initialize({
        token: TOKEN,
        checkout: {
          settings: { successUrl: `${window.location.origin}/account?checkout=success` },
        },
      });
    };
    script.onerror = () => setFailed(true);
    document.head.appendChild(script);
  }, []);

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      {failed ? (
        <>
          <h1 className="text-2xl font-bold text-fg">Checkout couldn’t be opened</h1>
          <p className="mt-3 text-fg-muted">
            Please try again in a moment. You haven’t been charged.
          </p>
          <Link
            href="/pricing"
            className="mt-6 inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-semibold text-on-primary"
          >
            Back to pricing
          </Link>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-fg">Opening secure checkout…</h1>
          <p className="mt-3 text-fg-muted">
            Payment is handled by Paddle, our payment partner and merchant of record.
          </p>
        </>
      )}
    </div>
  );
}
