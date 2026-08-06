#!/usr/bin/env bash
# Proves migration 0016 closes the escalation chain, against a real Postgres.
#
# Three local-only wrinkles this works around:
#   1. 0015_platform_admins.sql raises unless the two named admin accounts
#      already exist, so a bare `supabase db reset` cannot bootstrap this repo.
#      We reset without 0015/0016, seed the accounts, then apply both by hand.
#   2. 0016 adds a trigger to admin_audit_log, so it must follow 0015.
#   3. The local Supabase image lacks the table grants hosted Supabase gives
#      anon/authenticated. We apply that baseline before the two migrations so
#      the ordering matches production: broad grants exist, migrations remove them.
#
# Usage: supabase start && ./scripts/verify-0016.sh
set -euo pipefail

MIGRATIONS="supabase/migrations"
HOLD="$(mktemp -d)"
HELD=0

restore() {
  if [ "$HELD" = "1" ]; then
    mv -f "$HOLD"/*.sql "$MIGRATIONS"/ 2>/dev/null || true
    HELD=0
  fi
  rmdir "$HOLD" 2>/dev/null || true
}
trap restore EXIT INT TERM

DB=$(docker ps --format '{{.Names}}' | grep -m1 supabase_db || true)
if [ -z "$DB" ]; then
  echo "No supabase_db container running. Run 'supabase start' first." >&2
  exit 1
fi
run() { docker exec -i "$DB" psql -U postgres -d postgres -q "$@"; }

echo "==> Resetting to 0014 (holding back 0015 and 0016)"
mv "$MIGRATIONS/0015_platform_admins.sql" "$MIGRATIONS/0016_escalation_lockdown.sql" "$HOLD"/
HELD=1
supabase db reset > /dev/null 2>&1
restore

echo "==> Seeding the platform-admin accounts 0015 requires"
run <<'SQL'
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_user_meta_data, raw_app_meta_data)
values
  ('99999999-9999-9999-9999-999999999991','00000000-0000-0000-0000-000000000000',
   'authenticated','authenticated','adam.mophat@gmail.com','x',now(),now(),now(),
   '{"role":"coach","display_name":"Admin One"}'::jsonb,'{}'::jsonb),
  ('99999999-9999-9999-9999-999999999992','00000000-0000-0000-0000-000000000000',
   'authenticated','authenticated','mcausey.th@gmail.com','x',now(),now(),now(),
   '{"role":"coach","display_name":"Admin Two"}'::jsonb,'{}'::jsonb)
on conflict (id) do nothing;
SQL

echo "==> Applying hosted-Supabase baseline grants"
run <<'SQL'
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
SQL

echo "==> Applying 0015 then 0016"
run -v ON_ERROR_STOP=1 -f - < "$MIGRATIONS/0015_platform_admins.sql" > /dev/null
run -v ON_ERROR_STOP=1 -f - < "$MIGRATIONS/0016_escalation_lockdown.sql" > /dev/null

echo "==> Running probes"
run -f - < scripts/verify-0016.sql 2>&1 \
  | grep -E "PASS|FAIL|ERROR" \
  | sed 's/^psql:<stdin>:[0-9]*: //; s/^NOTICE:  //'
