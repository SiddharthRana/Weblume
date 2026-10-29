#!/usr/bin/env bash
# Applies all Supabase migrations to a throwaway database on a plain PostgreSQL server
# (with a stub `auth` schema) and runs the RLS tests. Used by CI and when Docker/Supabase
# CLI isn't available. Requires `psql` and an admin connection URL.
#
#   DB_ADMIN_URL=postgres://postgres:postgres@localhost:5432/postgres pnpm db:verify
set -euo pipefail

ADMIN_URL="${DB_ADMIN_URL:-postgres://postgres:postgres@localhost:5432/postgres}"
DB_NAME="weblume_verify_$$"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET_URL="${ADMIN_URL%/*}/${DB_NAME}"

cleanup() { psql "$ADMIN_URL" -q -c "drop database if exists ${DB_NAME} with (force);" >/dev/null 2>&1 || true; }
trap cleanup EXIT

psql "$ADMIN_URL" -q -v ON_ERROR_STOP=1 -c "create database ${DB_NAME};"
psql "$TARGET_URL" -q -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/auth_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "Applying $(basename "$f")"
  psql "$TARGET_URL" -q -v ON_ERROR_STOP=1 -f "$f"
done
psql "$TARGET_URL" -q -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/rls_test.sql"
echo "Database verification passed."
