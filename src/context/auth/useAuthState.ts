import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from './types';
import { toast } from "sonner";
import { 
  handleUserSignIn, 
  getUserFromLocalStorage, 
  storeUserInLocalStorage,
  fetchUserProfile
} from './utils';

export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(() => {
    return getUserFromLocalStorage();
  });
  const [loading, setLoading] = useState(true);
  const [isInitialAuth, setIsInitialAuth] = useState(() => {
    // Get the initial auth state from localStorage or default to true
    return localStorage.getItem('isInitialAuth') !== 'false';
  });

  const isAuthenticated = !!user;
  const isAdmin = user?.isAdmin || false;
  const isLoggedIn = isAuthenticated;

  useEffect(() => {
    // Check current session on mount
    const checkCurrentSession = async () => {
      try {
        setLoading(true);
        
        // Check if we're in a password recovery flow - if so, DON'T auto-login
        const isPasswordRecovery = window.location.hash.includes('type=recovery');
        if (isPasswordRecovery) {
          setLoading(false);
          setIsInitialAuth(false);
          return;
        }
        
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          return;
        }
        
        if (session) {
          const newUser = await handleUserSignIn(session);
          if (newUser) {
            setUser(newUser);
            storeUserInLocalStorage(newUser);
          }
        }
        // Session check complete, no longer initial auth
        setIsInitialAuth(false);
      } catch (err) {
        // Error in checkCurrentSession
      } finally {
        setLoading(false);
      }
    };
    
    checkCurrentSession();
    
    // Set up Supabase auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Check if we're in password recovery flow by URL
        const isPasswordRecovery = window.location.hash.includes('type=recovery');
        
        // If this is a password recovery session, don't auto-login
        if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && isPasswordRecovery)) {
          setLoading(false);
          return;
        }
        
        if (event === 'SIGNED_IN' && session) {
          try {
            setLoading(true);
            const newUser = await handleUserSignIn(session);
            if (newUser) {
              setUser(newUser);
              storeUserInLocalStorage(newUser);
              
              // Only show toast if this is an actual new login (not a session refresh)
              if (isInitialAuth) {
                toast.success('Inicio de sesión exitoso');
                localStorage.setItem('isInitialAuth', 'false');
              }
              // No longer initial auth after first sign-in
              setIsInitialAuth(false);
            }
          } catch (err) {
            // Error handling SIGNED_IN event
          } finally {
            setLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          storeUserInLocalStorage(null);
          toast.info('Sesión cerrada');
        } else if (event === 'USER_UPDATED' && session) {
          // Check if we're in password recovery mode
          if (isPasswordRecovery) {
            // During password recovery, USER_UPDATED means password was changed
            // We should now log the user in
            try {
              setLoading(true);
              const newUser = await handleUserSignIn(session);
              if (newUser) {
                setUser(newUser);
                storeUserInLocalStorage(newUser);
              }
            } catch (error) {
              // Error updating user data
            } finally {
              setLoading(false);
            }
          } else {
            // Regular user data update (not during password recovery)
            try {
              setLoading(true);
              const newUser = await handleUserSignIn(session);
              if (newUser) {
                setUser(newUser);
                storeUserInLocalStorage(newUser);
              }
            } catch (error) {
              // Error updating user data
            } finally {
              setLoading(false);
            }
          }
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [isInitialAuth]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        toast.error('Credenciales incorrectas');
        return false;
      }
      
      // Ensure the user has admin privileges
      if (data?.user) {
        try {
          await fetchUserProfile(data.user.id);
        } catch (err) {
          // Continue anyway since authentication succeeded
        }
      }
      
      return true;
    } catch (error) {
      toast.error('Error al iniciar sesión');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      storeUserInLocalStorage(null);
    } catch (error) {
      toast.error('Error al cerrar sesión');
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    login,
    logout,
    isAuthenticated,
    isAdmin,
    isLoggedIn,
    loading
  };
};
