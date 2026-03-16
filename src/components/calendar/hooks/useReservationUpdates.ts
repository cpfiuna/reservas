import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export const useReservationUpdates = (reservations: any[], isLoading: boolean, dataInitialized: boolean) => {
  // Reference to track reservation count changes for notifications
  const [prevReservationCount, setPrevReservationCount] = useState(0);
  
  // Log important state changes for debugging - only in development
  useEffect(() => {
    logger.debug('CalendarView component updated', {
      isLoading,
      dataInitialized,
      reservationsCount: reservations.length
    });
  }, [isLoading, dataInitialized, reservations.length]);
  
  // Add effect to notify user of real-time updates
  useEffect(() => {
    // Check if this is an update (not initial load)
    if (dataInitialized && prevReservationCount > 0 && prevReservationCount !== reservations.length) {
      toast.info('El calendario se ha actualizado con nuevas reservas', {
        id: 'calendar-update',
        duration: 2000
      });
    }
    
    // Update previous count
    setPrevReservationCount(reservations.length);
  }, [reservations.length, dataInitialized, prevReservationCount]);

  return {
    // We don't actually need to return anything from this hook
    // since it's just for side effects
  };
};
