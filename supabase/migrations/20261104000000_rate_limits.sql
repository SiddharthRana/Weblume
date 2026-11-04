-- Shared rate-limit counters, so every API instance enforces the same per-IP and per-user limits
-- (apps/api/src/common/pg-throttler-storage.ts). Keys are the throttler's SHA-256 hashes, never raw
-- IPs or user ids. Unlogged: no WAL and not replicated; counters lost in a crash just start again.
create unlogged table public.rate_limits (
  key text not null,
  throttler text not null,
  hits integer not null,
  window_ends_at timestamptz not null,
  blocked_until timestamptz,
  primary key (key, throttler)
);

create index rate_limits_window_ends_at_idx on public.rate_limits (window_ends_at);

-- API only: no user policies, and no access through the Data API.
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- Counts one request in a fixed window and reports whether the caller is blocked. One statement, so
-- concurrent requests for the same key are serialised by the row lock. While blocked, requests
-- aren't counted; after the block (or the window) ends, counting starts again from 1.
create function public.rate_limit_hit(
  p_key text,
  p_throttler text,
  p_ttl_ms integer,
  p_limit integer,
  p_block_ms integer
)
returns table (total_hits integer, ms_to_expire integer, is_blocked boolean, ms_to_block_expire integer)
language plpgsql
set search_path = ''
as $$
declare
  ts timestamptz := clock_timestamp();
  r public.rate_limits;
begin
  insert into public.rate_limits as t (key, throttler, hits, window_ends_at)
  values (p_key, p_throttler, 1, ts + make_interval(secs => p_ttl_ms / 1000.0))
  on conflict (key, throttler) do update set
    hits = case
      when t.blocked_until > ts then t.hits
      when t.window_ends_at <= ts or t.blocked_until is not null then 1
      else t.hits + 1
    end,
    window_ends_at = case
      when t.blocked_until > ts then t.window_ends_at
      when t.window_ends_at <= ts or t.blocked_until is not null
        then ts + make_interval(secs => p_ttl_ms / 1000.0)
      else t.window_ends_at
    end,
    blocked_until = case when t.blocked_until > ts then t.blocked_until end
  returning * into r;

  if r.blocked_until is null and r.hits > p_limit then
    update public.rate_limits
      set blocked_until = ts + make_interval(secs => p_block_ms / 1000.0)
      where key = p_key and throttler = p_throttler
      returning * into r;
  end if;

  return query select
    r.hits,
    greatest(0, ceil(extract(epoch from r.window_ends_at - ts) * 1000))::integer,
    r.blocked_until is not null,
    coalesce(greatest(0, ceil(extract(epoch from r.blocked_until - ts) * 1000)), 0)::integer;
end;
$$;

revoke execute on function public.rate_limit_hit(text, text, integer, integer, integer)
  from public, anon, authenticated;
