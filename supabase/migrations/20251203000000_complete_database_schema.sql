-- =============================================================================
-- COMPLETE DATABASE SCHEMA MIGRATION
-- Created: December 3, 2025
-- Description: Full database schema with all tables, RLS policies, and constraints
-- This migration can be used to restore the database to this exact state
-- =============================================================================

-- =============================================================================
-- 1. CREATE TABLES
-- =============================================================================

-- Profiles table (user management)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Reservations table (main business logic)
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    responsable TEXT NOT NULL,
    email TEXT NOT NULL,
    motivo TEXT NOT NULL,
    fecha DATE NOT NULL,
    inicio TIME WITHOUT TIME ZONE NOT NULL,
    fin TIME WITHOUT TIME ZONE NOT NULL,
    personas INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    approved BOOLEAN NOT NULL DEFAULT true,
    admin_notes TEXT,
    affiliation TEXT
);

-- Blocked dates table (availability management)
CREATE TABLE IF NOT EXISTS public.blocked_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL,
    motivo TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID,
    start_time TIME WITHOUT TIME ZONE,
    end_time TIME WITHOUT TIME ZONE,
    group_id UUID
);

-- Settings table (application configuration)
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_by UUID
);

-- =============================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

-- Index for faster reservation queries by date
CREATE INDEX IF NOT EXISTS idx_reservations_fecha ON public.reservations(fecha);
CREATE INDEX IF NOT EXISTS idx_reservations_approved ON public.reservations(approved);
CREATE INDEX IF NOT EXISTS idx_reservations_email ON public.reservations(email);

-- Index for blocked dates queries
CREATE INDEX IF NOT EXISTS idx_blocked_dates_fecha ON public.blocked_dates(fecha);
CREATE INDEX IF NOT EXISTS idx_blocked_dates_group_id ON public.blocked_dates(group_id);

-- Index for profiles admin lookup
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);

-- Index for settings key lookup
CREATE INDEX IF NOT EXISTS idx_settings_key ON public.settings(key);

-- =============================================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 4. DROP EXISTING POLICIES (for clean migration)
-- =============================================================================

-- Profiles policies
DROP POLICY IF EXISTS "Allow user to insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Reservations policies
DROP POLICY IF EXISTS "Anyone can create reservations" ON public.reservations;
DROP POLICY IF EXISTS "Anyone can view all reservations" ON public.reservations;
DROP POLICY IF EXISTS "Only admins can delete reservations" ON public.reservations;
DROP POLICY IF EXISTS "Only admins can update reservations" ON public.reservations;

-- Blocked dates policies
DROP POLICY IF EXISTS "Admins can manage blocked dates" ON public.blocked_dates;
DROP POLICY IF EXISTS "Anyone can view blocked dates" ON public.blocked_dates;
DROP POLICY IF EXISTS "Only admins can delete blocked dates" ON public.blocked_dates;
DROP POLICY IF EXISTS "Only admins can insert blocked dates" ON public.blocked_dates;
DROP POLICY IF EXISTS "Only admins can update blocked dates" ON public.blocked_dates;

-- Settings policies
DROP POLICY IF EXISTS "Anyone can view settings" ON public.settings;
DROP POLICY IF EXISTS "Only admins can update settings" ON public.settings;

-- =============================================================================
-- 5. CREATE RLS POLICIES - PROFILES TABLE
-- =============================================================================

-- Allow authenticated users to insert their own profile
CREATE POLICY "Allow user to insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow public users to insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO public
WITH CHECK (auth.uid() = id);

-- Allow users to view their own profile (authenticated)
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow users to view their own profile (public)
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO public
USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO public
USING (auth.uid() = id);

-- Only admins can update any profile
CREATE POLICY "Only admins can update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
);

-- =============================================================================
-- 6. CREATE RLS POLICIES - RESERVATIONS TABLE
-- =============================================================================

-- Anyone (authenticated or anonymous) can view all reservations
CREATE POLICY "Anyone can view all reservations"
ON public.reservations
FOR SELECT
TO anon, authenticated
USING (true);

-- Anyone (authenticated or anonymous) can create reservations
CREATE POLICY "Anyone can create reservations"
ON public.reservations
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can update reservations
CREATE POLICY "Only admins can update reservations"
ON public.reservations
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
);

-- Only admins can delete reservations
CREATE POLICY "Only admins can delete reservations"
ON public.reservations
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
);

-- =============================================================================
-- 7. CREATE RLS POLICIES - BLOCKED_DATES TABLE
-- =============================================================================

-- Anyone (authenticated or anonymous) can view blocked dates
CREATE POLICY "Anyone can view blocked dates"
ON public.blocked_dates
FOR SELECT
TO anon, authenticated
USING (true);

-- Only admins can insert blocked dates
CREATE POLICY "Only admins can insert blocked dates"
ON public.blocked_dates
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
);

-- Only admins can update blocked dates
CREATE POLICY "Only admins can update blocked dates"
ON public.blocked_dates
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
);

-- Only admins can delete blocked dates
CREATE POLICY "Only admins can delete blocked dates"
ON public.blocked_dates
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
);

-- Admins can manage (all operations) blocked dates
CREATE POLICY "Admins can manage blocked dates"
ON public.blocked_dates
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
);

-- =============================================================================
-- 8. CREATE RLS POLICIES - SETTINGS TABLE
-- =============================================================================

-- Anyone (authenticated or anonymous) can view settings
CREATE POLICY "Anyone can view settings"
ON public.settings
FOR SELECT
TO anon, authenticated
USING (true);

-- Only admins can update settings
CREATE POLICY "Only admins can update settings"
ON public.settings
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
);

-- =============================================================================
-- 9. CREATE HELPER FUNCTIONS
-- =============================================================================

-- Function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = user_id
        AND is_admin = true
    );
$$;

-- Function to get profile by user ID
CREATE OR REPLACE FUNCTION public.get_profile_by_user_id(user_id UUID)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    is_admin BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT id, full_name, is_admin, created_at
    FROM public.profiles
    WHERE id = user_id;
$$;

-- Function to update timestamps automatically
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- =============================================================================
-- 10. CREATE TRIGGERS
-- =============================================================================

-- Trigger to update settings.updated_at timestamp
DROP TRIGGER IF EXISTS update_settings_updated_at ON public.settings;
CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 11. ADD COMMENTS (Documentation)
-- =============================================================================

COMMENT ON TABLE public.profiles IS 'User profiles with admin flags';
COMMENT ON TABLE public.reservations IS 'Quincho reservations with approval workflow';
COMMENT ON TABLE public.blocked_dates IS 'Dates or time slots that are unavailable for reservations';
COMMENT ON TABLE public.settings IS 'Application-wide configuration settings';

COMMENT ON COLUMN public.profiles.is_admin IS 'Flag indicating if user has admin privileges';
COMMENT ON COLUMN public.reservations.approved IS 'Whether the reservation has been approved by an admin';
COMMENT ON COLUMN public.reservations.affiliation IS 'User affiliation (student, professor, staff, etc.)';
COMMENT ON COLUMN public.blocked_dates.start_time IS 'Optional start time for partial day blocks';
COMMENT ON COLUMN public.blocked_dates.end_time IS 'Optional end time for partial day blocks';
COMMENT ON COLUMN public.blocked_dates.group_id IS 'Groups multiple time blocks for the same blocking event';

-- =============================================================================
-- 12. GRANT PERMISSIONS
-- =============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions on tables
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO anon, authenticated;
GRANT SELECT ON public.blocked_dates TO anon, authenticated;
GRANT SELECT ON public.settings TO anon, authenticated;

-- Grant permissions on sequences (for auto-increment IDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Verify the migration
DO $$
DECLARE
    table_count INTEGER;
    rls_count INTEGER;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO table_count
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'reservations', 'blocked_dates', 'settings');
    
    -- Count RLS enabled tables
    SELECT COUNT(*) INTO rls_count
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'reservations', 'blocked_dates', 'settings')
    AND rowsecurity = true;
    
    IF table_count = 4 AND rls_count = 4 THEN
        RAISE NOTICE 'Migration successful: All 4 tables created with RLS enabled';
    ELSE
        RAISE WARNING 'Migration verification: Expected 4 tables with RLS, found % tables with % RLS enabled', table_count, rls_count;
    END IF;
END $$;
