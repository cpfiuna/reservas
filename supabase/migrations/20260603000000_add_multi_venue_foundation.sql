-- =============================================================================
-- MULTI-VENUE FOUNDATION (Phase 1)
-- Created: June 3, 2026
-- Description: Additive, backwards-compatible migration introducing a "venue"
--   concept so the app can host multiple venues (quincho + polideportivo) with
--   per-venue admin isolation. Every existing row is backfilled to the quincho
--   venue, so current behavior is unchanged.
--
-- SAFETY NOTES:
--   * All columns are added nullable, backfilled, then set NOT NULL.
--   * The overlap-exclusion constraint and blocked_dates uniqueness are made
--     venue-aware so the two venues do NOT block each other's time slots.
--   * Existing RLS policies are intentionally left untouched here; venue-scoped
--     RLS is introduced in a later phase once the frontend passes venue_id.
--   * Wrapped in a single transaction: it either fully applies or rolls back.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. Extensions (btree_gist is already present in prod; ensure idempotently)
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- -----------------------------------------------------------------------------
-- 1. venues table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.venues (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    hours_start TIME WITHOUT TIME ZONE NOT NULL DEFAULT '08:00',
    hours_end   TIME WITHOUT TIME ZONE NOT NULL DEFAULT '22:00',
    active      BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Seed the two venues. Polideportivo starts inactive (hidden) until launch.
INSERT INTO public.venues (slug, name, hours_start, hours_end, active)
VALUES
    ('quincho',       'Quincho FIUNA',       '08:00', '22:00', true),
    ('polideportivo', 'Polideportivo FIUNA', '08:00', '22:00', false)
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. admin_venues junction (which admin manages which venue)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_venues (
    admin_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    venue_id   UUID NOT NULL REFERENCES public.venues(id)   ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (admin_id, venue_id)
);

-- -----------------------------------------------------------------------------
-- 3. super-admin flag (sees/manages all venues). Schema now, UI later.
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false;

-- -----------------------------------------------------------------------------
-- 4. Add venue_id (nullable first) to the venue-scoped tables
--    settings.venue_id stays nullable: NULL = global default setting.
-- -----------------------------------------------------------------------------
ALTER TABLE public.reservations  ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id);
ALTER TABLE public.blocked_dates ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id);
ALTER TABLE public.cancellations ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id);
ALTER TABLE public.settings      ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id);

-- -----------------------------------------------------------------------------
-- 5. Backfill existing data -> quincho, set defaults, assign current admins
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    quincho_id UUID;
BEGIN
    SELECT id INTO quincho_id FROM public.venues WHERE slug = 'quincho';

    -- Backfill every existing row to the quincho venue.
    UPDATE public.reservations  SET venue_id = quincho_id WHERE venue_id IS NULL;
    UPDATE public.blocked_dates SET venue_id = quincho_id WHERE venue_id IS NULL;
    UPDATE public.cancellations SET venue_id = quincho_id WHERE venue_id IS NULL;

    -- Default new rows to quincho until the app explicitly passes venue_id.
    -- This keeps the current single-venue frontend working unchanged.
    EXECUTE format('ALTER TABLE public.reservations  ALTER COLUMN venue_id SET DEFAULT %L', quincho_id);
    EXECUTE format('ALTER TABLE public.blocked_dates ALTER COLUMN venue_id SET DEFAULT %L', quincho_id);

    -- Preserve current admin behavior: every existing admin manages quincho.
    INSERT INTO public.admin_venues (admin_id, venue_id)
    SELECT p.id, quincho_id
    FROM public.profiles p
    WHERE p.is_admin = true
    ON CONFLICT DO NOTHING;
END $$;

-- -----------------------------------------------------------------------------
-- 6. Enforce NOT NULL now that data is backfilled (reservations & blocked_dates)
--    cancellations.venue_id left nullable (older audit rows may pre-date venues).
-- -----------------------------------------------------------------------------
ALTER TABLE public.reservations  ALTER COLUMN venue_id SET NOT NULL;
ALTER TABLE public.blocked_dates ALTER COLUMN venue_id SET NOT NULL;

-- -----------------------------------------------------------------------------
-- 7. Make the overlap-exclusion constraint venue-aware
--    Original (global by date/time):
--      EXCLUDE USING gist (fecha WITH =, reservation_time_range(...) WITH &&)
--      WHERE status NOT IN ('cancelled','rejected')
--    New: add venue_id so different venues can share the same date/time slot.
-- -----------------------------------------------------------------------------
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_no_overlap_excl;
ALTER TABLE public.reservations ADD CONSTRAINT reservations_no_overlap_excl
    EXCLUDE USING gist (
        venue_id WITH =,
        fecha WITH =,
        reservation_time_range(fecha, inicio, fin) WITH &&
    )
    WHERE (status <> ALL (ARRAY['cancelled'::reservation_status, 'rejected'::reservation_status]));

-- -----------------------------------------------------------------------------
-- 8. Make blocked_dates uniqueness venue-aware
--    Original: UNIQUE (fecha) -- global, would block the same date across venues.
-- -----------------------------------------------------------------------------
ALTER TABLE public.blocked_dates DROP CONSTRAINT IF EXISTS blocked_dates_fecha_key;
ALTER TABLE public.blocked_dates ADD CONSTRAINT blocked_dates_venue_fecha_key UNIQUE (venue_id, fecha);

-- -----------------------------------------------------------------------------
-- 9. Indexes for venue-scoped queries
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_reservations_venue       ON public.reservations(venue_id);
CREATE INDEX IF NOT EXISTS idx_reservations_venue_fecha ON public.reservations(venue_id, fecha);
CREATE INDEX IF NOT EXISTS idx_blocked_dates_venue      ON public.blocked_dates(venue_id);
CREATE INDEX IF NOT EXISTS idx_admin_venues_venue       ON public.admin_venues(venue_id);

-- -----------------------------------------------------------------------------
-- 10. RLS for the new tables
-- -----------------------------------------------------------------------------
ALTER TABLE public.venues       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_venues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS venues_select_all ON public.venues;
CREATE POLICY venues_select_all
    ON public.venues FOR SELECT
    USING (true);

-- An admin can read their own venue assignments; super-admins can read all.
DROP POLICY IF EXISTS admin_venues_select_self_or_super ON public.admin_venues;
CREATE POLICY admin_venues_select_self_or_super
    ON public.admin_venues FOR SELECT
    USING (
        admin_id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = (SELECT auth.uid())
              AND profiles.is_super_admin = true
        )
    );

-- -----------------------------------------------------------------------------
-- 11. Make blocked-date triggers venue-aware
--     Both functions previously matched reservations only by `fecha` (+ time),
--     so a block in one venue would delete/cancel reservations in OTHER venues
--     on the same date. We add `venue_id = NEW.venue_id` scoping. Behavior is
--     otherwise identical to the live definitions captured from production.
-- -----------------------------------------------------------------------------

-- 11a. Hard-delete overlapping reservations (scoped to the blocked date's venue)
CREATE OR REPLACE FUNCTION public.delete_overlapping_reservations()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  -- Delete reservations that overlap with the blocked period (same venue only)
  DELETE FROM public.reservations
  WHERE fecha = NEW.fecha
  AND venue_id = NEW.venue_id
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

-- 11b. Soft-cancel + email overlapping reservations (scoped to the blocked date's venue)
CREATE OR REPLACE FUNCTION public.cancel_reservations_in_blocked_range()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'extensions'
AS $function$
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
    -- (restricted to the same venue as the blocked date)
    FOR affected_reservation IN
        SELECT r.*
        FROM public.reservations r
        WHERE r.fecha = NEW.fecha
          AND r.venue_id = NEW.venue_id
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
$function$;

COMMIT;
