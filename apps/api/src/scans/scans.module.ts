import { Module } from '@nestjs/common';
import { ENV, type Env } from '../config/env';
import { GooglePsiProvider, UnconfiguredPsiProvider } from '../scanner/psi/google-psi.provider';
import { PsiService } from '../scanner/psi/psi-cache.service';
import { PSI_PROVIDER } from '../scanner/psi/psi.types';
import { GuardedHttpClient } from '../scanner/http/guarded-client';
import { PgBossScanQueue } from './pg-boss.queue';
import { GUARDED_CLIENT, HTTP_PROBE_PORT, ScanProcessor } from './scan.processor';
import { SCAN_QUEUE } from './scan-queue';
import { ScanHooks } from './scan-hooks';
import { ScansController } from './scans.controller';
import { ScansService } from './scans.service';
import {
  CloudflareTurnstileVerifier,
  DisabledTurnstileVerifier,
  TURNSTILE_VERIFIER,
} from './turnstile';

export function botUserAgent(siteUrl: string): string {
  return `WeblumeBot/1.0 (+${siteUrl.replace(/\/$/, '')}/bot)`;
}

/**
 * Hosts the scanner must never fetch: our Supabase project and our own API hosts
 * (SCAN_BLOCKED_HOSTS). Our public website (PUBLIC_SITE_URL) is a static site anyone can visit, so
 * people may scan it like any other site.
 */
export function scannerBlockedHosts(
  env: Pick<Env, 'SUPABASE_URL' | 'SCAN_BLOCKED_HOSTS'>,
): string[] {
  return [new URL(env.SUPABASE_URL).hostname, ...env.SCAN_BLOCKED_HOSTS];
}

@Module({
  controllers: [ScansController],
  exports: [ScansService, ScanHooks, SCAN_QUEUE],
  providers: [
    ScansService,
    ScanHooks,
    ScanProcessor,
    PsiService,
    { provide: SCAN_QUEUE, useClass: PgBossScanQueue },
    { provide: HTTP_PROBE_PORT, useValue: undefined },
    {
      provide: GUARDED_CLIENT,
      inject: [ENV],
      useFactory: (env: Env) => {
        return new GuardedHttpClient({
          userAgent: botUserAgent(env.PUBLIC_SITE_URL),
          blockedHosts: scannerBlockedHosts(env),
        });
      },
    },
    {
      provide: PSI_PROVIDER,
      inject: [ENV],
      useFactory: (env: Env) =>
        env.PSI_API_KEY ? new GooglePsiProvider(env.PSI_API_KEY) : new UnconfiguredPsiProvider(),
    },
    {
      provide: TURNSTILE_VERIFIER,
      inject: [ENV],
      useFactory: (env: Env) =>
        env.TURNSTILE_SECRET_KEY
          ? new CloudflareTurnstileVerifier(env.TURNSTILE_SECRET_KEY)
          : new DisabledTurnstileVerifier(),
    },
  ],
})
export class ScansModule {}
