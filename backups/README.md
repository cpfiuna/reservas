# Pre-migration backups (manual)

Free-plan Supabase has no point-in-time recovery, so these JSON snapshots are a
manual safety net taken before the multi-venue Phase 1 migration
(`supabase/migrations/20260603000000_add_multi_venue_foundation.sql`).

## How these were produced

For each table, run the query below in the Supabase SQL Editor and paste the
single `data` cell (a JSON array) into the matching file.

```sql
-- reservations  -> backup_reservations.json
select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at), '[]'::jsonb) as data from public.reservations r;
-- blocked_dates -> backup_blocked_dates.json
select coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb) as data from public.blocked_dates b;
-- cancellations -> backup_cancellations.json
select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) as data from public.cancellations c;
-- profiles      -> backup_profiles.json
select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) as data from public.profiles p;
-- settings      -> backup_settings.json
select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) as data from public.settings s;
```

> NOTE: Do NOT paste a JSON result back into the SQL Editor - that causes
> `syntax error at or near "["`. Clear the editor and run only one SQL query.

These files contain personal data (names, emails) and are git-ignored.
