# Backup and restore

## What Supabase provides

- **Daily backups** on paid plans (Pro and up), kept for 7+ days depending on plan; Point-in-Time Recovery is an add-on. The free tier does **not** include downloadable backups, so take your own (below) until you're on a paid plan.
- Check the current details in the Supabase dashboard → Database → Backups before relying on them.

## Taking your own logical backup

Use the **direct** (non-pooled) connection string from Supabase → Project Settings → Database. Keep the dump somewhere encrypted and access-controlled: it contains user data.

```bash
# Schema + data of the app schema (auth is managed by Supabase; back it up separately if needed)
pg_dump "$DIRECT_DATABASE_URL" --schema=public --format=custom --no-owner --file="weblume-$(date +%F).dump"
```

Or with the Supabase CLI:

```bash
supabase db dump --linked -f schema.sql
supabase db dump --linked --data-only -f data.sql
```

## Restore test (do this at least once before launch, then quarterly)

Restore into a **local** database, never into production first:

```bash
createdb weblume_restore_test
psql weblume_restore_test -f supabase/tests/auth_stub.sql     # stub auth schema for plain Postgres
pg_restore --no-owner --dbname=weblume_restore_test weblume-YYYY-MM-DD.dump
psql weblume_restore_test -c "select count(*) from public.scans;"
dropdb weblume_restore_test
```

Record the date and result in `docs/PROGRESS.md`.

## Migrations

- Every schema change is a new file in `supabase/migrations/` and is verified by `pnpm db:verify` in CI.
- Apply to production with `supabase db push` (after `supabase link`). Take a backup first.
- Never edit an applied migration; write a new one.
