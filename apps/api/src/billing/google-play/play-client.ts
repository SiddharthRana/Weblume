import { importPKCS8, SignJWT } from 'jose';
import { ProviderError } from '../billing.types';

const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';

export interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

/** Accepts the key JSON raw or base64-encoded (convenient for env vars). */
export function parseServiceAccount(value: string): ServiceAccountKey {
  const text = value.trim().startsWith('{') ? value : Buffer.from(value, 'base64').toString('utf8');
  const key = JSON.parse(text) as ServiceAccountKey;
  if (!key.client_email || !key.private_key)
    throw new Error('Service account JSON is missing client_email/private_key');
  return key;
}

/** Subset of the Play Developer API SubscriptionPurchaseV2 resource we use. */
export interface SubscriptionPurchaseV2 {
  subscriptionState?: string;
  acknowledgementState?: string;
  linkedPurchaseToken?: string;
  latestOrderId?: string;
  startTime?: string;
  externalAccountIdentifiers?: { obfuscatedExternalAccountId?: string };
  lineItems?: {
    productId?: string;
    expiryTime?: string;
    autoRenewingPlan?: { autoRenewEnabled?: boolean };
    offerDetails?: { basePlanId?: string };
  }[];
}

export interface PlayApi {
  readonly configured: boolean;
  getSubscription(purchaseToken: string): Promise<SubscriptionPurchaseV2>;
  acknowledge(subscriptionId: string, purchaseToken: string): Promise<void>;
}

/** Google Play Developer API with service-account OAuth (JWT bearer grant), no SDK dependency. */
export class GooglePlayClient implements PlayApi {
  readonly configured = true;
  private token: { value: string; expiresAt: number } | null = null;

  constructor(
    private readonly packageName: string,
    private readonly key: ServiceAccountKey,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    const tokenUri = this.key.token_uri ?? 'https://oauth2.googleapis.com/token';
    const assertion = await new SignJWT({ scope: SCOPE })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .setIssuer(this.key.client_email)
      .setAudience(tokenUri)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(await importPKCS8(this.key.private_key, 'RS256'));
    const res = await this.fetchImpl(tokenUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new ProviderError('Google OAuth token request failed', res.status);
    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
    return data.access_token;
  }

  async getSubscription(purchaseToken: string): Promise<SubscriptionPurchaseV2> {
    const url = `${API}/${encodeURIComponent(this.packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
    const res = await this.fetchImpl(url, {
      headers: { Authorization: `Bearer ${await this.accessToken()}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new ProviderError('Play subscriptionsv2.get failed', res.status);
    return (await res.json()) as SubscriptionPurchaseV2;
  }

  async acknowledge(subscriptionId: string, purchaseToken: string): Promise<void> {
    const url = `${API}/${encodeURIComponent(this.packageName)}/purchases/subscriptions/${encodeURIComponent(subscriptionId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
    const res = await this.fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await this.accessToken()}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new ProviderError('Play acknowledge failed', res.status);
  }
}

export class UnconfiguredPlayApi implements PlayApi {
  readonly configured = false;
  async getSubscription(): Promise<SubscriptionPurchaseV2> {
    throw new ProviderError('Google Play is not configured');
  }
  async acknowledge(): Promise<void> {
    throw new ProviderError('Google Play is not configured');
  }
}

export const PLAY_API = Symbol('PLAY_API');
