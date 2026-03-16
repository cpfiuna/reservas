-- =============================================================================
-- SECURITY FIX: Move pg_net extension from public to extensions schema
-- Created: December 4, 2025
-- Description: Addresses Supabase linter warning "extension_in_public"
--              Extensions should not be in the public schema for security
-- Note: pg_net doesn't support SET SCHEMA, so we drop and recreate it
-- =============================================================================

BEGIN;

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Drop pg_net from public schema (if it exists there)
DROP EXTENSION IF EXISTS pg_net CASCADE;

-- Recreate pg_net in extensions schema
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage on extensions schema
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

COMMIT;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify pg_net is now in extensions schema:
-- SELECT extname, nspname 
-- FROM pg_extension e 
-- JOIN pg_namespace n ON e.extnamespace = n.oid 
-- WHERE extname = 'pg_net';
-- 
-- Expected result: extname = 'pg_net', nspname = 'extensions'
