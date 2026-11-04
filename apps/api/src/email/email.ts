import { Global, Logger, Module } from '@nestjs/common';
import { ENV, type Env } from '../config/env';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  headers?: Record<string, string>;
}

/** Sends transactional email. Resend in production; the log (or nothing) otherwise. */
export interface EmailSender {
  /** True when messages actually leave the server. */
  readonly delivers: boolean;
  send(message: EmailMessage): Promise<void>;
}

export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

export class EmailSendError extends Error {
  constructor(readonly status: number) {
    super(`Email provider rejected the message (HTTP ${status})`);
    this.name = 'EmailSendError';
  }
}

/** Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email). */
export class ResendEmailSender implements EmailSender {
  readonly delivers = true;

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const res = await this.fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
        headers: message.headers,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new EmailSendError(res.status);
  }
}

/**
 * Development stand-in: writes the message to the log so digests can be read locally. In
 * production without a key it only notes that a message was skipped (no content, no address).
 */
export class LogEmailSender implements EmailSender {
  readonly delivers = false;
  private readonly logger = new Logger('Email');

  constructor(private readonly verbose: boolean) {}

  async send(message: EmailMessage): Promise<void> {
    if (!this.verbose) {
      this.logger.warn('Email not sent: RESEND_API_KEY is not configured');
      return;
    }
    this.logger.log(
      `Email to ${maskAddress(message.to)}\nSubject: ${message.subject}\n\n${message.text}`,
    );
  }
}

/** "jane@example.com" → "j***@example.com", so local logs don't collect addresses. */
export function maskAddress(address: string): string {
  const [local = '', domain = ''] = address.split('@');
  return `${local.slice(0, 1)}***@${domain}`;
}

@Global()
@Module({
  providers: [
    {
      provide: EMAIL_SENDER,
      inject: [ENV],
      useFactory: (env: Env): EmailSender =>
        env.RESEND_API_KEY && env.EMAIL_FROM
          ? new ResendEmailSender(env.RESEND_API_KEY, env.EMAIL_FROM)
          : new LogEmailSender(env.NODE_ENV !== 'production'),
    },
  ],
  exports: [EMAIL_SENDER],
})
export class EmailModule {}
