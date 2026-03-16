-- =============================================================================
-- SECURITY HARDENING MIGRATION
-- Created: March 16, 2026
-- Description: Restricts is_admin_email function to authenticated users only
--   to prevent username/admin enumeration by anonymous users.
-- NOTE: search_path was already set on all functions in migration 20251204100000.
-- =============================================================================

BEGIN;

-- Revoke anonymous access to is_admin_email to prevent admin enumeration.
REVOKE EXECUTE ON FUNCTION public.is_admin_email(TEXT) FROM anon;

COMMIT;
