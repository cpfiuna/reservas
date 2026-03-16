
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminPanel from '@/components/AdminPanel';
import Header from '@/components/Header';
import { motion } from 'framer-motion';
import Footer from '@/components/Footer';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const Admin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if admin is logged in
    const checkAdminStatus = async () => {
      try {
        // Verify we have a valid Supabase session (server-validated)
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) {
          // Clear any stale localStorage state
          localStorage.removeItem('adminLoggedIn');
          localStorage.removeItem('adminEmail');
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminTokenExpiry');
          toast.error('Sesión inválida, inicie sesión nuevamente');
          navigate('/', { replace: true });
          return;
        }

        // Verify admin status server-side via profiles table
        const userId = sessionData.session.user.id;
        const { data: isAdminData, error: isAdminError } = await (supabase as any)
          .rpc('is_admin', { user_id: userId });

        if (isAdminError || !isAdminData) {
          localStorage.removeItem('adminLoggedIn');
          localStorage.removeItem('adminEmail');
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminTokenExpiry');
          toast.error('Acceso no autorizado');
          navigate('/', { replace: true });
          return;
        }
        
        // Admin is logged in with valid session
        setIsAdmin(true);
      } catch (error) {
        toast.error('Error de autenticación');
        navigate('/', { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
    
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // User signed out, clear admin state
        localStorage.removeItem('adminLoggedIn');
        localStorage.removeItem('adminEmail');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminTokenExpiry');
        setIsAdmin(false);
        navigate('/', { replace: true });
      }
    });
    
    // Cleanup listener on unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-fiuna-red border-r-transparent align-[-0.125em]"></div>
        <p className="mt-4 text-gray-600">Cargando panel de administración...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 container mx-auto p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <AdminPanel />
        </motion.div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Admin;
