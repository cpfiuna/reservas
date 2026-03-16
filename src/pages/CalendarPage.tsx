
import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CalendarView from '@/components/CalendarView';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

const CalendarPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const { isAuthenticated } = useAuth();
  const [retryCount, setRetryCount] = useState(0);
  const [calendarReady, setCalendarReady] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('connecting');

  useEffect(() => {
    let isMounted = true;
    let retryTimeout: NodeJS.Timeout;
    
    const checkConnection = async () => {
      try {
        const { data, error } = await supabase.from('settings').select('key, value').limit(1);
        
        if (error) {
          if (isMounted) {
            setConnectionError(true);
            setConnectionStatus('error');
            toast.error('Error al conectar a la base de datos. Por favor inténtelo de nuevo.');
            
            // Auto-retry logic (max 3 attempts)
            if (retryCount < 3) {
              retryTimeout = setTimeout(() => {
                if (isMounted) {
                  setRetryCount(prev => prev + 1);
                  checkConnection();
                }
              }, 3000); // Retry after 3 seconds
            }
          }
        } else {
          if (isMounted) {
            setConnectionError(false);
            setConnectionStatus('connected');
            setIsLoading(false);
            // Wait a short time before showing the calendar to ensure all data is loaded
            setTimeout(() => {
              if (isMounted) {
                setCalendarReady(true);
              }
            }, 500);
            
            // Setup realtime connection health check
            setupRealtimeMonitoring();
          }
        }
      } catch (err) {
        if (isMounted) {
          setConnectionError(true);
          setConnectionStatus('error');
          toast.error('Error al conectar a la base de datos. Por favor inténtelo de nuevo.');
        }
      }
    };
    
    // Setup realtime monitoring
    const setupRealtimeMonitoring = () => {
      // Log whenever realtime connection status changes
      const channel = supabase.channel('system');
      channel.on('system', { event: 'reconnect' }, () => {
        toast.info('Reconectando a la base de datos...', {
          id: 'reconnecting',
          duration: 2000
        });
      });
      
      channel.on('system', { event: 'disconnect' }, () => {
        setConnectionStatus('disconnected');
        toast.warning('Se perdió la conexión a la base de datos', {
          id: 'disconnected'
        });
      });
      
      channel.on('system', { event: 'connected' }, () => {
        setConnectionStatus('connected');
        toast.success('Conexión a la base de datos restaurada', {
          id: 'connected',
          duration: 2000
        });
      });
      
      channel.subscribe();
    };
    
    // Add session persistence check
    const checkSession = async () => {
      if (!isMounted) return;
      
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          }
      } catch (error) {
        }
    };

    // Start with connection check
    checkConnection();
    
    // Check authentication if authenticated
    if (isAuthenticated) {
      checkSession();
    }
    
    return () => {
      isMounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [isAuthenticated, retryCount]);

  const handleRetry = () => {
    setIsLoading(true);
    setConnectionError(false);
    setRetryCount(0);
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 p-4 pt-6 calendar-page-main">
        <div className="container mx-auto calendar-container">
          {connectionStatus === 'disconnected' && (
            <div className="mb-4 bg-yellow-50 p-2 rounded-md border border-yellow-200 text-yellow-700 text-sm flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Se perdió la conexión a tiempo real. Los datos pueden no estar actualizados.
            </div>
          )}
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64 flex-col">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fiuna-red mb-4"></div>
              <p className="text-gray-500">Conectando a la base de datos...</p>
            </div>
          ) : connectionError ? (
            <div className="p-4 bg-white rounded-lg shadow text-center">
              <h2 className="text-xl font-medium text-red-600 mb-2">Error de conexión</h2>
              <p className="text-gray-600">No se pudo conectar a la base de datos. Intente refrescar la página.</p>
              <button 
                onClick={handleRetry} 
                className="mt-4 px-4 py-2 bg-fiuna-red text-white rounded hover:bg-fiuna-darkred transition-colors"
              >
                Refrescar
              </button>
            </div>
          ) : (
            <div className="calendar-view-container">
              <CalendarView />
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CalendarPage;
