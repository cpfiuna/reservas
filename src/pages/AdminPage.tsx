
import React, { useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AdminDashboard from '@/components/AdminDashboard';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const AdminPage: React.FC = () => {
  const { isAdmin, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      toast.error('Debe iniciar sesión para acceder al panel de administración');
      navigate('/login');
    } else if (!isAdmin) {
      toast.error('No tiene permisos para acceder al panel de administración');
      navigate('/');
    }
  }, [isAdmin, isAuthenticated, navigate, loading]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 py-6">
        {loading ? (
          <div className="container mx-auto p-4 text-center">
            <div className="animate-pulse flex flex-col items-center justify-center space-y-4">
              <div className="h-8 w-8 bg-fiuna-red rounded-full animate-spin"></div>
              <div>Verificando permisos...</div>
            </div>
          </div>
        ) : isAdmin ? (
          <AdminDashboard />
        ) : (
          <div className="container mx-auto p-4 text-center">
            <div className="animate-pulse">Redirigiendo...</div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AdminPage;
