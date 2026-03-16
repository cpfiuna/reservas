-- =============================================================================
-- ADD CANCELLATIONS AUDIT TABLE
-- Created: December 4, 2025
-- Description: Lightweight audit table to store reservation cancellation events
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'cancellations'
    ) THEN
        CREATE TABLE public.cancellations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
            cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
            reason TEXT,
            previous_status reservation_status,
            reservation_snapshot JSONB,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_cancellations_reservation_id ON public.cancellations(reservation_id);
        CREATE INDEX IF NOT EXISTS idx_cancellations_cancelled_by ON public.cancellations(cancelled_by);
    END IF;
END $$;

COMMENT ON TABLE public.cancellations IS 'Audit log for reservation cancellations (immutable events)';
COMMENT ON COLUMN public.cancellations.previous_status IS 'Reservation status before cancellation';
COMMENT ON COLUMN public.cancellations.reservation_snapshot IS 'JSON snapshot of the reservation at cancellation time';