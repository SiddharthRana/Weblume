-- Monitoring: scheduled re-scans with change digests (apps/api/src/monitors).
-- Daily runs are a Starter feature; weekly and monthly were already in the enum.
alter type public.scan_frequency add value if not exists 'daily' before 'weekly';

-- When the last change digest was emailed for a monitor, and whether the most recent run was
-- skipped (and why), so the dashboard can explain a missing digest.
alter table public.scheduled_scans
  add column last_digest_at timestamptz,
  add column last_skip_reason text check (char_length(last_skip_reason) <= 64);

-- Digest lookups: the previous finished scan of the same URL for the same user.
create index if not exists scans_user_url_created_idx
  on public.scans (user_id, normalized_url, created_at desc);
create index if not exists scans_scheduled_scan_idx
  on public.scans (scheduled_scan_id) where scheduled_scan_id is not null;
