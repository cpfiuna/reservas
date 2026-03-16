
import React from 'react';
import { format, isSameMonth, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Reservation } from '@/context/ReservationContext';
import WeekDayHeader from './monthView/WeekDayHeader';
import MonthDayCell from './monthView/MonthDayCell';

interface MonthViewProps {
  currentDate: Date;
  reservations: Reservation[];
  isDateBlocked: (date: Date) => boolean;
  onDayClick: (day: Date) => void;
}

const MonthView: React.FC<MonthViewProps> = ({ 
  currentDate, 
  reservations, 
  isDateBlocked,
  onDayClick
}) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { locale: es });
  const endDate = endOfWeek(monthEnd, { locale: es });
  
  const renderDays = () => {
    let rows = [];
    let cells = [];
    let day = startDate;
    
    // Loop through days until we reach the end date
    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = new Date(day);
        
        cells.push(
          <MonthDayCell
            key={`cell-${day.toISOString()}`}
            day={cloneDay}
            monthStart={monthStart}
            reservations={reservations}
            isDateBlocked={isDateBlocked}
            onDayClick={onDayClick}
          />
        );
        
        day = addDays(day, 1);
      }
      
      rows.push(
        <div key={`row-${day.toISOString()}`} className="grid grid-cols-7 w-full">
          {cells}
        </div>
      );
      
      cells = [];
    }
    
    return rows;
  };

  return (
    <div className="rounded-lg overflow-hidden shadow-sm border border-gray-100 month-view-container">
      <WeekDayHeader startDate={startDate} />
      {renderDays()}
    </div>
  );
};

export default MonthView;
