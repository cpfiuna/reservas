-- =============================================================================
-- PERFORMANCE FIX: Consolidate profiles UPDATE policies
-- Created: December 4, 2025
-- Description: Fixes the last performance warning by consolidating the two
--              UPDATE policies on profiles table into a single policy
-- =============================================================================

BEGIN;

-- =============================================================================
-- PROFILES TABLE - Consolidate UPDATE policies
-- =============================================================================

-- Drop the two existing UPDATE policies
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can update profiles" ON public.profiles;

-- Create a single consolidated policy that handles both cases:
-- 1. Users can update their own profile
-- 2. Admins can update any profile
CREATE POLICY "profiles_update_self_or_admin"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    -- Allow if user is updating their own profile
    (SELECT auth.uid()) = id
    OR
    -- OR if user is an admin (can update any profile)
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = (SELECT auth.uid())
        AND profiles.is_admin = true
    )
);

COMMIT;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify only one UPDATE policy exists for profiles:
-- SELECT policyname, cmd, roles, qual, with_check
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename = 'profiles'
-- AND cmd = 'UPDATE';

-- Expected result: Single policy named "profiles_update_self_or_admin"

-- =============================================================================
-- TESTING
-- =============================================================================

/*
Test cases after migration:

1. Regular user updating own profile (should succeed):
   - User A tries to UPDATE profiles WHERE id = A's UUID
   - Result: SUCCESS (first condition true)

2. Regular user updating another profile (should fail):
   - User A tries to UPDATE profiles WHERE id = B's UUID
   - Result: FAIL (both conditions false)

3. Admin updating any profile (should succeed):
   - Admin tries to UPDATE profiles WHERE id = any UUID
   - Result: SUCCESS (second condition true)

4. Admin updating own profile (should succeed):
   - Admin tries to UPDATE profiles WHERE id = Admin's UUID
   - Result: SUCCESS (first condition true, short-circuits)
*/
