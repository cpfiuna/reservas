
import React from 'react';
import { Reservation } from '@/types/reservation';
import ReservationPill from './ReservationPill';

interface DayCellContentProps {
  isDayBlocked: boolean;
  dayReservations: Reservation[];
}

const DayCellContent: React.FC<DayCellContentProps> = ({ isDayBlocked, dayReservations }) => {
  // Limit display to 2 events max
  const displayLimit = 2;
  const visibleReservations = dayReservations.slice(0, displayLimit);
  const hiddenCount = Math.max(0, dayReservations.length - displayLimit);

  return (
    <div className="overflow-y-auto max-h-[50px] sm:max-h-[60px] mt-1 flex flex-col items-end">
      {isDayBlocked ? (
        <div className="text-xs mb-1 py-1 px-2 rounded-full bg-gray-100 text-gray-900 truncate inline-block">
          No disponible
        </div>
      ) : dayReservations.length > 0 ? (
        <>
          {visibleReservations.map(reservation => (
            <ReservationPill 
              key={reservation.id} 
              reservation={reservation}
              allowClick={false}
            />
          ))}
          
          {/* Show counter for additional reservations */}
          {hiddenCount > 0 && (
            <div className="text-xs mb-1 py-1 px-2 rounded-full bg-gray-100 text-gray-600 truncate inline-block">
              +{hiddenCount} más
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};

export default DayCellContent;
