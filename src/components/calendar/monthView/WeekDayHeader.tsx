
import React from 'react';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface WeekDayHeaderProps {
  startDate: Date;
}

const WeekDayHeader: React.FC<WeekDayHeaderProps> = ({ startDate }) => {
  const weekDays = [];
  
  for (let i = 0; i < 7; i++) {
    weekDays.push(
      <div key={`header-${i}`} className="text-center p-2 bg-white border-b font-medium text-xs uppercase text-black">
        {format(addDays(startDate, i), 'EEE', { locale: es })}
      </div>
    );
  }
  
  return <div className="grid grid-cols-7 w-full">{weekDays}</div>;
};

export default WeekDayHeader;
