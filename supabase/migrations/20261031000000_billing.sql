-- Phase 5: billing.

-- Opaque account reference sent to the provider at purchase time (Google Play obfuscatedAccountId,
-- or the user id echoed back in web checkout custom data). Lets us map provider events to users.
alter table public.subscriptions add column provider_account_ref text;
create index subscriptions_account_ref_idx on public.subscriptions (provider, provider_account_ref);

-- Google Play purchase tokens are replaced on resubscribe/upgrade; keep the link to the previous one.
alter table public.subscriptions add column linked_provider_subscription_id text;

-- Billing period interval for display ('monthly' | 'annual').
alter table public.subscriptions add column billing_interval text check (billing_interval in ('monthly', 'annual'));

-- The opaque account reference given to Google Play (HMAC of the user id), stored so Real-time
-- Developer Notifications for a first purchase can be matched to the user before the app reports it.
alter table public.profiles add column billing_account_ref text unique;
