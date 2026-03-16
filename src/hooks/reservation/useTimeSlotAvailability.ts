
import { useState, useEffect } from 'react';
import { timeOptions } from '@/utils/timeUtils';
import { isToday as isDateToday } from 'date-fns';
import { Reservation } from '@/types/reservation';
import { isSameDay } from '@/utils/timeUtils';

export const useTimeSlotAvailability = (
  fecha: Date | undefined, 
  inicio: string, 
  setInicio: (value: string) => void,
  fin: string,
  setFin: (value: string) => void,
  reservations: Reservation[],
  isTimeSlotAvailable: (date: Date, startTime: string, endTime: string, excludeId?: string) => boolean
) => {
  // Available times based on reservations
  const [availableTimes, setAvailableTimes] = useState<string[]>(timeOptions);
  const [availableEndTimes, setAvailableEndTimes] = useState<string[]>([]);

  // Update available times based on selected date and existing reservations
  useEffect(() => {
    if (fecha) {
      let filteredTimeOptions = [...timeOptions];
      if (isDateToday(fecha)) {
        const currentTime = new Date();
        const currentHour = currentTime.getHours();
        const currentMinute = currentTime.getMinutes();
        
        filteredTimeOptions = timeOptions.filter(time => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours > currentHour || (hours === currentHour && minutes > currentMinute);
        });
      }
      
      const availableTimes = filteredTimeOptions.filter(time => {
        return filteredTimeOptions.some(endTime => {
          if (endTime <= time) return false;
          
          const hasOverlap = reservations.some(reservation => {
            if (!isSameDay(reservation.fecha, fecha)) return false;
            
            const resStart = reservation.inicio;
            const resEnd = reservation.fin;
            
            return (
              (time >= resStart && time < resEnd) || 
              (endTime > resStart && endTime <= resEnd) || 
              (time <= resStart && endTime >= resEnd)
            );
          });
          
          return !hasOverlap && isTimeSlotAvailable(fecha, time, endTime);
        });
      });
      
      setAvailableTimes(availableTimes);
      
      // Allow flexibility when changing date - don't automatically clear time selection
      if (inicio && !availableTimes.includes(inicio)) {
        // Only clear time if it's not available on the new date
        setInicio('');
        setFin('');
      } else if (inicio) {
        updateAvailableEndTimes(inicio);
      }
    }
  }, [fecha, reservations, isTimeSlotAvailable, inicio, setInicio, setFin]);

  // Auto-select end time based on start time
  useEffect(() => {
    if (inicio && availableEndTimes.length > 0 && !fin) {
      const [startHour, startMinute] = inicio.split(':').map(Number);
      let endHour = startHour + 1;
      let endMinute = startMinute;
      
      if (endHour > 22 || (endHour === 22 && endMinute > 0)) {
        endHour = 22;
        endMinute = 0;
      }
      
      const defaultEndTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
      
      if (availableEndTimes.includes(defaultEndTime)) {
        setFin(defaultEndTime);
      } else if (availableEndTimes.length > 0) {
        setFin(availableEndTimes[0]);
      }
    }
  }, [inicio, availableEndTimes, fin, setFin]);

  // Update available end times based on start time
  const updateAvailableEndTimes = (startTime: string) => {
    if (!fecha || !startTime) {
      setAvailableEndTimes([]);
      return;
    }
    
    const endTimes = timeOptions.filter(time => {
      if (time <= startTime) return false;
      
      const hasOverlap = reservations.some(reservation => {
        if (!isSameDay(reservation.fecha, fecha)) return false;
        
        const resStart = reservation.inicio;
        const resEnd = reservation.fin;
        
        return (
          (startTime < resEnd && time > resStart)
        );
      });
      
      return !hasOverlap && isTimeSlotAvailable(fecha, startTime, time);
    });
    
    setAvailableEndTimes(endTimes);
    
    // Don't automatically clear end time - allow flexibility when changing start time
    if (fin && !endTimes.includes(fin)) {
      setFin('');
    }
  };

  return {
    availableTimes,
    availableEndTimes,
    updateAvailableEndTimes
  };
};
