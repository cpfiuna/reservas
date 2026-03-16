
import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ReservationForm from '@/components/ReservationForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ReservationPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize connection to Supabase
    const checkConnection = async () => {
      try {
        const { data, error } = await supabase.from('settings').select('key, value').limit(1);
        
        if (error) {
          toast.error('Error al conectar a la base de datos. Por favor inténtelo de nuevo.');
        } else {
          }
      } catch (err) {
        toast.error('Error al conectar a la base de datos. Por favor inténtelo de nuevo.');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkConnection();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 p-4 pt-6">
        <div className="mb-8 text-center">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-fiuna-gray">Nueva Reserva</h1>
          <p className="text-gray-500">Complete el formulario para reservar el Quincho</p>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fiuna-red"></div>
          </div>
        ) : (
          <ReservationForm />
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ReservationPage;
