import { describe, expect, it } from 'vitest';
import { scannerBlockedHosts } from '../../src/scans/scans.module';
import { GuardedFetchError, GuardedHttpClient } from '../../src/scanner/http/guarded-client';

const env = {
  SUPABASE_URL: 'https://abcdefgh.supabase.co',
  SCAN_BLOCKED_HOSTS: ['api.weblu.me', 'weblume-api.fly.dev'],
};

describe('scannerBlockedHosts', () => {
  it('blocks our database and API hosts', () => {
    expect(scannerBlockedHosts(env)).toEqual([
      'abcdefgh.supabase.co',
      'api.weblu.me',
      'weblume-api.fly.dev',
    ]);
  });

  it('lets people scan our own public website', () => {
    const client = new GuardedHttpClient({
      userAgent: 'test',
      blockedHosts: scannerBlockedHosts(env),
    });
    expect(() => client.assertAllowedUrl('https://weblu.me/')).not.toThrow();
    expect(() => client.assertAllowedUrl('https://api.weblu.me/ready')).toThrow(GuardedFetchError);
    expect(() => client.assertAllowedUrl('https://abcdefgh.supabase.co/')).toThrow(
      GuardedFetchError,
    );
  });
});
