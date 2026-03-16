
import React from 'react';
import { isBefore, startOfDay } from 'date-fns';
import { Reservation } from '@/types/reservation';
import { useAuth } from '@/context/AuthContext';
import DayNumber from './DayNumber';
import DayCellContent from './DayCellContent';

interface MonthDayCellProps {
  day: Date;
  monthStart: Date;
  reservations: Reservation[];
  isDateBlocked: (date: Date) => boolean;
  onDayClick: (day: Date) => void;
}

const MonthDayCell: React.FC<MonthDayCellProps> = ({
  day,
  monthStart,
  reservations,
  isDateBlocked,
  onDayClick
}) => {
  const { isAdmin } = useAuth();
  const today = new Date();
  const isCurrentDay = 
    day.getDate() === today.getDate() && 
    day.getMonth() === today.getMonth() && 
    day.getFullYear() === today.getFullYear();
    
  const isCurrentMonth = day.getMonth() === monthStart.getMonth();
  const isPastDay = isBefore(day, startOfDay(new Date()));
  const isDayBlocked = isDateBlocked(day);
  
  // Admins can click on any day, regular users can only click on non-past days
  // Do not allow clicking blocked days (e.g., Sundays) for non-admin users
  const canClickDay = isAdmin || (!isPastDay && !isDayBlocked);
  
  // Filter reservations for this specific day
  const dayReservations = reservations.filter(r => {
    // Check if it's the same day
    return r.fecha.getDate() === day.getDate() &&
           r.fecha.getMonth() === day.getMonth() &&
           r.fecha.getFullYear() === day.getFullYear();
  });
  
  return (
    <div 
      className={`relative p-1 sm:p-2 border border-gray-100 min-h-[70px] sm:min-h-[80px] overflow-hidden month-day-cell
        ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
        ${isCurrentDay ? 'bg-fiuna-red/10' : ''}
        ${isPastDay || isDayBlocked ? 'opacity-60' : ''}
        ${canClickDay ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'}`}
      onClick={canClickDay ? () => onDayClick(day) : undefined}
    >
      <div className="text-left">
        <DayNumber 
          day={day}
          isCurrentDay={isCurrentDay}
          isDayBlocked={isDayBlocked}
        />
        <div className="clear-both"></div>
      </div>
      <DayCellContent 
        isDayBlocked={isDayBlocked}
        dayReservations={dayReservations}
      />
    </div>
  );
};

export default MonthDayCell;
