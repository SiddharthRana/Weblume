-- Weblume initial schema.
-- Conventions: snake_case, uuid PKs, timestamptz everywhere, RLS enabled on every table.
-- The NestJS API connects with a privileged role and performs authorisation itself;
-- RLS is a second layer protecting anything that talks to PostgREST with a user JWT.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.scan_status as enum ('queued', 'running', 'completed', 'partial', 'failed');
create type public.severity as enum ('critical', 'high', 'medium', 'low', 'info');
create type public.audit_category as enum ('performance', 'seo', 'accessibility', 'technical');
create type public.finding_kind as enum ('measured', 'detected', 'recommendation');
create type public.plan_id as enum ('guest', 'free', 'starter');
create type public.payment_provider as enum ('google_play', 'paddle', 'lemonsqueezy', 'dodo');
create type public.subscription_status as enum (
  'trialing', 'active', 'grace_period', 'on_hold', 'paused', 'canceled', 'expired', 'refunded'
);
create type public.webhook_status as enum ('received', 'processed', 'ignored', 'failed');

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 100),
  -- Requested deletion is processed asynchronously (see docs/privacy-data-map.md).
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile automatically for every new auth user.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger-only function: nobody should be able to call it directly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Scans
-- ---------------------------------------------------------------------------
create table public.scans (
  id uuid primary key default gen_random_uuid(),
  -- Null for guest scans until claimed into an account.
  user_id uuid references auth.users (id) on delete cascade,
  -- SHA-256 of (salt || client IP) for guest quota; never the raw IP.
  guest_key_hash text,
  -- SHA-256 of the one-time claim token handed to the guest client.
  claim_token_hash text,
  target_url text not null check (char_length(target_url) <= 2048),
  normalized_url text not null check (char_length(normalized_url) <= 2048),
  final_url text check (char_length(final_url) <= 2048),
  status public.scan_status not null default 'queued',
  failure_code text,
  failure_message text,
  -- Per-source outcome, e.g. {"psi_mobile": {"status": "ok"}, "psi_desktop": {"status": "unavailable", "reason": "not_configured"}}
  sources jsonb not null default '{}'::jsonb,
  -- Lighthouse category scores as returned by PSI, per strategy. Null when PSI didn't run.
  lighthouse jsonb,
  -- Denormalised finding counts by severity for fast history lists.
  severity_counts jsonb not null default '{}'::jsonb,
  counts_toward_quota boolean not null default true,
  started_at timestamptz,
  completed_at timestamptz,
  -- Retention deadline derived from the owner's plan at creation time.
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scans_owner_present check (user_id is not null or guest_key_hash is not null)
);

create index scans_user_created_idx on public.scans (user_id, created_at desc);
create index scans_user_url_idx on public.scans (user_id, normalized_url, created_at desc);
create index scans_guest_created_idx on public.scans (guest_key_hash, created_at desc)
  where guest_key_hash is not null;
create index scans_expires_idx on public.scans (expires_at);

create trigger scans_updated_at before update on public.scans
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Findings
-- ---------------------------------------------------------------------------
create table public.findings (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scans (id) on delete cascade,
  -- Stable check identifier from packages/shared/checks (e.g. 'seo.title.missing') or 'lighthouse.<audit-id>'.
  check_id text not null check (char_length(check_id) <= 200),
  category public.audit_category not null,
  severity public.severity not null,
  kind public.finding_kind not null,
  source text not null,
  -- Check-specific evidence (e.g. offending element, measured value). Never full page HTML.
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index findings_scan_idx on public.findings (scan_id, severity);

-- ---------------------------------------------------------------------------
-- Subscriptions (one row per provider subscription)
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider public.payment_provider not null,
  provider_subscription_id text not null,
  provider_customer_id text,
  product_id text not null,
  plan_id public.plan_id not null,
  status public.subscription_status not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  -- Timestamp of the provider event that produced this state; used to ignore out-of-order events.
  last_event_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subscription_id)
);

create index subscriptions_user_idx on public.subscriptions (user_id, status);

create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Share links (store only a hash of the token)
-- ---------------------------------------------------------------------------
create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scans (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index share_links_scan_idx on public.share_links (scan_id);

-- ---------------------------------------------------------------------------
-- Webhook events (idempotency + audit trail; payload purged after 30 days)
-- ---------------------------------------------------------------------------
create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider public.payment_provider not null,
  event_id text not null,
  event_type text not null,
  status public.webhook_status not null default 'received',
  error text,
  payload jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, event_id)
);

-- ---------------------------------------------------------------------------
-- Feature flags / kill switches (service role only)
-- ---------------------------------------------------------------------------
create table public.feature_flags (
  key text primary key,
  enabled boolean not null,
  description text,
  updated_at timestamptz not null default now()
);

create trigger feature_flags_updated_at before update on public.feature_flags
  for each row execute function public.set_updated_at();

insert into public.feature_flags (key, enabled, description) values
  ('guest_scans', true, 'Allow scans without an account'),
  ('psi', true, 'Call Google PageSpeed Insights during scans'),
  ('link_check', true, 'Check links found on the scanned page'),
  ('billing', false, 'Enable paid plans and checkout');

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.scans enable row level security;
alter table public.findings enable row level security;
alter table public.subscriptions enable row level security;
alter table public.share_links enable row level security;
alter table public.webhook_events enable row level security;
alter table public.feature_flags enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy scans_select_own on public.scans
  for select to authenticated using (user_id = (select auth.uid()));

create policy findings_select_own on public.findings
  for select to authenticated using (
    exists (select 1 from public.scans s where s.id = scan_id and s.user_id = (select auth.uid()))
  );

create policy subscriptions_select_own on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

create policy share_links_select_own on public.share_links
  for select to authenticated using (created_by = (select auth.uid()));

-- webhook_events and feature_flags intentionally have no policies: only privileged roles can access them.
-- All writes go through the API, so no insert/update/delete policies are granted to end users
-- except profile updates.
