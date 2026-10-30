'use client';

import { useEffect, useState } from 'react';
import type { Schemas } from '@weblume/api-client-ts';
import { api } from './api';

export type BillingConfig = Schemas['BillingConfigDtoClass'];

/** Fetches whether paid plans can be bought on the web right now. Null while loading or on error. */
export function useBillingConfig(): BillingConfig | null {
  const [config, setConfig] = useState<BillingConfig | null>(null);
  useEffect(() => {
    let active = true;
    api.GET('/v1/billing/config').then(
      ({ data }) => active && data && setConfig(data),
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, []);
  return config;
}

export const ACCESS_STATUSES = new Set(['trialing', 'active', 'grace_period', 'canceled']);

/** Mirrors subscriptionGrantsAccess in @weblume/shared for display (the server decides access). */
export function grantsAccess(s: { status: string; currentPeriodEnd: string | null }): boolean {
  if (s.status === 'canceled')
    return s.currentPeriodEnd !== null && new Date(s.currentPeriodEnd) > new Date();
  return ACCESS_STATUSES.has(s.status);
}

export function playManageUrl(packageName: string, subscriptionId: string): string {
  return `https://play.google.com/store/account/subscriptions?sku=${encodeURIComponent(subscriptionId)}&package=${encodeURIComponent(packageName)}`;
}
