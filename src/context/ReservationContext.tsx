
import React, { createContext, useContext, useState } from 'react';
import { isBefore, startOfDay } from 'date-fns';
import { toast } from "sonner";
import { Reservation, ReservationContextType } from '@/types/reservation';
import { useReservationsData } from '@/hooks/useReservationsData';
import { useAvailabilityCheck } from '@/hooks/useAvailabilityCheck';

const ReservationContext = createContext<ReservationContextType | undefined>(undefined);

export const ReservationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Call all useState hooks first
  const [mounted, setMounted] = useState(true);
  
  const { 
    reservations, 
    blockedDates, 
    isLoading, 
    addReservation: addReservationToDb, 
    deleteReservation: deleteReservationFromDb,
    updateReservation: updateReservationInDb,
    dataInitialized
  } = useReservationsData();

  const { 
    getReservationsByDate, 
    isDateBlocked, 
    isTimeSlotAvailable 
  } = useAvailabilityCheck(reservations, blockedDates);

  // Helper function to check if two dates are the same day
  const isToday = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() && 
           date1.getMonth() === date2.getMonth() && 
           date1.getFullYear() === date2.getFullYear();
  };

  const addReservation = async (newReservation: Omit<Reservation, 'id' | 'createdAt'>): Promise<Reservation | null> => {
    try {
      // Check for past dates or times
      const currentDate = new Date();
      if (isBefore(newReservation.fecha, startOfDay(currentDate))) {
        toast.error('No se pueden realizar reservas para fechas pasadas');
        return null;
      }

      // Check if the current time is after the requested start time for today
      if (isToday(newReservation.fecha, currentDate)) {
        const [hours, minutes] = newReservation.inicio.split(':').map(Number);
        const requestedTime = new Date();
        requestedTime.setHours(hours, minutes, 0, 0);
        
        if (isBefore(requestedTime, currentDate)) {
          toast.error('No se pueden realizar reservas para horarios pasados');
          return null;
        }
      }

      // Check if date is blocked
      if (isDateBlocked(newReservation.fecha)) {
        toast.error('Esta fecha no está disponible para reservas');
        return null;
      }

      // Check if time slot is available
      if (!isTimeSlotAvailable(newReservation.fecha, newReservation.inicio, newReservation.fin)) {
        toast.error('El horario seleccionado no está disponible');
        return null;
      }

      return await addReservationToDb(newReservation);
    } catch (error) {
      toast.error('Error al crear la reserva');
      return null;
    }
  };

  return (
    <ReservationContext.Provider 
      value={{ 
        reservations, 
        blockedDates,
        addReservation, 
        deleteReservation: deleteReservationFromDb, 
        updateReservation: updateReservationInDb,
        getReservationsByDate,
        isTimeSlotAvailable,
        isDateBlocked,
        isLoading,
        dataInitialized
      }}
    >
      {children}
    </ReservationContext.Provider>
  );
};

export const useReservations = () => {
  const context = useContext(ReservationContext);
  if (context === undefined) {
    throw new Error('useReservations must be used within a ReservationProvider');
  }
  return context;
};

export type { Reservation };
