-- Create function to check if an email belongs to an admin user
-- Returns: true if admin, false if user exists but not admin, null if user doesn't exist

CREATE OR REPLACE FUNCTION public.is_admin_email(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.is_admin_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_email(TEXT) TO anon;
