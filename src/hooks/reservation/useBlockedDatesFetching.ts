
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BlockedDate } from '@/types/reservation';
import { toast } from 'sonner';

export const useBlockedDatesFetching = () => {
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    fetchBlockedDates();
    
    // Subscribe to changes
    const subscription = supabase
      .channel('blocked_dates_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'blocked_dates' }, 
        () => {
          fetchBlockedDates();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchBlockedDates = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('blocked_dates')
        .select('*');

      if (error) {
        toast.error('Error al cargar fechas bloqueadas');
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
            created_by: item.created_by,
            start_time: item.start_time,
            end_time: item.end_time
          };
        });
        
        setBlockedDates(formattedData);
      }
    } catch (error) {
      toast.error('Error al cargar fechas bloqueadas');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    blockedDates,
    isLoading,
    fetchBlockedDates
  };
};
