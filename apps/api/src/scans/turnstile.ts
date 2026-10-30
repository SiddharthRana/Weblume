export const TURNSTILE_VERIFIER = Symbol('TURNSTILE_VERIFIER');

export interface TurnstileVerifier {
  /** True when no secret is configured (development only — production config requires it for guests). */
  readonly disabled: boolean;
  verify(token: string, remoteIp?: string): Promise<boolean>;
}

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export class CloudflareTurnstileVerifier implements TurnstileVerifier {
  readonly disabled = false;

  constructor(
    private readonly secret: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async verify(token: string, remoteIp?: string): Promise<boolean> {
    if (!token || token.length > 2048) return false;
    const body = new URLSearchParams({ secret: this.secret, response: token });
    if (remoteIp) body.set('remoteip', remoteIp);
    try {
      const res = await this.fetchImpl(SITEVERIFY, {
        method: 'POST',
        body,
        signal: AbortSignal.timeout(5_000),
      });
      const data = (await res.json()) as { success?: boolean };
      return data.success === true;
    } catch {
      return false;
    }
  }
}

export class DisabledTurnstileVerifier implements TurnstileVerifier {
  readonly disabled = true;
  async verify(): Promise<boolean> {
    return true;
  }
}
