import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { Database } from '../database/database.module';
import { webhookEvents, type PaymentProviderId } from '../database/schema';

/** Idempotency + audit trail for provider events (payloads purged after 30 days by retention). */
@Injectable()
export class WebhookLedger {
  constructor(private readonly database: Database) {}

  /** Records an event. Returns false if this event id was already processed (duplicate delivery). */
  async begin(
    provider: PaymentProviderId,
    eventId: string,
    eventType: string,
    payload: unknown,
  ): Promise<boolean> {
    const inserted = await this.database.db
      .insert(webhookEvents)
      .values({ provider, eventId, eventType, payload: payload as object })
      .onConflictDoNothing({ target: [webhookEvents.provider, webhookEvents.eventId] })
      .returning({ id: webhookEvents.id });
    if (inserted.length) return true;
    // Redelivery of an event that previously failed may be retried.
    const [existing] = await this.database.db
      .select({ status: webhookEvents.status })
      .from(webhookEvents)
      .where(and(eq(webhookEvents.provider, provider), eq(webhookEvents.eventId, eventId)))
      .limit(1);
    return existing?.status === 'failed' || existing?.status === 'received';
  }

  async finish(
    provider: PaymentProviderId,
    eventId: string,
    status: 'processed' | 'ignored' | 'failed',
    error?: string,
  ) {
    await this.database.db
      .update(webhookEvents)
      .set({ status, error: error ?? null, processedAt: new Date() })
      .where(and(eq(webhookEvents.provider, provider), eq(webhookEvents.eventId, eventId)));
  }
}
