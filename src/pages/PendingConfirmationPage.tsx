import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mail, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PendingConfirmationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const id = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [reservation, setReservation] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReservation = async () => {
      if (!id) {
        setError('ID de reserva no proporcionado');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await (supabase as any)
          .from('reservations')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) {
          setError('No se pudo obtener la reserva');
        } else if (!data) {
          setError('Reserva no encontrada');
        } else {
          setReservation(data);
        }
      } catch (err) {
        setError('Error al obtener la reserva');
      } finally {
        setLoading(false);
      }
    };

    fetchReservation();
  }, [id]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8"
        >
          {loading && (
            <div className="text-center">
              <Loader2 className="h-16 w-16 animate-spin text-fiuna-red mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Procesando...</h2>
              <p className="text-gray-600">
                Por favor espera un momento.
              </p>
            </div>
          )}

          {!loading && (error || !reservation) && (
            <div className="text-center">
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Algo salió mal</h2>
              <p className="text-gray-600 mb-6">{error || 'No se encontró la reserva.'}</p>
              <div className="flex items-center justify-center gap-4">
                <button 
                  onClick={() => navigate('/nueva-reserva')} 
                  className="bg-fiuna-red hover:bg-fiuna-darkred text-white font-medium py-2 px-6 rounded-md transition-colors"
                >
                  Nueva reserva
                </button>
                <button 
                  onClick={() => navigate('/calendario')} 
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-6 rounded-md transition-colors"
                >
                  Ver calendario
                </button>
              </div>
            </div>
          )}

          {!loading && reservation && (
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.6 }}
              >
                <Mail className="h-16 w-16 text-fiuna-red mx-auto mb-4" />
              </motion.div>

              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                ¡Revisa tu correo!
              </h2>

              <p className="text-lg text-gray-700 mb-6">
                Hemos enviado un correo a <strong>{reservation.email}</strong> con un enlace para confirmar tu reserva.
              </p>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 text-left">
                <p className="text-sm text-yellow-800">
                  <strong>Importante:</strong> Debes confirmar tu correo para que la reserva quede registrada y pueda ser aprobada por un administrador. Si no confirmas, la reserva no será procesada.
                </p>
              </div>

              <p className="text-sm text-gray-500 mb-6">
                Si no ves el correo, revisa la carpeta de spam o correo no deseado.
              </p>

              <div className="flex items-center justify-center">
                <button 
                  onClick={() => navigate('/calendario')} 
                  className="bg-fiuna-red hover:bg-fiuna-darkred text-white font-medium py-2 px-6 rounded-md transition-colors"
                >
                  Ir al calendario
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
