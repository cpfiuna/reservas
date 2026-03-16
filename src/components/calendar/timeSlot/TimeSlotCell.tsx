
import React, { useState } from 'react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { PlusCircle } from 'lucide-react';
import { Reservation } from '@/types/reservation';
import { formatTimeWithoutSeconds } from '@/utils/calendarUtils';
import { getReservationClasses, getReservationStatusText, isReservationPast } from '@/utils/reservationStyles';
import { useAuth } from '@/context/AuthContext';
import ReservationDetailDialog from '../../admin/ReservationDetailDialog';

interface TimeSlotCellProps {
  time: string;
  currentDate: Date;
  slotReservations: Reservation[];
  isTimeSlotDisabled: boolean;
  isDateBlocked: (date: Date) => boolean;
  onTimeSlotClick: (date: Date, time: string) => void;
}

const TimeSlotCell: React.FC<TimeSlotCellProps> = ({
  time,
  currentDate,
  slotReservations,
  isTimeSlotDisabled,
  isDateBlocked,
  onTimeSlotClick
}) => {
  const { isAdmin } = useAuth();
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const isPast = slotReservations.length > 0 ? isReservationPast(slotReservations[0]) : false;
  const reservationClasses = slotReservations.length > 0 ? getReservationClasses(slotReservations[0].status, slotReservations[0].approved, isPast) : '';
  const statusText = slotReservations.length > 0 ? getReservationStatusText(slotReservations[0].status, slotReservations[0].approved, isPast) : '';

  const handleReservationClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdmin && slotReservations.length > 0) {
      setShowDetailDialog(true);
    }
  };

  return (
    <>
      <div 
        className={`col-span-10 py-2 px-3 relative min-h-[70px] flex items-center
          ${!isTimeSlotDisabled ? 'cursor-pointer hover:bg-gray-50' : ''}
          ${isTimeSlotDisabled && isDateBlocked(currentDate) ? 'bg-gray-100' : ''}
          ${isTimeSlotDisabled && !isDateBlocked(currentDate) ? 'bg-gray-50' : ''}`}
        onClick={!isTimeSlotDisabled ? () => onTimeSlotClick(currentDate, time) : undefined}
      >
        {slotReservations.length > 0 ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className={`w-full h-full p-2 rounded-md ${reservationClasses} ${isAdmin ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                  onClick={handleReservationClick}
                >
                  <div className="font-medium">{slotReservations[0].motivo}</div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-white p-3 shadow-lg border rounded-md z-50 max-w-[300px]">
                <div className="text-sm space-y-2">
                  <p className="font-semibold">{slotReservations[0].motivo}</p>
                  <p><span className="font-medium">Horario:</span> {formatTimeWithoutSeconds(slotReservations[0].inicio)} - {formatTimeWithoutSeconds(slotReservations[0].fin)}</p>
                  <p className="text-xs text-gray-600">Estado: {statusText}</p>
                  {isAdmin && <p className="text-xs text-blue-600">Click para ver detalles completos</p>}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : !isTimeSlotDisabled ? (
          <div className="flex items-center justify-center w-full text-sm text-gray-600">
            <PlusCircle className="w-4 h-4 mr-1" />
            Reservar horario
          </div>
        ) : isDateBlocked(currentDate) ? (
          <div className="text-xs text-gray-900 flex items-center justify-center w-full">
            No disponible
          </div>
        ) : null}
      </div>
      
      {isAdmin && slotReservations.length > 0 && (
        <ReservationDetailDialog
          reservation={slotReservations[0]}
          isOpen={showDetailDialog}
          onClose={() => setShowDetailDialog(false)}
        />
      )}
    </>
  );
};

export default TimeSlotCell;
