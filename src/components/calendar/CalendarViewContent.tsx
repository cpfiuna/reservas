
import React from 'react';
import { ViewType } from './hooks/useCalendarState';
import MonthView from '@/components/calendar/MonthView';
import WeekView from '@/components/calendar/WeekView';
import DayView from '@/components/calendar/DayView';
import AgendaView from '@/components/calendar/AgendaView';
import { timeOptions } from '@/utils/timeUtils';
import { Reservation } from '@/context/ReservationContext';

interface CalendarViewContentProps {
  view: ViewType;
  currentDate: Date;
  reservations: Reservation[];
  isDateBlocked: (date: Date) => boolean;
  isTimeSlotAvailable: (date: Date, startTime: string, endTime: string) => boolean;
  onDayClick: (day: Date) => void;
  onTimeSlotClick: (date: Date, time: string) => void;
}

const CalendarViewContent: React.FC<CalendarViewContentProps> = ({
  view,
  currentDate,
  reservations,
  isDateBlocked,
  isTimeSlotAvailable,
  onDayClick,
  onTimeSlotClick
}) => {
  return (
    <div className="mt-4">
      {view === 'month' && (
        <MonthView 
          key={`month-${reservations.length}`}
          currentDate={currentDate}
          reservations={reservations}
          isDateBlocked={isDateBlocked}
          onDayClick={onDayClick}
        />
      )}
      
      {view === 'week' && (
        <WeekView 
          key={`week-${reservations.length}`}
          currentDate={currentDate}
          reservations={reservations}
          isDateBlocked={isDateBlocked}
          isTimeSlotAvailable={isTimeSlotAvailable}
          timeOptions={timeOptions}
          onTimeSlotClick={onTimeSlotClick}
        />
      )}
      
      {view === 'day' && (
        <DayView 
          key={`day-${reservations.length}`}
          currentDate={currentDate}
          reservations={reservations}
          isDateBlocked={isDateBlocked}
          isTimeSlotAvailable={isTimeSlotAvailable}
          timeOptions={timeOptions}
          onTimeSlotClick={onTimeSlotClick}
        />
      )}
      
      {view === 'agenda' && (
        <AgendaView 
          key={`agenda-${reservations.length}`}
          reservations={reservations}
        />
      )}
    </div>
  );
};

export default CalendarViewContent;
