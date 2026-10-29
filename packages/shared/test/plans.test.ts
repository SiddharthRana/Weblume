import { describe, expect, it } from 'vitest';
import { PLAN_IDS, PLANS, formatPrice, compareSeverity, SEVERITIES } from '../src/index.js';

describe('plan configuration', () => {
  it('defines every plan id with a matching id field', () => {
    for (const id of PLAN_IDS) expect(PLANS[id].id).toBe(id);
  });

  it('gives paid plans display prices and free plans none', () => {
    for (const plan of Object.values(PLANS)) {
      if (plan.paid) expect(plan.displayPrices?.length).toBeGreaterThan(0);
      else expect(plan.displayPrices).toBeUndefined();
    }
  });

  it('never offers unlimited scanning', () => {
    for (const plan of Object.values(PLANS)) {
      expect(Number.isFinite(plan.entitlements.scansPerPeriod)).toBe(true);
      expect(plan.entitlements.scansPerPeriod).toBeGreaterThan(0);
    }
  });

  it('keeps higher tiers at least as generous as lower ones', () => {
    const [guest, free, starter] = [PLANS.guest, PLANS.free, PLANS.starter].map(
      (p) => p.entitlements,
    );
    expect(free!.retentionDays).toBeGreaterThanOrEqual(guest!.retentionDays);
    expect(starter!.retentionDays).toBeGreaterThanOrEqual(free!.retentionDays);
    expect(starter!.scansPerPeriod).toBeGreaterThan(free!.scansPerPeriod);
  });

  it('annual price is cheaper than 12 monthly payments', () => {
    for (const price of PLANS.starter.displayPrices ?? []) {
      expect(price.annual).toBeLessThan(price.monthly * 12);
    }
  });
});

describe('formatPrice', () => {
  it('formats INR and USD from minor units', () => {
    expect(formatPrice(14900, 'INR', 'en-IN')).toBe('₹149');
    expect(formatPrice(399, 'USD', 'en-US')).toBe('$3.99');
  });
});

describe('severity ordering', () => {
  it('sorts most severe first', () => {
    const shuffled = ['low', 'critical', 'info', 'high', 'medium'] as const;
    expect([...shuffled].sort(compareSeverity)).toEqual([...SEVERITIES]);
  });
});
