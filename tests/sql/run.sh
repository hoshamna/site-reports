#!/usr/bin/env bash
# Runs the Supabase setup scripts on a throwaway Postgres database and checks the rules.
# Needs a Postgres 15+ server; connection from the usual PG* variables (PGHOST, PGPORT, PGUSER, PGPASSWORD).
set -euo pipefail
cd "$(dirname "$0")"
SB=../../source/supabase
DB="aseel_test_$$"
psql -q -d postgres -c "create database $DB" >/dev/null
trap 'psql -q -d postgres -c "drop database if exists $DB" >/dev/null' EXIT
run() { PGOPTIONS='-c client_min_messages=warning' psql -q -v ON_ERROR_STOP=1 -d "$DB" "$@" >/dev/null; }
run -f supabase-stub.sql
run -f "$SB/security-setup.sql"
run -f "$SB/security-setup.sql"   # must be safe to run twice
grep -v 'pg_cron\|cron\.schedule' "$SB/backup-setup.sql" > "/tmp/backup-nocron-$$.sql"   # pg_cron is not in plain Postgres
run -f "/tmp/backup-nocron-$$.sql"; rm -f "/tmp/backup-nocron-$$.sql"
grep -v 'pg_net\|pg_cron\|cron\.\|net\.http_post\|^  \|^\$job\$' "$SB/reminders-setup.sql" > "/tmp/rem-$$.sql"; run -f "/tmp/rem-$$.sql"; rm -f "/tmp/rem-$$.sql"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f checks.sql 2>&1 | sed -n -e 's/^.*NOTICE:  //p' -e 's/^.*ERROR:  /❌ /p'; [ "${PIPESTATUS[0]}" -eq 0 ] || exit 1
echo "SQL checks passed"
