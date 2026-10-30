-- Phase 2: scan engine support.

-- Checks that ran and passed, so reports can show coverage (not only failures).
alter table public.scans add column passed_checks text[] not null default '{}';

-- A retry links back to the failed scan it replaces.
alter table public.scans add column retry_of uuid references public.scans (id) on delete set null;

-- Lighthouse results from PageSpeed Insights, cached per normalised URL + strategy to avoid
-- redundant API calls (see PSI_CACHE_TTL_HOURS). Holds trimmed results, not raw responses.
create table public.psi_cache (
  normalized_url text not null check (char_length(normalized_url) <= 2048),
  strategy text not null check (strategy in ('mobile', 'desktop')),
  result jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (normalized_url, strategy)
);

create index psi_cache_fetched_idx on public.psi_cache (fetched_at);

-- Service-only table: no policies for end users.
alter table public.psi_cache enable row level security;
