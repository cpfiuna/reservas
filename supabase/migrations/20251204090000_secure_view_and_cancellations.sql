-- =============================================================================
-- SECURITY FIX: Fix view and enable RLS on cancellations
-- Created: December 4, 2025
-- Description: Addresses Supabase linter errors:
--  - security_definer_view: public.reservations_with_details
--  - rls_disabled_in_public: public.cancellations
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1) FIX SECURITY DEFINER VIEW - Recreate with SECURITY INVOKER
-- =============================================================================

-- Drop the existing view
DROP VIEW IF EXISTS public.reservations_with_details;

-- Recreate the view with SECURITY INVOKER (uses querying user's permissions)
-- This ensures RLS policies are applied based on the actual user making the query
CREATE OR REPLACE VIEW public.reservations_with_details
WITH (security_invoker = true)
AS
SELECT 
    r.*,
    p.full_name as updated_by_name,
    CASE 
        WHEN r.status = 'pending' THEN 'Pendiente'
        WHEN r.status = 'approved' THEN 'Aprobada'
        WHEN r.status = 'rejected' THEN 'Rechazada'
        WHEN r.status = 'cancelled' THEN 'Cancelada'
    END as status_text
FROM public.reservations r
LEFT JOIN public.profiles p ON r.updated_by = p.id;

-- Grant permissions on the view
GRANT SELECT ON public.reservations_with_details TO anon, authenticated;

COMMENT ON VIEW public.reservations_with_details IS 'Read-only view of reservations with human-readable status (SECURITY INVOKER)';

-- =============================================================================
-- 2) ENABLE RLS ON CANCELLATIONS TABLE
-- =============================================================================

-- Enable Row-Level Security on the cancellations audit table
ALTER TABLE IF EXISTS public.cancellations ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 3) ADD RLS POLICIES FOR CANCELLATIONS
-- =============================================================================

-- Drop existing policies if any (idempotent migration)
DROP POLICY IF EXISTS cancellations_insert_by_admins ON public.cancellations;
DROP POLICY IF EXISTS cancellations_select_by_admins ON public.cancellations;
DROP POLICY IF EXISTS cancellations_select_by_all ON public.cancellations;

-- Policy: Authenticated admins can INSERT cancellation audit rows
-- This allows admins to log cancellation events
CREATE POLICY cancellations_insert_by_admins
  ON public.cancellations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Policy: Authenticated admins can SELECT cancellation audit rows
-- This allows admins to view the cancellation history
CREATE POLICY cancellations_select_by_admins
  ON public.cancellations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Optional: Allow users to view cancellations of their own reservations
-- Uncomment if you want users to see cancellation records for their reservations
/*
CREATE POLICY cancellations_select_own
  ON public.cancellations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM public.reservations 
      WHERE reservations.id = cancellations.reservation_id 
      AND reservations.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );
*/

-- Note: We intentionally do NOT create UPDATE or DELETE policies 
-- to keep the cancellations table append-only (immutable audit log)

COMMIT;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- To verify the migration after running:
-- 1) Check view is using SECURITY INVOKER:
--    SELECT viewname, definition FROM pg_views WHERE viewname = 'reservations_with_details';
--
-- 2) Check RLS is enabled on cancellations:
--    SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'cancellations';
--
-- 3) Check policies exist:
--    SELECT policyname, tablename, roles, cmd FROM pg_policies WHERE tablename = 'cancellations';
--
-- 4) Test as admin (should succeed):
--    INSERT INTO public.cancellations (reservation_id, cancelled_by, reason, previous_status)
--    VALUES ((SELECT id FROM public.reservations LIMIT 1), auth.uid(), 'Test cancellation', 'pending');
--
-- 5) Test as non-admin user (should be blocked by RLS)
