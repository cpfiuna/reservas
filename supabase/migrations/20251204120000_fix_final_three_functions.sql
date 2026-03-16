-- =============================================================================
-- SECURITY FIX: Add search_path to final three functions
-- Created: December 4, 2025
-- Description: Fixes the last 3 functions flagged by Supabase linter:
--   - delete_overlapping_reservations
--   - handle_new_user
--   - send_reservation_confirmation
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1) FIX delete_overlapping_reservations FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.delete_overlapping_reservations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
BEGIN
  -- Delete reservations that overlap with the blocked period
  DELETE FROM public.reservations
  WHERE fecha = NEW.fecha
  AND (
    -- Check time overlap if times are specified
    (NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL AND
     inicio < NEW.end_time AND fin > NEW.start_time)
    -- If no times specified, delete all reservations for the date
    OR (NEW.start_time IS NULL AND NEW.end_time IS NULL)
  );
  
  RETURN NEW;
END;
$function$;

-- =============================================================================
-- 2) FIX handle_new_user FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, is_admin)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Admin User'), 
    true
  )
  ON CONFLICT (id) 
  DO UPDATE SET is_admin = true;
  
  RETURN new;
END;
$function$;

-- =============================================================================
-- 3) FIX send_reservation_confirmation FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.send_reservation_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
BEGIN
  -- In a real scenario, you would trigger an email sending process here
  -- For demonstration purposes, we're just logging
  RAISE NOTICE 'Sending confirmation email to % for reservation on %', NEW.email, NEW.fecha;
  RETURN NEW;
END;
$function$;

COMMIT;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify all three functions now have search_path set:
-- Run this query to confirm:
/*
SELECT 
  proname as function_name,
  proconfig as settings
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace 
AND proname IN ('delete_overlapping_reservations', 'handle_new_user', 'send_reservation_confirmation')
ORDER BY proname;
*/

-- Expected output: Each function should show settings = {search_path=public,pg_catalog}
