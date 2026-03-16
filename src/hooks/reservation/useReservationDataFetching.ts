
import { useState, useEffect, useRef } from 'react';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { Reservation, BlockedDate } from '@/types/reservation';

export const useReservationDataFetching = () => {
  // All state declarations first
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // All refs next
  const mountedRef = useRef(true);
  const fetchAttemptsRef = useRef(0);
  const maxRetries = 3;

  // Helper for safe state updates
  const safeUpdate = (callback: () => void) => {
    if (mountedRef.current) {
      callback();
    }
  };

  // Define fetching functions before using them in useEffect
  const fetchReservations = async (): Promise<void> => {
    if (!mountedRef.current) return;
    
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .not('status', 'in', '(cancelled,rejected)');

      if (error) {
        throw error;
      }

      if (data) {
        const formattedData = data.map(item => {
          
          // Explicitly parse the date with local timezone consideration
          const parts = item.fecha.split('-');
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JS
          const day = parseInt(parts[2], 10);
          
          const dateObj = new Date(year, month, day, 12, 0, 0); // Set to noon to avoid timezone issues
          
          return {
            id: item.id,
            responsable: item.responsable,
            email: item.email,
            motivo: item.motivo,
            fecha: dateObj,
            inicio: item.inicio,
            fin: item.fin,
            personas: item.personas,
            createdAt: new Date(item.created_at),
            status: item.status || 'pending',
            admin_notes: item.admin_notes,
            affiliation: item.affiliation,
            updated_at: item.updated_at ? new Date(item.updated_at) : undefined,
            updated_by: item.updated_by || undefined
          };
        });
        
        safeUpdate(() => {
          setReservations(formattedData);
        });
      }
    } catch (error) {
      if (mountedRef.current) {
        toast.error('Error al cargar las reservas');
      }
    }
  };

  const fetchBlockedDates = async (): Promise<void> => {
    if (!mountedRef.current) return;
    
    try {
      const { data, error } = await supabase
        .from('blocked_dates')
        .select('*');

      if (error) {
        return;
      }

      if (data) {
        const formattedData = data.map(item => {
          // Explicitly parse the date with local timezone consideration
          const parts = item.fecha.split('-');
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JS
          const day = parseInt(parts[2], 10);
          
          const dateObj = new Date(year, month, day, 12, 0, 0); // Set to noon to avoid timezone issues
          
          return {
            id: item.id,
            fecha: dateObj,
            motivo: item.motivo,
            created_at: new Date(item.created_at),
            created_by: item.created_by
          };
        });
        
        safeUpdate(() => {
          setBlockedDates(formattedData);
        });
      }
    } catch (error) {
      // Error fetching blocked dates
    }
  };

  // useEffect comes last
  useEffect(() => {
    mountedRef.current = true;
    
    // Fetch initial reservations and blocked dates
    const initialize = async () => {

      try {
        setIsLoading(true);
        
        await fetchReservations();
        await fetchBlockedDates();
        
        if (mountedRef.current) {
          setIsLoading(false);
        }
      } catch (error) {
        
        // Retry logic for initialization
        if (fetchAttemptsRef.current < maxRetries) {
          fetchAttemptsRef.current += 1;
          
          setTimeout(() => {
            if (mountedRef.current) {
              initialize();
            }
          }, 2000); // Wait 2 seconds before retrying
        } else {
          toast.error('Error al cargar los datos de reservas. Por favor recargue la página.');
          
          if (mountedRef.current) {
            setIsLoading(false);
          }
        }
      }
    };
    
    initialize();

    // Subscribe to realtime changes for reservations
    const reservationsChannel = supabase
      .channel('reservations_realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'reservations' }, 
        (payload) => {
          fetchReservations();
        }
      )
      .subscribe((status) => {
        // Reservations channel status changed
      });

    // Subscribe to realtime changes for blocked_dates
    const blockedDatesChannel = supabase
      .channel('blocked_dates_realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'blocked_dates' }, 
        (payload) => {
          fetchBlockedDates();
        }
      )
      .subscribe((status) => {
        // Blocked dates channel status changed
      });

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(reservationsChannel);
      supabase.removeChannel(blockedDatesChannel);
    };
  }, []);

  return {
    reservations,
    blockedDates,
    isLoading,
    fetchReservations,
    fetchBlockedDates
  };
};
