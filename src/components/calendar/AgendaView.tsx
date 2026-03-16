
import React from 'react';
import { format, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { Reservation } from '@/context/ReservationContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Card, 
  CardContent
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getReservationClasses, getReservationStatusText, isReservationPast } from '@/utils/reservationStyles';

interface AgendaViewProps {
  reservations: Reservation[];
}

const AgendaView: React.FC<AgendaViewProps> = ({ reservations }) => {
  const { isAdmin } = useAuth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Show all reservations, sorted by date (most recent first)
  const sortedReservations = reservations
    .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  
  // Separate into future and past reservations for better organization
  const futureReservations = sortedReservations.filter(r => !isBefore(r.fecha, today));
  const pastReservations = sortedReservations.filter(r => isBefore(r.fecha, today));
  
  return (
    <div className="space-y-4">
      <ScrollArea className="h-[calc(100vh-230px)]">
        <div className="space-y-4">
          {/* Future Reservations */}
          {futureReservations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Próximas Reservas</h3>
              <div className="space-y-3">
                {futureReservations.map(reservation => {
                  const isPast = isReservationPast(reservation);
                  const statusText = getReservationStatusText(reservation.status, reservation.approved, isPast);
                  const badgeClasses = reservation.status === 'approved' || reservation.approved === true 
                    ? "bg-fiuna-red hover:bg-fiuna-darkred" 
                    : reservation.status === 'pending' || reservation.approved === false 
                      ? "bg-yellow-500 hover:bg-yellow-600" 
                      : "bg-gray-500 hover:bg-gray-600";

                  return (
                    <Card key={reservation.id} className="overflow-hidden shadow-sm border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-fiuna-red" />
                            <span className="font-medium">{reservation.inicio} - {reservation.fin}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={badgeClasses}>
                              {format(reservation.fecha, 'dd/MM/yyyy', { locale: es })}
                            </Badge>
                          </div>
                        </div>
                        <div className="font-medium text-gray-800 mb-1">
                          {reservation.motivo}
                        </div>
                        <div className="text-xs text-gray-600">
                          Estado: {statusText}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Past Reservations - Only show to admins */}
          {isAdmin && pastReservations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Reservas Pasadas</h3>
              <div className="space-y-3">
                {pastReservations.map(reservation => {
                  const isPast = isReservationPast(reservation);
                  const statusText = getReservationStatusText(reservation.status, reservation.approved, isPast);

                  return (
                    <Card key={reservation.id} className="overflow-hidden shadow-sm border border-gray-200 opacity-75">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-600">{reservation.inicio} - {reservation.fin}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-gray-400 hover:bg-gray-500">
                              {format(reservation.fecha, 'dd/MM/yyyy', { locale: es })}
                            </Badge>
                          </div>
                        </div>
                        <div className="font-medium text-gray-600 mb-1">
                          {reservation.motivo}
                        </div>
                        <div className="text-xs text-gray-500">
                          Estado: {statusText}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* No reservations message */}
          {futureReservations.length === 0 && (isAdmin ? pastReservations.length === 0 : true) && (
            <p className="text-center text-gray-500 py-8">No hay reservas</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AgendaView;
