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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialAuth, setIsInitialAuth] = useState(() => {
    // Get the initial auth state from localStorage or default to true
    return localStorage.getItem('isInitialAuth') !== 'false';
  });

  const isAuthenticated = !!user;
  const isAdmin = user?.isAdmin || false;
  const isSuperAdmin = user?.isSuperAdmin || false;
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
    
    // Process a session outside the auth callback to avoid the Supabase
    // deadlock that happens when other supabase calls are awaited *inside*
    // the onAuthStateChange handler (the auth lock is held during the
    // callback, so any awaited supabase query blocks forever).
    const processSession = async (session: any) => {
      try {
        setLoading(true);
        const newUser = await handleUserSignIn(session);
        if (newUser) {
          setUser(newUser);
          storeUserInLocalStorage(newUser);
        }
        return newUser;
      } finally {
        setLoading(false);
      }
    };

    // Set up Supabase auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Check if we're in password recovery flow by URL
        const isPasswordRecovery = window.location.hash.includes('type=recovery');
        
        // If this is a password recovery session, don't auto-login
        if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && isPasswordRecovery)) {
          setLoading(false);
          return;
        }
        
        if (event === 'SIGNED_IN' && session) {
          // Defer to release the auth lock before making supabase queries.
          setTimeout(() => {
            processSession(session).then((newUser) => {
              if (newUser && isInitialAuth) {
                toast.success('Inicio de sesión exitoso');
                localStorage.setItem('isInitialAuth', 'false');
                setIsInitialAuth(false);
              }
            });
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          storeUserInLocalStorage(null);
          toast.info('Sesión cerrada');
        } else if (event === 'USER_UPDATED' && session) {
          // Defer to release the auth lock before making supabase queries.
          setTimeout(() => {
            processSession(session);
          }, 0);
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
    isSuperAdmin,
    isLoggedIn,
    loading
  };
};
