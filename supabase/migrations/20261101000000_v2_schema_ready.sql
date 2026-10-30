-- Schema for two features that are out of scope for v1 but planned (BUILD_PROMPT §7):
-- custom branding on PDF reports, and scheduled re-scans with change alerts. Nothing reads or
-- writes these tables yet; the API will be the only writer (no user write policies), as elsewhere.

-- ---------------------------------------------------------------------------
-- Report branding (agency name/logo on PDFs and shared reports)
-- ---------------------------------------------------------------------------
create table public.report_branding (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 100),
  -- Path of the logo in Supabase Storage (bucket chosen when the feature is built), not a URL.
  logo_path text check (char_length(logo_path) <= 500),
  accent_color text check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger report_branding_updated_at before update on public.report_branding
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Scheduled re-scans with change alerts
-- ---------------------------------------------------------------------------
create type public.scan_frequency as enum ('weekly', 'monthly');
create type public.change_alert as enum ('none', 'new_findings', 'score_drop', 'any_change');

create table public.scheduled_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_url text not null check (char_length(target_url) <= 2048),
  normalized_url text not null check (char_length(normalized_url) <= 2048),
  frequency public.scan_frequency not null,
  alert public.change_alert not null default 'new_findings',
  -- For score_drop alerts: minimum drop in any Lighthouse score that triggers an alert.
  score_drop_threshold smallint check (score_drop_threshold between 1 and 100),
  enabled boolean not null default true,
  next_run_at timestamptz not null,
  last_run_at timestamptz,
  last_scan_id uuid references public.scans (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, normalized_url)
);

create index scheduled_scans_due_idx on public.scheduled_scans (next_run_at) where enabled;

create trigger scheduled_scans_updated_at before update on public.scheduled_scans
  for each row execute function public.set_updated_at();

-- Which scheduled run produced a scan (null for scans started by hand).
alter table public.scans
  add column scheduled_scan_id uuid references public.scheduled_scans (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Row Level Security: owners can read their own rows; all writes go through the API.
-- ---------------------------------------------------------------------------
alter table public.report_branding enable row level security;
alter table public.scheduled_scans enable row level security;

create policy report_branding_select_own on public.report_branding
  for select to authenticated using (user_id = (select auth.uid()));
create policy scheduled_scans_select_own on public.scheduled_scans
  for select to authenticated using (user_id = (select auth.uid()));
