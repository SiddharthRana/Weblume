import {
  MONITOR_FREQUENCIES,
  monitorFrequencyAllowed,
  type MonitorAlert,
  type MonitorFrequency,
} from '@weblume/shared';
import type { Schemas } from '@weblume/api-client-ts';

export type Monitor = Schemas['MonitorDto'];
export type MonitorList = Schemas['MonitorListResponse'];

export const FREQUENCY_LABELS: Record<MonitorFrequency, string> = {
  daily: 'Every day',
  weekly: 'Every week',
  monthly: 'Every month',
};

export const ALERT_LABELS: Record<MonitorAlert, string> = {
  any_change: 'Anything changes',
  new_findings: 'New issues appear',
  score_drop: 'A score drops',
  none: 'Never (just scan)',
};

const SKIP_LABELS: Record<string, string> = {
  plan: 'Paused: your plan doesn’t include monitoring.',
  plan_limit: 'Paused: your plan includes fewer monitored sites.',
  previous_run_active: 'The last run was skipped because the one before was still going.',
};

export function skipMessage(reason: string | null | undefined): string | null {
  return reason ? (SKIP_LABELS[reason] ?? null) : null;
}

/** Frequencies the plan allows, fastest first. */
export function allowedFrequencies(fastest: MonitorFrequency | null): MonitorFrequency[] {
  return MONITOR_FREQUENCIES.filter((f) =>
    monitorFrequencyAllowed({ monitorFrequency: fastest, monitoredSites: 1 }, f),
  );
}
