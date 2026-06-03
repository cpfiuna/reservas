import { supabase } from '@/integrations/supabase/client';
import { User } from './types';
import { toast } from "sonner";

// Function to fetch user profile from Supabase with timeout and auto-creation
export const fetchUserProfile = async (userId: string, accessToken?: string): Promise<boolean> => {
  try {
    // Create a timeout promise (reduced to 3 seconds for faster feedback)
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
    );
    
    // If we have an access token, use it explicitly for the request
    const client = accessToken 
      ? supabase.auth.setSession({ access_token: accessToken, refresh_token: '' }).then(() => supabase)
      : Promise.resolve(supabase);
    
    // Direct query to profiles table with timeout
    const queryPromise = (await client)
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .maybeSingle(); // Use maybeSingle to handle missing rows gracefully
    
    const { data: profileData, error: profileError } = await Promise.race([
      queryPromise,
      timeoutPromise
    ]) as any;
    
    if (profileError) {
      return false;
    }
    
    // If no profile exists, try to create one (default: non-admin)
    if (!profileData) {
      try {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            is_admin: false,
            created_at: new Date().toISOString()
          });
        
        if (insertError) {
          return false;
        }
        
        return false;
      } catch (createError) {
        return false;
      }
    }
    
    return !!profileData?.is_admin;
  } catch (error) {
    // Return false on timeout or any error, don't block the flow
    return false;
  }
};

// Function to fetch an admin's venue assignments + super-admin flag.
// Returns safe defaults on any error so it never blocks sign-in.
export const fetchUserVenues = async (
  userId: string
): Promise<{ isSuperAdmin: boolean; venues: string[] }> => {
  try {
    const [{ data: profile }, { data: assignments }] = await Promise.all([
      supabase.from('profiles').select('is_super_admin').eq('id', userId).maybeSingle(),
      supabase.from('admin_venues').select('venue_id').eq('admin_id', userId),
    ]);

    return {
      isSuperAdmin: !!profile?.is_super_admin,
      venues: (assignments ?? []).map((row: { venue_id: string }) => row.venue_id),
    };
  } catch {
    return { isSuperAdmin: false, venues: [] };
  }
};

// Function to handle user sign-in
export const handleUserSignIn = async (session: any): Promise<User | null> => {
  if (!session) return null;
  
  try {
    const userId = session.user.id;
    const userEmail = session.user.email || '';
    
    // Always verify admin status and venue assignments from the server.
    // Do NOT use the localStorage cache here - venue assignments can change
    // without a new sign-in (e.g. admin_venues rows added by a super-admin).
    const [isAdmin, { isSuperAdmin, venues }] = await Promise.all([
      fetchUserProfile(userId),
      fetchUserVenues(userId),
    ]);
    
    // Create user object
    const user: User = {
      email: userEmail,
      isAdmin: isAdmin,
      isSuperAdmin,
      venues,
    };
    
    return user;
  } catch (error) {
    return null;
  }
};

// Function to retrieve user from local storage
export const getUserFromLocalStorage = (): User | null => {
  const storedUser = localStorage.getItem('user');
  return storedUser ? JSON.parse(storedUser) : null;
};

// Function to store user in local storage
export const storeUserInLocalStorage = (user: User | null): void => {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
};
