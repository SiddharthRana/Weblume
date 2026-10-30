#!/usr/bin/env bash
# (Re)creates the `weblume_test` database with the Supabase auth stub and all migrations,
# for API integration tests: TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/weblume_test
set -euo pipefail
ADMIN_URL="${DB_ADMIN_URL:-postgres://postgres:postgres@localhost:5432/postgres}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET_URL="${ADMIN_URL%/*}/weblume_test"
psql "$ADMIN_URL" -q -v ON_ERROR_STOP=1 -c "drop database if exists weblume_test with (force);" -c "create database weblume_test;"
psql "$TARGET_URL" -q -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/auth_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do psql "$TARGET_URL" -q -v ON_ERROR_STOP=1 -f "$f"; done
echo "Test database ready: $TARGET_URL"
