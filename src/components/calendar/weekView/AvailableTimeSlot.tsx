
import React from 'react';
import { PlusCircle } from 'lucide-react';

const AvailableTimeSlot: React.FC = () => {
  return (
    <div className="hidden group-hover:flex items-center justify-center h-full text-xs text-gray-600">
      <PlusCircle className="w-3 h-3 mr-1" />
      Reservar
    </div>
  );
};

export default AvailableTimeSlot;
