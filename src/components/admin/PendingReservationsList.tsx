
import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check, X, Search, Users, Info, Clock } from 'lucide-react';
import { Reservation } from '@/types/reservation';
import ReservationDetailDialog from './ReservationDetailDialog';

interface PendingReservationsListProps {
  pendingReservations: Reservation[];
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, adminNotes?: string) => Promise<void>;
  isLoading: boolean;
}

const PendingReservationsList: React.FC<PendingReservationsListProps> = ({ 
  pendingReservations, 
  onApprove, 
  onReject,
  isLoading 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  
  const filteredReservations = pendingReservations.filter(reservation => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      reservation.responsable.toLowerCase().includes(searchTermLower) ||
      reservation.email.toLowerCase().includes(searchTermLower) ||
      reservation.motivo.toLowerCase().includes(searchTermLower) ||
      format(reservation.fecha, 'dd/MM/yyyy').includes(searchTerm)
    );
  });

  const handleReject = async () => {
    if (selectedReservation) {
      await onReject(selectedReservation.id, rejectNotes);
      setShowRejectDialog(false);
      setRejectNotes('');
      setSelectedReservation(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <CardTitle className="text-lg">Reservas Pendientes de Aprobación</CardTitle>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Buscar reservas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 max-w-xs"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fiuna-red"></div>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="space-y-3 p-2">
              {filteredReservations.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No hay reservas pendientes</p>
              ) : (
                filteredReservations.map(reservation => (
                  <Card key={reservation.id} className="overflow-hidden shadow-sm border border-gray-200">
                    <CardHeader className="p-3 bg-gray-50 border-b">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-base font-medium">
                            {reservation.motivo}
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                              Pendiente
                            </span>
                          </CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {format(reservation.fecha, 'EEEE d MMMM, yyyy', { locale: es })}
                          </CardDescription>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 p-2 hidden sm:flex"
                            onClick={() => {
                              setSelectedReservation(reservation);
                              setShowDetailDialog(true);
                            }}
                          >
                            Ver detalles
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 sm:hidden"
                            onClick={() => {
                              setSelectedReservation(reservation);
                              setShowDetailDialog(true);
                            }}
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="h-8 bg-green-600 hover:bg-green-700"
                            onClick={() => onApprove(reservation.id)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Aprobar</span>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-8"
                              >
                                <X className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">Rechazar</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Desea rechazar esta reserva?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Al rechazar esta reserva, será eliminada del sistema. Opcionalmente, puede agregar un comentario para explicar el motivo del rechazo.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="py-4">
                                <Label htmlFor="reject-notes" className="text-sm font-medium">
                                  Notas para el administrador (opcional)
                                </Label>
                                <Textarea
                                  id="reject-notes"
                                  placeholder="Escriba aquí la razón del rechazo..."
                                  value={rejectNotes}
                                  onChange={(e) => setRejectNotes(e.target.value)}
                                  className="mt-2"
                                />
                              </div>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => onReject(reservation.id, rejectNotes)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Rechazar Reserva
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-3">
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1 text-gray-500" />
                            <span>{reservation.inicio} - {reservation.fin}</span>
                          </div>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1 text-gray-500" />
                            <span>{reservation.personas} personas</span>
                          </div>
                        </div>
                        <p><span className="font-medium">Responsable:</span> {reservation.responsable}</p>
                        <p><span className="font-medium">Email:</span> {reservation.email}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        )}

        <ReservationDetailDialog
          reservation={selectedReservation}
          isOpen={showDetailDialog}
          onClose={() => setShowDetailDialog(false)}
        />
      </CardContent>
    </Card>
  );
};

export default PendingReservationsList;
