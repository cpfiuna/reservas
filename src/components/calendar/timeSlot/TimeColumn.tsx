
import React from 'react';

interface TimeColumnProps {
  time: string;
}

const TimeColumn: React.FC<TimeColumnProps> = ({ time }) => {
  return (
    <div className="col-span-2 py-4 px-3 text-sm font-medium border-r flex items-center justify-center">
      {time}
    </div>
  );
};

export default TimeColumn;
