// Drizzle table definitions mirroring supabase/migrations (the schema source of truth).
// Only the tables and columns the API uses are declared.
import {
  boolean,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type {
  PlanId,
  SubscriptionStatus,
  AuditCategory,
  FindingKind,
  LighthouseByStrategy,
  ScanStatus,
  Severity,
  SeverityCounts,
  SourcesMap,
} from '@weblume/shared';

export const scanStatus = pgEnum('scan_status', [
  'queued',
  'running',
  'completed',
  'partial',
  'failed',
]);
export const severity = pgEnum('severity', ['critical', 'high', 'medium', 'low', 'info']);
export const auditCategory = pgEnum('audit_category', [
  'performance',
  'seo',
  'accessibility',
  'technical',
]);
export const findingKind = pgEnum('finding_kind', ['measured', 'detected', 'recommendation']);

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

export const scans = pgTable('scans', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),
  guestKeyHash: text('guest_key_hash'),
  claimTokenHash: text('claim_token_hash'),
  targetUrl: text('target_url').notNull(),
  normalizedUrl: text('normalized_url').notNull(),
  finalUrl: text('final_url'),
  status: scanStatus('status').$type<ScanStatus>().notNull().default('queued'),
  failureCode: text('failure_code'),
  failureMessage: text('failure_message'),
  sources: jsonb('sources').$type<SourcesMap>().notNull().default({}),
  lighthouse: jsonb('lighthouse').$type<LighthouseByStrategy>(),
  severityCounts: jsonb('severity_counts').$type<SeverityCounts>().notNull().default({}),
  passedChecks: text('passed_checks').array().notNull().default([]),
  countsTowardQuota: boolean('counts_toward_quota').notNull().default(true),
  retryOf: uuid('retry_of'),
  startedAt: ts('started_at'),
  completedAt: ts('completed_at'),
  expiresAt: ts('expires_at').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

export const findings = pgTable('findings', {
  id: uuid('id').primaryKey().defaultRandom(),
  scanId: uuid('scan_id').notNull(),
  checkId: text('check_id').notNull(),
  category: auditCategory('category').$type<AuditCategory>().notNull(),
  severity: severity('severity').$type<Severity>().notNull(),
  kind: findingKind('kind').$type<FindingKind>().notNull(),
  source: text('source').notNull(),
  details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const psiCache = pgTable(
  'psi_cache',
  {
    normalizedUrl: text('normalized_url').notNull(),
    strategy: text('strategy').$type<'mobile' | 'desktop'>().notNull(),
    result: jsonb('result').notNull(),
    fetchedAt: ts('fetched_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.normalizedUrl, t.strategy] })],
);

export const featureFlags = pgTable('feature_flags', {
  key: text('key').primaryKey(),
  enabled: boolean('enabled').notNull(),
});

export type ScanRow = typeof scans.$inferSelect;
export type FindingRow = typeof findings.$inferSelect;

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  displayName: text('display_name'),
  deletionRequestedAt: ts('deletion_requested_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  provider: text('provider').notNull(),
  providerSubscriptionId: text('provider_subscription_id').notNull(),
  productId: text('product_id').notNull(),
  planId: text('plan_id').$type<PlanId>().notNull(),
  status: text('status').$type<SubscriptionStatus>().notNull(),
  currentPeriodStart: ts('current_period_start'),
  currentPeriodEnd: ts('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  lastEventAt: ts('last_event_at').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

export const shareLinks = pgTable('share_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  scanId: uuid('scan_id').notNull(),
  createdBy: uuid('created_by').notNull(),
});

export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  payload: jsonb('payload'),
  receivedAt: ts('received_at').notNull().defaultNow(),
});

export type SubscriptionRow = typeof subscriptions.$inferSelect;
