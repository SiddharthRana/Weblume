import { createHmac, randomBytes } from 'node:crypto';
import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { subscriptionGrantsAccess } from '@weblume/shared';
import type { JWTVerifyGetKey } from 'jose';
import type { AuthUser } from '../auth/auth.types';
import { FeatureFlags } from '../common/feature-flags.service';
import { ENV, type Env } from '../config/env';
import { Database } from '../database/database.module';
import { profiles, subscriptions, type PaymentProviderId } from '../database/schema';
import { EntitlementService } from '../entitlements/entitlement.service';
import { ApiError } from '../scans/scans.errors';
import {
  ProviderError,
  WEB_PAYMENT_PROVIDER,
  WebhookSignatureError,
  type BillingInterval,
  type WebhookRequest,
  type WebPaymentProvider,
} from './billing.types';
import { PLAY_API, type PlayApi } from './google-play/play-client';
import { mapPlaySubscription, PLAY_NOTIFICATION } from './google-play/play-mapper';
import { decodeRtdn, RTDN_KEY_RESOLVER, verifyPubSubPush } from './google-play/rtdn-verifier';
import { ProductCatalog } from './product-catalog';
import { SubscriptionStore } from './subscription-store';
import { WebhookLedger } from './webhook-ledger';

export interface BillingConfigDto {
  enabled: boolean;
  web: { provider: 'none' | 'paddle' | 'dodo'; available: boolean; intervals: BillingInterval[] };
  googlePlay: { available: boolean; packageName: string; subscriptionId: string };
}

const ACKNOWLEDGEABLE = new Set([
  'SUBSCRIPTION_STATE_ACTIVE',
  'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
]);

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly accountSecret: string;

  constructor(
    private readonly database: Database,
    private readonly flags: FeatureFlags,
    private readonly catalog: ProductCatalog,
    private readonly store: SubscriptionStore,
    private readonly ledger: WebhookLedger,
    private readonly entitlements: EntitlementService,
    @Inject(WEB_PAYMENT_PROVIDER) private readonly web: WebPaymentProvider | null,
    @Inject(PLAY_API) private readonly play: PlayApi,
    @Inject(RTDN_KEY_RESOLVER) private readonly rtdnKeys: JWTVerifyGetKey,
    @Inject(ENV) private readonly env: Env,
  ) {
    // Development fallback only; production config requires BILLING_ACCOUNT_SECRET when Play is used.
    this.accountSecret = env.BILLING_ACCOUNT_SECRET ?? randomBytes(32).toString('hex');
  }

  async config(): Promise<BillingConfigDto> {
    const enabled = await this.flags.isEnabled('billing');
    const intervals = (['monthly', 'annual'] as const).filter((i) =>
      this.web ? Boolean(this.catalog.forPlan(this.web.id, 'starter', i)) : false,
    );
    return {
      enabled,
      web: {
        provider: this.web?.id ?? 'none',
        available: enabled && Boolean(this.web?.configured) && intervals.length > 0,
        intervals,
      },
      googlePlay: {
        available: enabled && this.play.configured,
        packageName: this.env.GOOGLE_PLAY_PACKAGE_NAME,
        subscriptionId: this.env.GOOGLE_PLAY_SUBSCRIPTION_ID,
      },
    };
  }

  /** Subscriptions that currently grant access, across all channels. */
  private async activeSubscriptions(userId: string) {
    const rows = await this.database.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));
    return rows.filter((s) => subscriptionGrantsAccess(s.status, s.currentPeriodEnd));
  }

  private async assertBillingEnabled(): Promise<void> {
    if (!(await this.flags.isEnabled('billing'))) {
      throw new ApiError(
        HttpStatus.FORBIDDEN,
        'billing_disabled',
        'Paid plans aren’t available yet.',
      );
    }
  }

  async checkout(user: AuthUser, interval: BillingInterval): Promise<{ url: string }> {
    await this.assertBillingEnabled();
    await this.entitlements.forUser(user.id); // rejects deleted accounts
    if (!this.web?.configured) {
      throw new ApiError(
        HttpStatus.SERVICE_UNAVAILABLE,
        'checkout_unavailable',
        'Online checkout isn’t available right now.',
      );
    }
    const active = await this.activeSubscriptions(user.id);
    if (active.length) {
      throw new ApiError(
        HttpStatus.CONFLICT,
        'already_subscribed',
        'You already have an active subscription.',
        {
          provider: active[0]!.provider,
        },
      );
    }
    const entry = this.catalog.forPlan(this.web.id, 'starter', interval);
    if (!entry)
      throw new ApiError(HttpStatus.BAD_REQUEST, 'plan_unavailable', 'That plan isn’t available.');
    try {
      return await this.web.createCheckout({
        userId: user.id,
        email: user.email,
        productId: entry.productId,
        returnUrl: this.env.BILLING_RETURN_URL,
      });
    } catch (err) {
      this.logger.error(
        `Checkout creation failed: ${err instanceof ProviderError ? `${err.message} (${err.status})` : 'unknown'}`,
      );
      throw new ApiError(
        HttpStatus.BAD_GATEWAY,
        'checkout_failed',
        'We couldn’t start checkout. Please try again.',
      );
    }
  }

  async portal(user: AuthUser): Promise<{ url: string }> {
    if (!this.web?.configured) {
      throw new ApiError(
        HttpStatus.SERVICE_UNAVAILABLE,
        'portal_unavailable',
        'Subscription management isn’t available right now.',
      );
    }
    const [sub] = await this.database.db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, user.id), eq(subscriptions.provider, this.web.id)))
      .orderBy(desc(subscriptions.lastEventAt))
      .limit(1);
    if (!sub?.providerCustomerId) {
      throw new ApiError(
        HttpStatus.NOT_FOUND,
        'no_web_subscription',
        'You don’t have a subscription bought on the web.',
      );
    }
    try {
      return await this.web.createPortalSession({
        customerId: sub.providerCustomerId,
        subscriptionId: sub.providerSubscriptionId,
      });
    } catch {
      throw new ApiError(
        HttpStatus.BAD_GATEWAY,
        'portal_failed',
        'We couldn’t open subscription management. Please try again.',
      );
    }
  }

  /** Verified web provider webhook → subscription state. Idempotent; out-of-order safe. */
  async handleWebhook(providerId: string, req: WebhookRequest): Promise<{ status: string }> {
    if (!this.web || this.web.id !== providerId || !this.web.configured) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'not_found', 'Not found.');
    }
    let parsed;
    try {
      parsed = this.web.parseWebhook(req);
    } catch (err) {
      if (err instanceof WebhookSignatureError || err instanceof SyntaxError) {
        throw new ApiError(HttpStatus.UNAUTHORIZED, 'invalid_signature', 'Invalid signature.');
      }
      throw err;
    }
    return this.process(this.web.id, parsed.eventId, parsed.eventType, req.rawBody, async () => {
      if (!parsed.subscription) return { status: 'ignored', reason: parsed.ignoredReason };
      const r = await this.store.apply(parsed.subscription);
      return r.applied ? { status: 'processed' } : { status: 'ignored', reason: r.reason };
    });
  }

  private async process(
    provider: PaymentProviderId,
    eventId: string,
    eventType: string,
    rawBody: Buffer,
    work: () => Promise<{ status: 'processed' | 'ignored'; reason?: string }>,
  ): Promise<{ status: string }> {
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      payload = null;
    }
    if (!(await this.ledger.begin(provider, eventId, eventType, payload)))
      return { status: 'duplicate' };
    try {
      const result = await work();
      await this.ledger.finish(provider, eventId, result.status, result.reason);
      return { status: result.status };
    } catch (err) {
      await this.ledger.finish(
        provider,
        eventId,
        'failed',
        err instanceof Error ? err.message : 'unknown',
      );
      throw err; // 5xx → provider retries
    }
  }

  /** Opaque id passed to Google Play as obfuscatedAccountId; stored so notifications map to the user. */
  async playAccountRef(user: AuthUser): Promise<string> {
    await this.entitlements.forUser(user.id);
    const ref = createHmac('sha256', this.accountSecret).update(user.id).digest('hex');
    await this.database.db
      .update(profiles)
      .set({ billingAccountRef: ref })
      .where(eq(profiles.id, user.id));
    return ref;
  }

  async verifyPlayPurchase(
    user: AuthUser,
    purchaseToken: string,
  ): Promise<{ planId: string; status: string; duplicateSubscription: boolean }> {
    await this.assertBillingEnabled();
    if (!this.play.configured) {
      throw new ApiError(
        HttpStatus.SERVICE_UNAVAILABLE,
        'play_unavailable',
        'Google Play purchases can’t be verified right now.',
      );
    }
    const ref = await this.playAccountRef(user);
    let purchase;
    try {
      purchase = await this.play.getSubscription(purchaseToken);
    } catch (err) {
      const status = err instanceof ProviderError ? err.status : undefined;
      if (status === 400 || status === 404 || status === 410) {
        throw new ApiError(
          HttpStatus.BAD_REQUEST,
          'invalid_purchase',
          'That purchase couldn’t be found.',
        );
      }
      throw new ApiError(
        HttpStatus.BAD_GATEWAY,
        'play_unreachable',
        'We couldn’t reach Google Play. Please try again.',
      );
    }
    const mapped = mapPlaySubscription(purchaseToken, purchase, { eventAt: new Date() });
    if (mapped.productId !== this.env.GOOGLE_PLAY_SUBSCRIPTION_ID) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        'invalid_purchase',
        'That purchase isn’t a Weblume subscription.',
      );
    }
    // A token bought under another account (or without our account id) can't be claimed.
    if (mapped.accountRef !== ref) {
      throw new ApiError(
        HttpStatus.FORBIDDEN,
        'purchase_account_mismatch',
        'This purchase belongs to a different account.',
      );
    }
    const otherActive = (await this.activeSubscriptions(user.id)).filter(
      (s) => s.provider !== 'google_play' && s.providerSubscriptionId !== purchaseToken,
    );
    await this.store.apply({ ...mapped, userId: user.id });
    if (
      purchase.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING' &&
      ACKNOWLEDGEABLE.has(purchase.subscriptionState ?? '')
    ) {
      await this.play.acknowledge(mapped.productId, purchaseToken);
    }
    return {
      planId: mapped.planId,
      status: mapped.status,
      duplicateSubscription: otherActive.length > 0,
    };
  }

  /** Real-time Developer Notification via Pub/Sub push. The API read is the source of truth. */
  async handleRtdn(authorization: string | undefined, body: unknown): Promise<{ status: string }> {
    const audience = this.env.GOOGLE_PLAY_RTDN_AUDIENCE;
    const serviceAccount = this.env.GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT;
    if (!audience || !serviceAccount || !this.play.configured) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'not_found', 'Not found.');
    }
    if (
      !(await verifyPubSubPush(authorization, { keys: this.rtdnKeys, audience, serviceAccount }))
    ) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'invalid_token', 'Invalid push token.');
    }
    const decoded = decodeRtdn(body as { message?: { data?: string; messageId?: string } });
    if (!decoded) throw new ApiError(HttpStatus.BAD_REQUEST, 'invalid_message', 'Invalid message.');
    const { messageId, data } = decoded;
    const n = data.subscriptionNotification;
    const type = n
      ? `subscription.${n.notificationType}`
      : data.testNotification
        ? 'test'
        : 'other';
    return this.process(
      'google_play',
      messageId,
      type,
      Buffer.from(JSON.stringify(data)),
      async () => {
        if (data.packageName !== this.env.GOOGLE_PLAY_PACKAGE_NAME)
          return { status: 'ignored', reason: 'other_package' };
        if (!n?.purchaseToken)
          return { status: 'ignored', reason: data.testNotification ? 'test' : 'unhandled' };
        const purchase = await this.play.getSubscription(n.purchaseToken);
        const eventAt = data.eventTimeMillis ? new Date(Number(data.eventTimeMillis)) : new Date();
        const mapped = mapPlaySubscription(n.purchaseToken, purchase, {
          eventAt,
          revoked: n.notificationType === PLAY_NOTIFICATION.REVOKED,
        });
        if (mapped.productId !== this.env.GOOGLE_PLAY_SUBSCRIPTION_ID)
          return { status: 'ignored', reason: 'other_product' };
        const r = await this.store.apply(mapped);
        if (!r.applied) return { status: 'ignored', reason: r.reason };
        // Acknowledge here too, in case the app never reported the purchase (avoids Play's 3-day auto-refund).
        if (
          purchase.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING' &&
          ACKNOWLEDGEABLE.has(purchase.subscriptionState ?? '')
        ) {
          await this.play.acknowledge(mapped.productId, n.purchaseToken);
        }
        return { status: 'processed' };
      },
    );
  }
}
