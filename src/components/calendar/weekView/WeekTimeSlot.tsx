
import React from 'react';
import { isBefore, isToday as isDateToday } from 'date-fns';
import { Reservation } from '@/types/reservation';
import { 
  isSameDay, 
  startOfDay, 
  isTimeSlotInRange 
} from '@/utils/calendarUtils';
import { shouldShowReservation } from '@/utils/reservationStyles';
import { useAuth } from '@/context/AuthContext';
import ReservationDisplay from './ReservationDisplay';
import BlockedTimeSlot from './BlockedTimeSlot';
import AvailableTimeSlot from './AvailableTimeSlot';

interface WeekTimeSlotProps {
  day: Date;
  time: string;
  reservations: Reservation[];
  isDateBlocked: (date: Date) => boolean;
  isTimeSlotAvailable: (date: Date, startTime: string, endTime: string) => boolean;
  getNextTimeSlot: (time: string) => string;
  onTimeSlotClick: (date: Date, time: string) => void;
}

const WeekTimeSlot: React.FC<WeekTimeSlotProps> = ({
  day,
  time,
  reservations,
  isDateBlocked,
  isTimeSlotAvailable,
  getNextTimeSlot,
  onTimeSlotClick
}) => {
  const { isAdmin } = useAuth();
  const currentDay = new Date(day);
  const isPastDay = isBefore(currentDay, startOfDay());
  
  // Check if this specific time slot is in the past
  const currentTime = new Date();
  const timeSlotDate = new Date(currentDay);
  const [hours, minutes] = time.split(':').map(Number);
  timeSlotDate.setHours(hours, minutes, 0, 0);
  const isPastTime = isBefore(timeSlotDate, currentTime);
  
  // Find all reservations that are visible in this time slot
  const reservationsAtTime = reservations.filter(r => {
    if (!isSameDay(r.fecha, currentDay)) {
      return false;
    }
    
    // Apply admin filtering for past reservations
    if (!shouldShowReservation(r, isAdmin)) {
      return false;
    }
    
    // A reservation is visible if the time slot is within its range (inclusive of both start and end)
    return isTimeSlotInRange(time, r.inicio, r.fin);
  });
  
  const isSlotBlocked = isDateBlocked(currentDay) || 
      !isTimeSlotAvailable(currentDay, time, getNextTimeSlot(time));
  
  const isDisabled = isPastDay || isPastTime || isSlotBlocked;
  
  return (
    <div 
      key={`${currentDay.toISOString()}-${time}`} 
      className={`py-2 sm:py-3 px-0.5 sm:px-1 text-center relative min-h-[45px] sm:min-h-[60px] cursor-pointer hover:bg-gray-50 border-r last:border-r-0 group
        ${isDisabled ? 'bg-gray-50' : ''}`}
      onClick={!isDisabled ? () => onTimeSlotClick(currentDay, time) : undefined}
    >
      {reservationsAtTime.length > 0 ? (
        <ReservationDisplay reservation={reservationsAtTime[0]} />
      ) : isDateBlocked(currentDay) ? (
        <BlockedTimeSlot />
      ) : !isDisabled && (
        <AvailableTimeSlot />
      )}
    </div>
  );
};

export default WeekTimeSlot;
