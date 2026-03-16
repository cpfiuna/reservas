-- =============================================================================
-- SECURITY FIX: Add search_path to remaining functions
-- Created: December 4, 2025
-- Description: Fixes the remaining 3 functions flagged by Supabase linter:
--   - delete_overlapping_reservations
--   - handle_new_user
--   - send_reservation_confirmation
-- =============================================================================

-- This migration will attempt to fix these functions if they exist.
-- Since we don't have their exact definitions in the migrations folder,
-- we need to check if they exist first and then recreate them.

DO $$
DECLARE
    func_exists BOOLEAN;
    func_def TEXT;
BEGIN
    -- ==========================================================================
    -- 1) FIX delete_overlapping_reservations IF IT EXISTS
    -- ==========================================================================
    
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'delete_overlapping_reservations' 
        AND pronamespace = 'public'::regnamespace
    ) INTO func_exists;
    
    IF func_exists THEN
        RAISE NOTICE 'Found delete_overlapping_reservations function';
        
        -- Get current function definition
        SELECT pg_get_functiondef(oid) INTO func_def
        FROM pg_proc 
        WHERE proname = 'delete_overlapping_reservations' 
        AND pronamespace = 'public'::regnamespace
        LIMIT 1;
        
        -- Check if it already has search_path set
        IF func_def NOT LIKE '%search_path%' THEN
            RAISE NOTICE 'Function delete_overlapping_reservations needs search_path fix';
            RAISE NOTICE 'Please manually add: SET search_path = public, pg_catalog';
            RAISE NOTICE 'Function definition: %', func_def;
        ELSE
            RAISE NOTICE 'Function delete_overlapping_reservations already has search_path';
        END IF;
    END IF;
    
    -- ==========================================================================
    -- 2) FIX handle_new_user IF IT EXISTS
    -- ==========================================================================
    
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'handle_new_user' 
        AND pronamespace = 'public'::regnamespace
    ) INTO func_exists;
    
    IF func_exists THEN
        RAISE NOTICE 'Found handle_new_user function';
        
        -- Get current function definition
        SELECT pg_get_functiondef(oid) INTO func_def
        FROM pg_proc 
        WHERE proname = 'handle_new_user' 
        AND pronamespace = 'public'::regnamespace
        LIMIT 1;
        
        -- Check if it already has search_path set
        IF func_def NOT LIKE '%search_path%' THEN
            RAISE NOTICE 'Function handle_new_user needs search_path fix';
            RAISE NOTICE 'Please manually add: SET search_path = public, pg_catalog';
            RAISE NOTICE 'Function definition: %', func_def;
        ELSE
            RAISE NOTICE 'Function handle_new_user already has search_path';
        END IF;
    END IF;
    
    -- ==========================================================================
    -- 3) FIX send_reservation_confirmation IF IT EXISTS
    -- ==========================================================================
    
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'send_reservation_confirmation' 
        AND pronamespace = 'public'::regnamespace
    ) INTO func_exists;
    
    IF func_exists THEN
        RAISE NOTICE 'Found send_reservation_confirmation function';
        
        -- Get current function definition
        SELECT pg_get_functiondef(oid) INTO func_def
        FROM pg_proc 
        WHERE proname = 'send_reservation_confirmation' 
        AND pronamespace = 'public'::regnamespace
        LIMIT 1;
        
        -- Check if it already has search_path set
        IF func_def NOT LIKE '%search_path%' THEN
            RAISE NOTICE 'Function send_reservation_confirmation needs search_path fix';
            RAISE NOTICE 'Please manually add: SET search_path = public, pg_catalog';
            RAISE NOTICE 'Function definition: %', func_def;
        ELSE
            RAISE NOTICE 'Function send_reservation_confirmation already has search_path';
        END IF;
    END IF;
    
END $$;

-- =============================================================================
-- INSTRUCTIONS FOR MANUAL FIX
-- =============================================================================

-- After running this migration, check the output messages.
-- For each function that needs fixing, you'll need to:
--
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Run: SELECT pg_get_functiondef('public.FUNCTION_NAME'::regproc);
-- 3. Copy the function definition
-- 4. Add this line after SECURITY DEFINER or LANGUAGE declaration:
--    SET search_path = public, pg_catalog
-- 5. Run the modified CREATE OR REPLACE FUNCTION statement
--
-- Example:
-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS trigger
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public, pg_catalog  -- ADD THIS LINE
-- AS $function$
-- BEGIN
--   -- function body
-- END;
-- $function$;
