'use client';

import { useEffect } from 'react';

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

/** Masks secrets that can appear in our own URLs (share-link tokens, auth callback codes). */
export function scrubUrl(url: string): string {
  return url
    .split('#')[0]!
    .split('?')[0]!
    .replace(/\/r\/[^/]+/, '/r/[token]');
}

/**
 * Optional browser error reporting (Sentry), loaded only when NEXT_PUBLIC_SENTRY_DSN is set so it
 * costs nothing otherwise. Sends no user identity, cookies, query strings or share tokens.
 */
export function ErrorMonitoring() {
  useEffect(() => {
    if (!DSN) return;
    void import('@sentry/browser').then((Sentry) => {
      Sentry.init({
        dsn: DSN,
        environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
        tracesSampleRate: 0,
        dataCollection: {
          userInfo: false,
          cookies: false,
          httpHeaders: false,
          httpBodies: [],
          urlQueryParams: false,
        },
        beforeSend(event) {
          delete event.user;
          if (event.request?.url) event.request.url = scrubUrl(event.request.url);
          if (event.request) {
            delete event.request.query_string;
            delete event.request.headers;
            delete event.request.cookies;
          }
          return event;
        },
        beforeBreadcrumb(crumb) {
          if (crumb.data?.url) crumb.data.url = scrubUrl(String(crumb.data.url));
          if (crumb.data?.to) crumb.data.to = scrubUrl(String(crumb.data.to));
          if (crumb.data?.from) crumb.data.from = scrubUrl(String(crumb.data.from));
          // Console and UI-click breadcrumbs can contain typed URLs or emails.
          if (crumb.category === 'console' || crumb.category?.startsWith('ui.')) return null;
          return crumb;
        },
      });
    });
  }, []);
  return null;
}
