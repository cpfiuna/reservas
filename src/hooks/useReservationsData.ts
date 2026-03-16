
import { useState, useEffect } from 'react';
import { useReservationDataFetching } from './reservation/useReservationDataFetching';
import { useReservationMutations } from './reservation/useReservationMutations';

export const useReservationsData = () => {
  // All useState hooks must be called before any other hooks
  const [dataInitialized, setDataInitialized] = useState(false);
  
  const {
    reservations,
    blockedDates,
    isLoading,
    fetchReservations,
    fetchBlockedDates
  } = useReservationDataFetching();

  const {
    addReservation,
    deleteReservation,
    updateReservation
  } = useReservationMutations(fetchReservations);

  // Track when data is initialized - useEffect must be called after all other hooks
  useEffect(() => {
    if (!isLoading && !dataInitialized) {
      setDataInitialized(true);
    }
  }, [isLoading, dataInitialized]);

  return {
    reservations,
    blockedDates,
    isLoading,
    addReservation,
    deleteReservation,
    updateReservation,
    fetchReservations,
    fetchBlockedDates,
    dataInitialized
  };
};
