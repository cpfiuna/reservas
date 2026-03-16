-- =============================================================================
-- HANDLE CRITICAL EDGE CASES
-- Created: December 4, 2025
-- Description: 
--   1. Prevent double-booking with simple database constraint
--   2. Auto-cancel reservations when dates are blocked
-- =============================================================================

-- =============================================================================
-- PART 1: ADD MISSING COLUMNS FOR CONFIRMATION FLOW
-- =============================================================================

-- Add confirmation tracking columns if they don't exist
DO $$ 
BEGIN
    -- Add confirmed column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'confirmed') THEN
        ALTER TABLE public.reservations 
        ADD COLUMN confirmed BOOLEAN NOT NULL DEFAULT false;
    END IF;
    
    -- Add confirmation_token column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'confirmation_token') THEN
        ALTER TABLE public.reservations 
        ADD COLUMN confirmation_token UUID DEFAULT gen_random_uuid();
    END IF;
    
    -- Add token_expires_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reservations' AND column_name = 'token_expires_at') THEN
        ALTER TABLE public.reservations 
        ADD COLUMN token_expires_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_reservations_confirmation_token 
ON public.reservations(confirmation_token) 
WHERE confirmation_token IS NOT NULL;

-- Add index for confirmed reservations queries
CREATE INDEX IF NOT EXISTS idx_reservations_confirmed 
ON public.reservations(confirmed);

COMMENT ON COLUMN public.reservations.confirmed IS 'Whether the user has confirmed their email';
COMMENT ON COLUMN public.reservations.confirmation_token IS 'Token used to confirm the reservation via email';
COMMENT ON COLUMN public.reservations.token_expires_at IS 'When the confirmation token expires (24 hours)';

-- =============================================================================
-- PART 2: SIMPLE EXCLUSION CONSTRAINT TO PREVENT DOUBLE-BOOKING
-- =============================================================================

-- Install btree_gist extension (required for exclusion constraints with time ranges)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Create immutable helper function for the constraint
CREATE OR REPLACE FUNCTION public.reservation_time_range(fecha DATE, inicio TIME, fin TIME)
RETURNS tsrange
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT tsrange(
        (fecha + inicio)::timestamp,
        (fecha + fin)::timestamp
    );
$$;

COMMENT ON FUNCTION public.reservation_time_range(DATE, TIME, TIME) IS
'Converts date and time columns to a timestamp range for overlap detection';

-- Drop the constraint if it exists (for re-running migration)
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_no_overlap_excl;

-- =============================================================================
-- CLEANUP: Handle existing overlapping reservations before creating constraint
-- =============================================================================

-- Find and mark duplicate/overlapping reservations as 'rejected' except the oldest one
DO $$
DECLARE
    overlap_group RECORD;
    first_id UUID;
BEGIN
    -- For each group of overlapping reservations
    FOR overlap_group IN
        SELECT 
            fecha,
            inicio,
            fin,
            array_agg(id ORDER BY created_at ASC) as ids,
            array_agg(created_at ORDER BY created_at ASC) as created_ats
        FROM public.reservations
        WHERE status NOT IN ('cancelled', 'rejected')
        GROUP BY fecha, inicio, fin
        HAVING COUNT(*) > 1
    LOOP
        -- Keep the first (oldest) reservation, reject the rest
        first_id := overlap_group.ids[1];
        
        -- Reject all others in this group
        UPDATE public.reservations
        SET 
            status = 'rejected',
            admin_notes = COALESCE(admin_notes || E'\n\n', '') || 
                'Rechazada automáticamente: reserva duplicada detectada durante migración. La reserva más antigua fue mantenida.'
        WHERE id = ANY(overlap_group.ids[2:]);
        
        RAISE NOTICE 'Found % overlapping reservations for % % - %. Kept oldest (%), rejected % others.',
            array_length(overlap_group.ids, 1),
            overlap_group.fecha,
            overlap_group.inicio,
            overlap_group.fin,
            first_id,
            array_length(overlap_group.ids, 1) - 1;
    END LOOP;
END $$;

-- Create exclusion constraint to prevent overlapping reservations
-- This is enforced at submission time - first to submit wins
-- Unconfirmed reservations still block the slot (show as "Pendiente")
ALTER TABLE public.reservations
ADD CONSTRAINT reservations_no_overlap_excl
EXCLUDE USING gist (
    fecha WITH =,
    reservation_time_range(fecha, inicio, fin) WITH &&
)
WHERE (status NOT IN ('cancelled', 'rejected'));

COMMENT ON CONSTRAINT reservations_no_overlap_excl ON public.reservations IS 
'Prevents overlapping reservations on the same date. First to submit wins, regardless of confirmation status.';

-- =============================================================================
-- PART 3: FUNCTION TO AUTO-CANCEL RESERVATIONS WHEN DATES ARE BLOCKED
-- =============================================================================

-- Function to cancel reservations that fall within newly blocked dates
CREATE OR REPLACE FUNCTION public.cancel_reservations_in_blocked_range()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
    affected_reservation RECORD;
    cancel_reason TEXT;
    affected_count INTEGER := 0;
    email_response_id BIGINT;
    function_url TEXT := 'https://uhthypiomvxwnayopagt.supabase.co/functions/v1';
    service_role_key TEXT;
BEGIN
    -- Get service role key from Vault
    SELECT decrypted_secret INTO service_role_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;
    
    -- Build the cancellation reason from the blocked date's motivo
    cancel_reason := COALESCE(
        'Fechas bloqueadas por administración: ' || NEW.motivo,
        'Fechas bloqueadas por administración'
    );
    
    -- Find all non-cancelled reservations that overlap with this blocked period
    FOR affected_reservation IN
        SELECT r.* 
        FROM public.reservations r
        WHERE r.fecha = NEW.fecha
          AND r.status NOT IN ('cancelled', 'rejected')
          AND (
              -- Case 1: Blocked date has no time range (full day block)
              (NEW.start_time IS NULL AND NEW.end_time IS NULL)
              OR
              -- Case 2: Blocked date has time range, check for overlap
              (
                  NEW.start_time IS NOT NULL 
                  AND NEW.end_time IS NOT NULL
                  AND (
                      -- Reservation overlaps with blocked time range
                      (r.inicio >= NEW.start_time AND r.inicio < NEW.end_time) OR
                      (r.fin > NEW.start_time AND r.fin <= NEW.end_time) OR
                      (r.inicio <= NEW.start_time AND r.fin >= NEW.end_time)
                  )
              )
          )
    LOOP
        -- Cancel the reservation
        UPDATE public.reservations
        SET 
            status = 'cancelled',
            admin_notes = COALESCE(admin_notes || E'\n\n', '') || cancel_reason,
            updated_at = now(),
            updated_by = NEW.created_by
        WHERE id = affected_reservation.id;
        
        affected_count := affected_count + 1;
        
        -- Send instant cancellation email via pg_net
        IF function_url IS NOT NULL AND service_role_key IS NOT NULL THEN
            BEGIN
                SELECT extensions.http_post(
                    url := function_url || '/send-email',
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || service_role_key
                    ),
                    body := jsonb_build_object(
                        'type', 'reservation-cancelled',
                        'recipient', affected_reservation.email,
                        'reservation', jsonb_build_object(
                            'id', affected_reservation.id,
                            'responsable', affected_reservation.responsable,
                            'email', affected_reservation.email,
                            'motivo', affected_reservation.motivo,
                            'fecha', affected_reservation.fecha,
                            'inicio', affected_reservation.inicio,
                            'fin', affected_reservation.fin,
                            'personas', affected_reservation.personas
                        ),
                        'reason', cancel_reason
                    )::text
                ) INTO email_response_id;
                
                RAISE NOTICE 'Sent cancellation email to % (http_post id: %)', 
                    affected_reservation.email, email_response_id;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Failed to send email to %: %', 
                    affected_reservation.email, SQLERRM;
            END;
        ELSE
            RAISE WARNING 'Email not sent: function_url or service_role_key not configured';
        END IF;
        
        -- Log the cancellation
        RAISE NOTICE 'Auto-cancelled reservation % (%, %) due to blocked date', 
            affected_reservation.id, 
            affected_reservation.responsable,
            affected_reservation.email;
    END LOOP;
    
    -- Log summary
    IF affected_count > 0 THEN
        RAISE NOTICE 'Blocked date % affected % reservation(s)', NEW.fecha, affected_count;
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.cancel_reservations_in_blocked_range() IS
'Automatically cancels reservations that fall within newly blocked date ranges and sends instant email notifications';

-- =============================================================================
-- PART 4: CREATE TRIGGER FOR AUTO-CANCELLATION
-- =============================================================================

-- Drop trigger if exists (for re-running migration)
DROP TRIGGER IF EXISTS trigger_cancel_reservations_on_block ON public.blocked_dates;

-- Create trigger that fires when a new blocked date is inserted
CREATE TRIGGER trigger_cancel_reservations_on_block
    AFTER INSERT ON public.blocked_dates
    FOR EACH ROW
    EXECUTE FUNCTION public.cancel_reservations_in_blocked_range();

COMMENT ON TRIGGER trigger_cancel_reservations_on_block ON public.blocked_dates IS
'Fires after a date is blocked to cancel any conflicting reservations';

-- =============================================================================
-- PART 5: UPDATE RLS POLICIES FOR CONFIRMED FIELD
-- =============================================================================

-- Anyone can view all reservations (but only confirmed ones show as "taken" slots)
DROP POLICY IF EXISTS "Anyone can view all reservations" ON public.reservations;
CREATE POLICY "Anyone can view all reservations"
ON public.reservations FOR SELECT
TO public
USING (true);

-- Anyone can create reservations (they start unconfirmed)
DROP POLICY IF EXISTS "Anyone can create reservations" ON public.reservations;
CREATE POLICY "Anyone can create reservations"
ON public.reservations FOR INSERT
TO public
WITH CHECK (true);

-- =============================================================================
-- SUMMARY AND VERIFICATION
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'EDGE CASE HANDLING MIGRATION COMPLETED';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'EDGE CASE #1: Double-booking prevention';
    RAISE NOTICE '  ✓ Added exclusion constraint: reservations_no_overlap_excl';
    RAISE NOTICE '  ✓ First to submit reservation wins';
    RAISE NOTICE '  ✓ Constraint enforced at database level (no race conditions)';
    RAISE NOTICE '  ✓ Unconfirmed reservations still block slots (show as Pendiente)';
    RAISE NOTICE '';
    RAISE NOTICE 'EDGE CASE #2: Blocking dates with existing reservations';
    RAISE NOTICE '  ✓ Created function: cancel_reservations_in_blocked_range()';
    RAISE NOTICE '  ✓ Created trigger: trigger_cancel_reservations_on_block';
    RAISE NOTICE '  ✓ Auto-cancels conflicting reservations when dates are blocked';
    RAISE NOTICE '  ✓ Sends instant email notifications via pg_net';
    RAISE NOTICE '  ✓ Adds admin notes with cancellation reason';
    RAISE NOTICE '';
    RAISE NOTICE 'SETUP REQUIRED:';
    RAISE NOTICE '  Add service_role_key to Supabase Vault:';
    RAISE NOTICE '    1. Go to Project Settings → Vault';
    RAISE NOTICE '    2. Add secret: name=service_role_key, value=YOUR_SERVICE_ROLE_KEY';
    RAISE NOTICE '    3. Function URL is hardcoded in trigger';
    RAISE NOTICE '';
    RAISE NOTICE 'BEHAVIOR:';
    RAISE NOTICE '  • Users submit reservations (unconfirmed, status=pending)';
    RAISE NOTICE '  • First to submit gets the slot - second gets constraint error';
    RAISE NOTICE '  • Slot shows as "Pendiente" in calendar immediately';
    RAISE NOTICE '  • Email confirmation verifies user identity (required for admin approval)';
    RAISE NOTICE '  • When admin blocks dates:';
    RAISE NOTICE '    - All overlapping reservations auto-cancelled';
    RAISE NOTICE '    - Instant email sent to affected users';
    RAISE NOTICE '    - Cancellation reason saved in admin_notes';
    RAISE NOTICE '=============================================================================';
END $$;
