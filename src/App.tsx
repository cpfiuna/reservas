
import React, { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ReservationProvider } from "@/context/ReservationContext";
import { VenueProvider } from "@/context/VenueContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Index from "./pages/Index";
import CalendarPage from "./pages/CalendarPage";
import ReservationPage from "./pages/ReservationPage";
import AdminPage from "./pages/AdminPage";
import LoginPage from "./pages/LoginPage";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ConfirmReservationPage from "./pages/ConfirmReservationPage";
import PendingConfirmationPage from "./pages/PendingConfirmationPage";
import NotFound from "./pages/NotFound";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Framer Motion for animations
import { MotionConfig } from "framer-motion";

const queryClient = new QueryClient();

// Enhanced route handler with better token processing
const RouteHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  useEffect(() => {
    // Process URL parameters and hash fragments for auth
    const processAuthParams = async () => {

      // IMPORTANT: Check for password recovery FIRST before any other checks
      // This prevents auto-login during password reset flow
      if (location.hash.includes('type=recovery')) {

        if (!location.pathname.includes('reset-password')) {
          navigate('/auth/reset-password' + location.hash, { replace: true });
        }
        return; // Exit early to prevent any other auth processing
      }
      // Handle email confirmation token in hash or query params
      if (location.hash.includes('confirmation_token=') || 
          location.search.includes('confirmation_token=')) {

        try {
          // Extract email from the URL if available
          let email = '';
          const urlParams = new URLSearchParams(location.search);
          if (urlParams.has('email')) {
            email = urlParams.get('email') || '';
          } else {
            // Try to extract from hash
            const hashParams = new URLSearchParams(location.hash.replace('#', '?'));
            email = hashParams.get('email') || '';
          }
          
          // Let Supabase handle the token automatically
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {

            toast.error('Error al confirmar el email');
            navigate('/login');
            return;
          }
          
          if (session) {

            toast.success('Email confirmado con éxito');
            navigate('/admin');
            return;
          } else {
            // If no session was created automatically, but we have the email,
            // we could try to sign in the user (this would require password though)
            toast.success('Email confirmado con éxito');
            navigate('/login');
            return;
          }
        } catch (error) {

          toast.error('Error al confirmar el email');
          navigate('/login');
          return;
        }
      }
      
      // Handle access token in hash (sign in/up success)
      if (location.hash.includes('access_token=')) {

        // Double-check it's not a recovery flow (should have been caught above)
        if (location.hash.includes('type=recovery')) {

          if (!location.pathname.includes('reset-password')) {
            navigate('/auth/reset-password' + location.hash, { replace: true });
          }
          return;
        }
        
        // Let Supabase handle the session automatically for other auth flows
        // Just wait briefly for it to process before redirecting
        setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {

            if (location.hash.includes('type=signup')) {
              toast.success('Registro exitoso');
              navigate('/admin');
              return;
            }
            
            // Generic auth success
            toast.success('Inicio de sesión exitoso');
            navigate('/admin');
          } else {

            toast.error('Error de autenticación');
            navigate('/login');
          }
        }, 500);
        return;
      }
      
      // Handle email confirmation token
      if (location.hash.includes('error=')) {

        if (location.hash.includes('error=access_denied') && 
            location.hash.includes('error_code=otp_expired')) {
          // Redirect to auth page with proper error message
          navigate('/auth/reset-password?error=expired');
          return;
        }
        
        // Generic error fallback
        toast.error('Error de autenticación');
        navigate('/login');
        return;
      }
    };

    processAuthParams();
  }, [location, navigate, isAuthenticated]);
  
  return null;
};

// Check for session from URL params on initial load
const InitialSessionCheck = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {

      }
    };
    
    checkSession();
  }, [navigate]);

  return null;
};

// AppRoutes component to wrap the routes with AuthProvider
const AppRoutes = () => {
  return (
    <>
      <RouteHandler />
      <InitialSessionCheck />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/calendario" element={<CalendarPage />} />
        <Route path="/nueva-reserva" element={<ReservationPage />} />
        <Route path="/confirmar-reserva" element={<ConfirmReservationPage />} />
        <Route path="/confirmar-reserva-pendiente" element={<PendingConfirmationPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/*" element={<AuthPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner 
        closeButton={true} 
        position="top-right"
        toastOptions={{
          classNames: {
            closeButton: 'absolute right-2 top-2'
          }
        }}
      />
      <BrowserRouter>
        <AuthProvider>
          <VenueProvider>
            <ReservationProvider>
              <MotionConfig reducedMotion="user">
                <AppRoutes />
              </MotionConfig>
            </ReservationProvider>
          </VenueProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
