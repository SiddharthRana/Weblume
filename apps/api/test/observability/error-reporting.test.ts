import { HttpException, HttpStatus, type ArgumentsHost } from '@nestjs/common';
import type { HttpAdapterHost } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import type { ErrorEvent } from '@sentry/node';
import { afterAll, describe, expect, it, vi } from 'vitest';
import {
  scrubEvent,
  SentryErrorReporter,
  type ErrorReporter,
} from '../../src/observability/error-reporter';
import { logPath } from '../../src/app.module';
import { ReportingExceptionFilter } from '../../src/observability/reporting-exception.filter';
import { withoutMessage } from '../../src/scans/scan.processor';

describe('scrubEvent', () => {
  it('removes identity, cookies, auth headers, bodies, query strings and share tokens', () => {
    const event = scrubEvent({
      type: undefined,
      user: { id: 'u1', email: 'asha@example.com', ip_address: '203.0.113.9' },
      request: {
        url: 'https://api.weblume.app/v1/shared/SECRETTOKEN123456?x=1',
        query_string: 'q=https://private.example',
        cookies: { sb: 'x' },
        data: '{"url":"https://private.example"}',
        headers: {
          Authorization: 'Bearer abc',
          'x-scan-token': 't',
          'X-Forwarded-For': '203.0.113.9',
          'user-agent': 'Mozilla',
        },
      },
      breadcrumbs: [{ data: { url: 'https://x.test/r/TOKEN?y=1' } }],
    } as ErrorEvent);
    expect(event.user).toBeUndefined();
    expect(event.request).toEqual({
      url: 'https://api.weblume.app/v1/shared/[token]',
      headers: { 'user-agent': 'Mozilla' },
    });
    expect(event.breadcrumbs?.[0]?.data?.url).toBe('https://x.test/r/[token]');
  });
});

describe('withoutMessage', () => {
  it('keeps the error type and stack frames but not the message', () => {
    const err = new TypeError('fetch failed for https://secret.example/path');
    const safe = withoutMessage(err);
    expect(safe.name).toBe('TypeError');
    expect(safe.message).not.toContain('secret');
    expect(safe.stack).not.toContain('secret');
    expect(safe.stack).toMatch(/^TypeError: Scan crashed\n\s+at /);
  });
});

describe('ReportingExceptionFilter', () => {
  const reporter = { enabled: true, capture: vi.fn<ErrorReporter['capture']>() };
  const adapter = { reply: vi.fn(), isHeadersSent: () => false, end: vi.fn() };
  const filter = new ReportingExceptionFilter(reporter, {
    httpAdapter: adapter,
  } as unknown as HttpAdapterHost);
  const host = {
    getType: () => 'http',
    getArgs: () => [],
    getArgByIndex: (i: number) => (i === 1 ? { res: true } : { req: true }),
    switchToHttp: () => ({
      getRequest: () => ({ method: 'GET', route: { path: '/v1/scans/:id' }, url: '/v1/scans/1' }),
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
  } as unknown as ArgumentsHost;

  it('reports unexpected errors with the route pattern only, and still answers 500', () => {
    filter.catch(new Error('db down'), host);
    expect(reporter.capture).toHaveBeenCalledWith(expect.any(Error), {
      method: 'GET',
      route: '/v1/scans/:id',
      status: 500,
    });
    expect(adapter.reply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ statusCode: 500 }),
      500,
    );
  });

  it('does not report expected client errors', () => {
    reporter.capture.mockClear();
    filter.catch(new HttpException('nope', HttpStatus.NOT_FOUND), host);
    filter.catch(new HttpException('slow down', HttpStatus.TOO_MANY_REQUESTS), host);
    // e.g. body-parser's "request entity too large"
    filter.catch(Object.assign(new Error('too large'), { statusCode: 413, expose: true }), host);
    expect(reporter.capture).not.toHaveBeenCalled();
  });
});

describe('SentryErrorReporter', () => {
  afterAll(() => Sentry.close());

  it('sends scrubbed events with tags, through the Sentry SDK', async () => {
    const sent: string[] = [];
    const transport = () => ({
      send: async (envelope: unknown) => {
        sent.push(JSON.stringify(envelope));
        return {};
      },
      flush: async () => true,
    });
    const reporter = new SentryErrorReporter(
      'https://public@o0.ingest.sentry.io/1',
      'test',
      '0.0.0',
      transport,
    );
    Sentry.getIsolationScope().setUser({ email: 'asha@example.com' });
    reporter.capture(new Error('boom'), { route: '/v1/me', status: 500 });
    await Sentry.flush(2000);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toContain('boom');
    expect(sent[0]).toContain('"route":"/v1/me"');
    expect(sent[0]).not.toContain('asha@example.com');
  });
});

describe('request log path', () => {
  it('drops query strings and masks share tokens', () => {
    expect(logPath('/v1/shared/AbCdEfGhIjKlMnOpQrStUv')).toBe('/v1/shared/[token]');
    expect(logPath('/v1/scans?q=secret.example')).toBe('/v1/scans');
    expect(logPath('/v1/scans/123/shares')).toBe('/v1/scans/123/shares');
  });
});
