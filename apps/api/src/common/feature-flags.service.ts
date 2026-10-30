import { Injectable } from '@nestjs/common';
import { Database } from '../database/database.module';
import { featureFlags } from '../database/schema';

export type FlagKey = 'guest_scans' | 'psi' | 'link_check' | 'billing';

const CACHE_MS = 30_000;

/** Kill switches stored in the feature_flags table. Cached briefly; unknown flags are off. */
@Injectable()
export class FeatureFlags {
  private cache: { at: number; flags: Map<string, boolean> } | null = null;

  constructor(private readonly database: Database) {}

  async isEnabled(key: FlagKey): Promise<boolean> {
    if (!this.cache || Date.now() - this.cache.at > CACHE_MS) {
      const rows = await this.database.db.select().from(featureFlags);
      this.cache = { at: Date.now(), flags: new Map(rows.map((r) => [r.key, r.enabled])) };
    }
    return this.cache.flags.get(key) ?? false;
  }

  clearCache(): void {
    this.cache = null;
  }
}
