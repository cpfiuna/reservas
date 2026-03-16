
import React, { useState } from 'react';
import { Reservation } from '@/types/reservation';
import ReservationTooltip from './ReservationTooltip';
import ReservationDetailDialog from '../../admin/ReservationDetailDialog';
import { getReservationClasses, isReservationPast } from '@/utils/reservationStyles';
import { useAuth } from '@/context/AuthContext';

interface ReservationDisplayProps {
  reservation: Reservation;
}

const ReservationDisplay: React.FC<ReservationDisplayProps> = ({ reservation }) => {
  const { isAdmin } = useAuth();
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const isPast = isReservationPast(reservation);
  const reservationClasses = getReservationClasses(reservation.status, reservation.approved, isPast);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdmin) {
      setShowDetailDialog(true);
    }
  };

  return (
    <>
      <ReservationTooltip reservation={reservation}>
        <div 
          className={`absolute inset-0 m-0.5 sm:m-1 text-xs p-1 sm:p-2 rounded-md flex items-center ${reservationClasses} ${isAdmin ? 'cursor-pointer hover:opacity-80' : ''}`}
          onClick={handleClick}
        >
          <span className="truncate text-left block w-full">{reservation.motivo}</span>
        </div>
      </ReservationTooltip>
      
      {isAdmin && (
        <ReservationDetailDialog
          reservation={reservation}
          isOpen={showDetailDialog}
          onClose={() => setShowDetailDialog(false)}
        />
      )}
    </>
  );
};

export default ReservationDisplay;
