
import React from 'react';
import { startOfWeek, endOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Reservation } from '@/context/ReservationContext';
import WeekHeader from './weekView/WeekHeader';
import WeekTimeSlot from './weekView/WeekTimeSlot';
import { getNextTimeSlot } from '@/utils/calendarUtils';

interface WeekViewProps {
  currentDate: Date;
  reservations: Reservation[];
  isDateBlocked: (date: Date) => boolean;
  isTimeSlotAvailable: (date: Date, startTime: string, endTime: string) => boolean;
  timeOptions: string[];
  onTimeSlotClick: (date: Date, time: string) => void;
}

const WeekView: React.FC<WeekViewProps> = ({ 
  currentDate, 
  reservations, 
  isDateBlocked,
  isTimeSlotAvailable,
  timeOptions,
  onTimeSlotClick
}) => {
  const startOfWeekDate = startOfWeek(currentDate, { locale: es });
  const endOfWeekDate = endOfWeek(currentDate, { locale: es });
  
  const renderTimeGrid = () => {
    const rows = [];
    
    // For each time slot
    for (let time of timeOptions) {
      const timeRow = [];
      
      // Add time column
      timeRow.push(
        <div key={`time-${time}`} className="py-2 sm:py-3 text-center text-[10px] sm:text-xs font-medium border-r flex items-center justify-center week-time-column">
          {time}
        </div>
      );
      
      // Add time slots for each day
      let day = startOfWeekDate;
      while (day <= endOfWeekDate) {
        timeRow.push(
          <WeekTimeSlot 
            key={`${day.toISOString()}-${time}`}
            day={day}
            time={time}
            reservations={reservations}
            isDateBlocked={isDateBlocked}
            isTimeSlotAvailable={isTimeSlotAvailable}
            getNextTimeSlot={getNextTimeSlot}
            onTimeSlotClick={onTimeSlotClick}
          />
        );
        
        day = addDays(day, 1);
      }
      
      rows.push(
        <div key={`row-${time}`} className="grid grid-cols-8 border-b">
          {timeRow}
        </div>
      );
    }
    
    return rows;
  };

  return (
    <div className="overflow-x-auto week-view-container">
      <div className="min-w-full sm:min-w-[900px] border rounded-lg overflow-hidden shadow-sm">
        <WeekHeader currentDate={currentDate} />
        {renderTimeGrid()}
      </div>
    </div>
  );
};

export default WeekView;
