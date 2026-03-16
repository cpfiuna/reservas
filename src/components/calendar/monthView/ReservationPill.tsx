
import React, { useState } from 'react';
import { Reservation } from '@/types/reservation';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { formatTimeWithoutSeconds } from '@/utils/calendarUtils';
import { getReservationClasses, getReservationStatusText, isReservationPast } from '@/utils/reservationStyles';
import { useAuth } from '@/context/AuthContext';
import ReservationDetailDialog from '../../admin/ReservationDetailDialog';

interface ReservationPillProps {
  reservation: Reservation;
  allowClick?: boolean; // Whether clicking should show details (false for month view)
}

const ReservationPill: React.FC<ReservationPillProps> = ({ reservation, allowClick = false }) => {
  const { isAdmin } = useAuth();
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const isPast = isReservationPast(reservation);
  const reservationClasses = getReservationClasses(reservation.status, reservation.approved, isPast);
  const statusText = getReservationStatusText(reservation.status, reservation.approved, isPast);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdmin && allowClick) {
      setShowDetailDialog(true);
    }
  };

  const isClickable = isAdmin && allowClick;

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={`text-xs mb-1 py-1 px-2 rounded-full inline-block ${reservationClasses} ${isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} max-w-full`}
              onClick={handleClick}
            >
              <span className="truncate block text-left">{reservation.motivo}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-white p-3 shadow-lg border rounded-md z-50 max-w-[300px]">
            <div className="text-sm">
              <p className="font-semibold">{reservation.motivo}</p>
              <p>{formatTimeWithoutSeconds(reservation.inicio)} - {formatTimeWithoutSeconds(reservation.fin)}</p>
              <p className="text-xs text-gray-600 mt-1">Estado: {statusText}</p>
              {isAdmin && !allowClick && <p className="text-xs text-blue-600 mt-1">Haz click en el día para ver detalles</p>}
              {isClickable && <p className="text-xs text-blue-600 mt-1">Click para ver detalles completos</p>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {isClickable && (
        <ReservationDetailDialog
          reservation={reservation}
          isOpen={showDetailDialog}
          onClose={() => setShowDetailDialog(false)}
        />
      )}
    </>
  );
};

export default ReservationPill;
