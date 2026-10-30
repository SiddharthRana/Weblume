export const AUTH_ADMIN = Symbol('AUTH_ADMIN');

/** Server-side Supabase Auth administration (only what we need). */
export interface AuthAdmin {
  readonly configured: boolean;
  /** Deletes the auth user. Resolves if the user is gone (including already-deleted). */
  deleteUser(userId: string): Promise<void>;
}

export class SupabaseAuthAdmin implements AuthAdmin {
  readonly configured = true;

  constructor(
    private readonly supabaseUrl: string,
    private readonly secretKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async deleteUser(userId: string): Promise<void> {
    const url = new URL(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, this.supabaseUrl);
    const res = await this.fetchImpl(url, {
      method: 'DELETE',
      headers: { apikey: this.secretKey, Authorization: `Bearer ${this.secretKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    // 404: already gone — deletion is idempotent.
    if (!res.ok && res.status !== 404)
      throw new Error(`Supabase admin delete failed with HTTP ${res.status}`);
  }
}

export class UnconfiguredAuthAdmin implements AuthAdmin {
  readonly configured = false;
  async deleteUser(): Promise<void> {
    throw new Error('SUPABASE_SECRET_KEY is not configured');
  }
}
