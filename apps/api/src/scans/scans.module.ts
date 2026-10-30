import { Module } from '@nestjs/common';
import { ENV, type Env } from '../config/env';
import { GooglePsiProvider, UnconfiguredPsiProvider } from '../scanner/psi/google-psi.provider';
import { PsiService } from '../scanner/psi/psi-cache.service';
import { PSI_PROVIDER } from '../scanner/psi/psi.types';
import { GuardedHttpClient } from '../scanner/http/guarded-client';
import { PgBossScanQueue } from './pg-boss.queue';
import { GUARDED_CLIENT, HTTP_PROBE_PORT, ScanProcessor } from './scan.processor';
import { SCAN_QUEUE } from './scan-queue';
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

@Module({
  controllers: [ScansController],
  providers: [
    ScansService,
    ScanProcessor,
    PsiService,
    { provide: SCAN_QUEUE, useClass: PgBossScanQueue },
    { provide: HTTP_PROBE_PORT, useValue: undefined },
    {
      provide: GUARDED_CLIENT,
      inject: [ENV],
      useFactory: (env: Env) => {
        const ownHosts = [env.PUBLIC_SITE_URL, env.SUPABASE_URL].map((u) => new URL(u).hostname);
        return new GuardedHttpClient({
          userAgent: botUserAgent(env.PUBLIC_SITE_URL),
          blockedHosts: [...ownHosts, ...env.SCAN_BLOCKED_HOSTS],
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
