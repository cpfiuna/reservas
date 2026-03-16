-- Migration: Add confirm_reservation RPC function
-- Created: 2025-12-11
-- Purpose: Provide a secure, server-side function that confirms a reservation by its token.
-- This avoids granting broad UPDATE permissions via RLS and lets anonymous users confirm via a controlled entrypoint.

BEGIN;

-- Create function to confirm reservation by token
CREATE OR REPLACE FUNCTION public.confirm_reservation(p_token UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  rows_updated INTEGER := 0;
BEGIN
  -- Update the reservation only if token matches and token has not expired
  UPDATE public.reservations
  SET confirmed = true,
      updated_at = now()
  WHERE confirmation_token = p_token
    AND token_expires_at IS NOT NULL
    AND token_expires_at > now()
  AND status NOT IN ('cancelled', 'rejected');

  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  RETURN rows_updated > 0;
END;
$$;

-- Grant execute to public so anonymous users can call the RPC (safe because the function validates token and expiry)
GRANT EXECUTE ON FUNCTION public.confirm_reservation(UUID) TO public;

COMMIT;

-- NOTE: After applying this migration, update the client to call the RPC instead of performing a direct UPDATE.
-- Example client call (js):
-- const { data, error } = await supabase.rpc('confirm_reservation', { p_token: token });
-- if (error) { /* handle error */ }
-- if (data === true) { /* confirmed */ } else { /* expired or not found */ }
