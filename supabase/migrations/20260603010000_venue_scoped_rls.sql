-- =============================================================================
-- VENUE-SCOPED RLS (Phase 2)
-- Created: June 3, 2026
-- Description: Introduces per-venue authorization so an admin of one venue
--   cannot read or modify another venue's data. Builds on the Phase 1
--   foundation (venues, admin_venues, profiles.is_super_admin, venue_id columns).
--
-- SAFETY / NON-BREAKING NOTES:
--   * Every existing admin was assigned to the quincho venue in Phase 1 and all
--     existing rows are quincho, so these venue-scoped policies behave EXACTLY
--     like the previous is_admin checks for the current single-venue setup.
--   * Public (anon) SELECT on reservations / blocked_dates / settings is left
--     PERMISSIVE here on purpose. The frontend still reads occupied slots from
--     the reservations table until Phase 3 switches it to the new non-PII
--     `availability` view. A follow-up migration at the end of Phase 3 will
--     tighten the public reservations SELECT. This keeps production working
--     between phases.
--   * Wrapped in a single transaction: it either fully applies or rolls back.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Authorization helper functions
--    SECURITY DEFINER + fixed search_path so they can be safely called from RLS
--    policies. STABLE because they only read within a single statement.
-- -----------------------------------------------------------------------------

-- True when the current user is a super-admin (manages every venue).
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND is_super_admin = true
    );
$$;

-- True when the current user may manage the given venue: either a super-admin,
-- or explicitly assigned to that venue via admin_venues.
-- NOTE: admin_has_venue(NULL) returns true only for super-admins, which is the
-- desired behavior for nullable venue_id rows (e.g. legacy / global audit rows).
CREATE OR REPLACE FUNCTION public.admin_has_venue(p_venue_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_super_admin()
        OR EXISTS (
            SELECT 1
            FROM public.admin_venues av
            WHERE av.admin_id = auth.uid()
              AND av.venue_id = p_venue_id
        );
$$;

-- -----------------------------------------------------------------------------
-- 2. Non-PII availability view for public reads
--    Exposes only what the booking UI needs to render occupied slots:
--    venue_id + date + time range + status. No responsable / email / motivo /
--    admin_notes / affiliation / tokens. Runs with the view owner's privileges
--    (security_invoker = false) so anon can read availability WITHOUT being
--    granted access to the underlying reservations rows.
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.availability;
CREATE VIEW public.availability
WITH (security_invoker = false) AS
    SELECT
        venue_id,
        fecha,
        inicio,
        fin,
        status
    FROM public.reservations
    WHERE status NOT IN ('cancelled', 'rejected');

COMMENT ON VIEW public.availability IS
    'Non-PII view of occupied reservation slots for public booking UI. '
    'Bypasses reservations RLS by design; exposes no personal data.';

REVOKE ALL ON public.availability FROM PUBLIC;
GRANT SELECT ON public.availability TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. reservations: venue-scope the admin WRITE policies
--    (Public INSERT and public SELECT are intentionally left as-is for now.)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Only admins can update reservations" ON public.reservations;
CREATE POLICY "reservations_update_venue_admins"
    ON public.reservations FOR UPDATE TO authenticated
    USING (public.admin_has_venue(venue_id))
    WITH CHECK (public.admin_has_venue(venue_id));

DROP POLICY IF EXISTS "Only admins can delete reservations" ON public.reservations;
CREATE POLICY "reservations_delete_venue_admins"
    ON public.reservations FOR DELETE TO authenticated
    USING (public.admin_has_venue(venue_id));

-- -----------------------------------------------------------------------------
-- 4. blocked_dates: venue-scope insert / update / delete
--    (Public SELECT stays open; blocked dates carry no personal data.)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "blocked_dates_insert_admins" ON public.blocked_dates;
CREATE POLICY "blocked_dates_insert_venue_admins"
    ON public.blocked_dates FOR INSERT TO authenticated
    WITH CHECK (public.admin_has_venue(venue_id));

DROP POLICY IF EXISTS "blocked_dates_update_admins" ON public.blocked_dates;
CREATE POLICY "blocked_dates_update_venue_admins"
    ON public.blocked_dates FOR UPDATE TO authenticated
    USING (public.admin_has_venue(venue_id))
    WITH CHECK (public.admin_has_venue(venue_id));

DROP POLICY IF EXISTS "blocked_dates_delete_admins" ON public.blocked_dates;
CREATE POLICY "blocked_dates_delete_venue_admins"
    ON public.blocked_dates FOR DELETE TO authenticated
    USING (public.admin_has_venue(venue_id));

-- -----------------------------------------------------------------------------
-- 5. cancellations (audit log): venue-scope select / insert
--    venue_id may be NULL on legacy rows -> only super-admins see/insert those.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "cancellations_insert_by_admins" ON public.cancellations;
CREATE POLICY "cancellations_insert_venue_admins"
    ON public.cancellations FOR INSERT TO authenticated
    WITH CHECK (public.admin_has_venue(venue_id));

DROP POLICY IF EXISTS "cancellations_select_by_admins" ON public.cancellations;
CREATE POLICY "cancellations_select_venue_admins"
    ON public.cancellations FOR SELECT TO authenticated
    USING (public.admin_has_venue(venue_id));

-- -----------------------------------------------------------------------------
-- 6. settings: venue-scope updates
--    Global settings (venue_id IS NULL) become super-admin only; per-venue
--    settings require that venue. The app never UPDATEs settings (read-only
--    health check), so this is safe. Public SELECT stays open.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Only admins can update settings" ON public.settings;
CREATE POLICY "settings_update_venue_admins"
    ON public.settings FOR UPDATE TO authenticated
    USING (public.admin_has_venue(venue_id))
    WITH CHECK (public.admin_has_venue(venue_id));

-- -----------------------------------------------------------------------------
-- 7. venues / admin_venues: super-admin-only writes
--    SELECT policies were created in Phase 1. Without write policies, only the
--    service_role (which bypasses RLS) could change them; these add an explicit
--    super-admin path for the future management UI. Safe: nobody is a
--    super-admin yet, so behavior is unchanged (service-role-only) today.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "venues_write_super" ON public.venues;
CREATE POLICY "venues_write_super"
    ON public.venues FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "admin_venues_write_super" ON public.admin_venues;
CREATE POLICY "admin_venues_write_super"
    ON public.admin_venues FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

COMMIT;
