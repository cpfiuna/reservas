
import React from 'react';
import { format, isSameDay, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface WeekHeaderProps {
  currentDate: Date;
}

const WeekHeader: React.FC<WeekHeaderProps> = ({ currentDate }) => {
  const startOfWeekDate = startOfWeek(currentDate, { locale: es });
  const endOfWeekDate = endOfWeek(currentDate, { locale: es });
  const headerCells = [];
  
  // Add time header
  headerCells.push(
    <div key="time-header" className="py-2 text-center font-medium text-xs border-r">
      Hora
    </div>
  );
  
  // Add day headers
  let day = startOfWeekDate;
  while (day <= endOfWeekDate) {
    // Capitalize first letter of day name
    const formattedDay = format(day, 'EEEE, d', { locale: es });
    const capitalizedDay = formattedDay.charAt(0).toUpperCase() + formattedDay.slice(1);
    const isCurrentDay = isSameDay(day, new Date());
    
    headerCells.push(
      <div 
        key={`header-${day.toISOString()}`} 
        className={`py-2 text-center font-medium text-xs cursor-pointer hover:underline border-r last:border-r-0
          ${isCurrentDay ? 'text-fiuna-red' : ''}`}
      >
        {capitalizedDay}
      </div>
    );
    day = addDays(day, 1);
  }
  
  return (
    <div className="grid grid-cols-8 border-b">
      {headerCells}
    </div>
  );
};

export default WeekHeader;
