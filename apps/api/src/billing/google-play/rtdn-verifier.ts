import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

export const RTDN_KEY_RESOLVER = Symbol('RTDN_KEY_RESOLVER');

export function googleOidcKeys(): JWTVerifyGetKey {
  return createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'), {
    cacheMaxAge: 60 * 60_000,
  });
}

/**
 * Verifies the OIDC token Pub/Sub attaches to push requests (Authorization: Bearer …):
 * Google-signed, expected audience, and issued for our push service account.
 */
export async function verifyPubSubPush(
  authorization: string | undefined,
  opts: { keys: JWTVerifyGetKey; audience: string; serviceAccount: string },
): Promise<boolean> {
  const token = authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, opts.keys, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: opts.audience,
      algorithms: ['RS256'],
    });
    return payload.email === opts.serviceAccount && payload.email_verified === true;
  } catch {
    return false;
  }
}

export interface RtdnMessage {
  version?: string;
  packageName?: string;
  eventTimeMillis?: string;
  subscriptionNotification?: {
    notificationType?: number;
    purchaseToken?: string;
    subscriptionId?: string;
  };
  testNotification?: { version?: string };
}

export function decodeRtdn(body: {
  message?: { data?: string; messageId?: string };
}): { messageId: string; data: RtdnMessage } | null {
  const msg = body.message;
  if (!msg?.data || !msg.messageId) return null;
  try {
    return {
      messageId: msg.messageId,
      data: JSON.parse(Buffer.from(msg.data, 'base64').toString('utf8')) as RtdnMessage,
    };
  } catch {
    return null;
  }
}
