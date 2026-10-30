import { createHmac, timingSafeEqual } from 'node:crypto';
import { WebhookSignatureError } from '../billing.types';

export const SIGNATURE_TOLERANCE_SECONDS = 300;

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

function assertFresh(timestampSeconds: number, now: Date): void {
  if (!Number.isFinite(timestampSeconds)) throw new WebhookSignatureError('bad timestamp');
  if (Math.abs(now.getTime() / 1000 - timestampSeconds) > SIGNATURE_TOLERANCE_SECONDS) {
    throw new WebhookSignatureError('timestamp outside tolerance');
  }
}

/**
 * Paddle Billing: `Paddle-Signature: ts=<unix>;h1=<hex hmac>` (several h1 during secret rotation),
 * HMAC-SHA256 over `${ts}:${rawBody}` with the notification destination's secret key.
 */
export function verifyPaddleSignature(
  header: string | undefined,
  rawBody: Buffer,
  secret: string,
  now = new Date(),
): void {
  if (!header) throw new WebhookSignatureError('missing signature');
  const parts = header.split(';').map((p) => p.trim().split('='));
  const ts = parts.find(([k]) => k === 'ts')?.[1];
  const sigs = parts.filter(([k]) => k === 'h1').map(([, v]) => v ?? '');
  if (!ts || !sigs.length) throw new WebhookSignatureError('malformed signature');
  assertFresh(Number(ts), now);
  const expected = createHmac('sha256', secret).update(`${ts}:`).update(rawBody).digest();
  if (!sigs.some((s) => /^[0-9a-f]+$/i.test(s) && safeEqual(Buffer.from(s, 'hex'), expected))) {
    throw new WebhookSignatureError('signature mismatch');
  }
}

/**
 * Standard Webhooks (https://www.standardwebhooks.com), used by Dodo Payments: headers
 * `webhook-id`, `webhook-timestamp`, `webhook-signature: v1,<base64> [v1,<base64>…]`;
 * HMAC-SHA256 over `${id}.${timestamp}.${rawBody}` with the base64 key after the `whsec_` prefix.
 */
export function verifyStandardWebhook(
  headers: { id?: string; timestamp?: string; signature?: string },
  rawBody: Buffer,
  secret: string,
  now = new Date(),
): void {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) throw new WebhookSignatureError('missing signature headers');
  assertFresh(Number(timestamp), now);
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.`).update(rawBody).digest();
  const candidates = signature
    .split(' ')
    .map((s) => s.split(','))
    .filter(([v, sig]) => v === 'v1' && sig)
    .map(([, sig]) => Buffer.from(sig!, 'base64'));
  if (!candidates.some((c) => safeEqual(c, expected)))
    throw new WebhookSignatureError('signature mismatch');
}
