
import React from 'react';
import { format, isSameDay } from 'date-fns';

interface DayNumberProps {
  day: Date;
  isCurrentDay: boolean;
  isDayBlocked: boolean;
}

const DayNumber: React.FC<DayNumberProps> = ({ day, isCurrentDay, isDayBlocked }) => {
  return (
    <span className={`text-sm rounded-full w-7 h-7 flex items-center justify-center float-left
      ${isCurrentDay ? 'bg-fiuna-red text-white font-medium' : ''}
      ${isDayBlocked ? 'bg-gray-100 text-gray-900' : ''}
    `}>
      {format(day, 'd')}
    </span>
  );
};

export default DayNumber;
