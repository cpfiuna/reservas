-- =============================================================================
-- SECURITY FIX: Add search_path to all functions
-- Created: December 4, 2025
-- Description: Addresses Supabase linter warning "function_search_path_mutable"
--              by setting explicit search_path on all public functions to prevent
--              potential security vulnerabilities from search path injection attacks.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1) FIX is_admin FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = user_id
        AND is_admin = true
    );
$$;

-- =============================================================================
-- 2) FIX get_profile_by_user_id FUNCTION
-- =============================================================================

-- Drop and recreate (changing function attributes requires drop)
DROP FUNCTION IF EXISTS public.get_profile_by_user_id(UUID);

CREATE FUNCTION public.get_profile_by_user_id(user_id UUID)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    is_admin BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $$
    SELECT id, full_name, is_admin, created_at
    FROM public.profiles
    WHERE id = user_id;
$$;

-- =============================================================================
-- 3) FIX is_admin_email FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin_email(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  user_id UUID;
  admin_status BOOLEAN;
BEGIN
  -- First, find the user ID from auth.users by email
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;
  
  -- If no user found, return null
  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Check if user has admin privileges in profiles table
  SELECT is_admin INTO admin_status
  FROM public.profiles
  WHERE id = user_id;
  
  -- If profile doesn't exist, return false (user exists but no profile)
  IF admin_status IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Return the admin status
  RETURN admin_status;
END;
$$;

-- =============================================================================
-- 4) FIX set_updated_at FUNCTION (TRIGGER FUNCTION)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- =============================================================================
-- 5) FIX update_updated_at_column FUNCTION (TRIGGER FUNCTION)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

COMMIT;

-- =============================================================================
-- NOTES ON REMAINING WARNINGS
-- =============================================================================

-- The following functions were flagged but not found in migrations:
-- - delete_overlapping_reservations: May be created via Supabase UI or another tool
-- - handle_new_user: Likely an Auth trigger function (check Supabase Dashboard > Auth > Hooks)
-- - send_reservation_confirmation: May be in Edge Functions or created separately
--
-- If these functions exist, apply the same fix pattern:
--   ADD: SET search_path = public, pg_catalog
--   to the function definition
--
-- Example for missing functions:
/*
CREATE OR REPLACE FUNCTION public.delete_overlapping_reservations(...)
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog  -- ADD THIS LINE
AS $$
BEGIN
    -- function body
END;
$$;
*/

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- To verify the fix after running:
-- 1) Check all functions have search_path set:
--    SELECT 
--      proname as function_name,
--      prosrc as source,
--      proconfig as config_settings
--    FROM pg_proc 
--    WHERE pronamespace = 'public'::regnamespace
--    AND proname IN (
--      'is_admin', 
--      'get_profile_by_user_id', 
--      'is_admin_email', 
--      'set_updated_at',
--      'update_updated_at_column'
--    );
--
-- 2) Verify search_path is set (should see '{search_path=public,pg_catalog}'):
--    SELECT proname, proconfig FROM pg_proc WHERE proname LIKE '%admin%';
