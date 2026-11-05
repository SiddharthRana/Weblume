'use client';

import { useEffect, useState } from 'react';
import type { Schemas } from '@weblume/api-client-ts';
import { api } from './api';

export type BillingConfig = Schemas['BillingConfigDtoClass'];

/**
 * Whether paid plans can be bought on the web right now. `failed` is true when the API couldn't be
 * reached or answered with an error (for example, before the production API exists), so callers
 * can say so instead of waiting forever. Gives up after 10 seconds.
 */
export function useBillingConfigStatus(): { config: BillingConfig | null; failed: boolean } {
  const [state, setState] = useState<{ config: BillingConfig | null; failed: boolean }>({
    config: null,
    failed: false,
  });
  useEffect(() => {
    let active = true;
    api.GET('/v1/billing/config', { signal: AbortSignal.timeout(10_000) }).then(
      ({ data }) => active && setState({ config: data ?? null, failed: !data }),
      () => active && setState({ config: null, failed: true }),
    );
    return () => {
      active = false;
    };
  }, []);
  return state;
}

/** The billing config, or null while loading or when unavailable. */
export function useBillingConfig(): BillingConfig | null {
  return useBillingConfigStatus().config;
}

export const ACCESS_STATUSES = new Set(['trialing', 'active', 'grace_period', 'canceled']);

/** Mirrors subscriptionGrantsAccess in @weblume/shared for display (the server decides access). */
export function grantsAccess(s: { status: string; currentPeriodEnd: string | null }): boolean {
  if (s.status === 'canceled')
    return s.currentPeriodEnd !== null && new Date(s.currentPeriodEnd) > new Date();
  return ACCESS_STATUSES.has(s.status);
}

/**
 * Subscriptions worth showing: ones that give access, plus on hold or paused ones the person may act
 * on. Ended ones (including declined checkout attempts, which the provider records as subscriptions
 * that never started) stay in the data export but aren't listed.
 */
export function isCurrent(s: { status: string; currentPeriodEnd: string | null }): boolean {
  return grantsAccess(s) || s.status === 'on_hold' || s.status === 'paused';
}

export function playManageUrl(packageName: string, subscriptionId: string): string {
  return `https://play.google.com/store/account/subscriptions?sku=${encodeURIComponent(subscriptionId)}&package=${encodeURIComponent(packageName)}`;
}
