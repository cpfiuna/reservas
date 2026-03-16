
import React, { useEffect } from 'react';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import AuthForm from '@/components/AuthForm';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const AuthPage = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isResetPassword = location.pathname.includes('/reset-password');
  const isSignUp = location.pathname.includes('/signup');

  useEffect(() => {
    // Handle email confirmation in the URL
    const handleEmailConfirmation = async () => {
      if (location.search.includes('confirmation_token=') || 
          location.hash.includes('confirmation_token=')) {
        try {
          // Get the session - Supabase should have processed the token
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            toast.error('Error al confirmar el email');
            return;
          }
          
          if (session) {
            toast.success('Email confirmado con éxito');
            navigate('/admin');
          } else {
            toast.info('Email confirmado. Por favor inicie sesión.');
            navigate('/login');
          }
        } catch (err) {
          toast.error('Error al procesar la confirmación');
        }
      }
    };
    
    // Handle password reset hash
    const handlePasswordReset = async () => {
      // Extract hash parameters if this is a password reset flow
      if (location.hash && location.hash.includes('type=recovery')) {
        // The hash contains the token - Supabase SDK will handle it automatically
        // Just show a user-friendly message
        toast.info('Por favor establezca su nueva contraseña');
      }
    };
    
    // Check for error parameters in the URL
    const params = new URLSearchParams(location.search);
    const error = params.get('error');
    
    if (error === 'expired') {
      toast.error('El enlace de recuperación ha expirado. Por favor, solicite uno nuevo.');
    }
    
    // Handle hash fragments that might contain auth information
    if (location.hash) {
      if (location.hash.includes('error')) {
        toast.error('Ocurrió un error durante la autenticación. Por favor, intente nuevamente.');
      } else if (location.hash.includes('type=recovery')) {
        handlePasswordReset();
      } else if (location.hash.includes('confirmation_token=')) {
        handleEmailConfirmation();
      }
    } else if (location.search && location.search.includes('confirmation_token=')) {
      handleEmailConfirmation();
    }
  }, [location, navigate]);

  // Redirect to home if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4">
        <AuthForm isResetPassword={isResetPassword} isSignUp={isSignUp} />
      </main>
      <Footer />
    </div>
  );
};

export default AuthPage;
