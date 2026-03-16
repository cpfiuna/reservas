
import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, 
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, 
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Users, Info, Search } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { deleteReservation as libDeleteReservation } from '@/lib/supabase';
import { Reservation } from '@/types/reservation';
import ReservationDetailDialog from './ReservationDetailDialog';
import BlockedDatesList from './BlockedDatesList';

interface BlockedDate {
  id: string;
  fecha: string;
  motivo: string;
}

interface ReservationsListProps {
  reservations: Reservation[];
  blockedDates: BlockedDate[];
  onDelete: () => void;
  onBlockedDateDelete: () => void;
  isLoading: boolean;
  disableDelete?: boolean;
  useMotivoAsSecondary?: boolean;
  title?: string;
  emptyMessage?: string;
  showBlockedDates?: boolean;
}

const ReservationsList: React.FC<ReservationsListProps> = ({ 
  reservations, 
  blockedDates, 
  onDelete,
  onBlockedDateDelete,
  isLoading,
  disableDelete = false,
  useMotivoAsSecondary = false,
  title = 'Reservas Aprobadas y Fechas Bloqueadas',
  emptyMessage = 'No se encontraron reservas aprobadas',
  showBlockedDates = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');

  const deleteReservation = async (id: string, reason?: string) => {
    try {
      await libDeleteReservation(id, reason);
      toast.success('Reserva cancelada exitosamente');
      setShowDeleteDialog(false);
      setCancellationReason('');
      onDelete();
    } catch (error) {
      toast.error('Error al cancelar la reserva');
    }
  };

  const filteredReservations = reservations.filter(reservation => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      reservation.responsable.toLowerCase().includes(searchTermLower) ||
      reservation.email.toLowerCase().includes(searchTermLower) ||
      reservation.motivo.toLowerCase().includes(searchTermLower) ||
      format(reservation.fecha, 'dd/MM/yyyy').includes(searchTerm)
    );
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <CardTitle className="text-lg">{title}</CardTitle>
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
              {showBlockedDates && (
                <BlockedDatesList 
                  blockedDates={blockedDates} 
                  onDelete={onBlockedDateDelete} 
                />
              )}
              
              {filteredReservations.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{emptyMessage}</p>
              ) : (
                filteredReservations.map(reservation => (
                  <Card key={reservation.id} className="overflow-hidden shadow-sm border border-gray-200">
                    <CardHeader className="p-3 bg-gray-50 border-b">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-base font-medium">{reservation.motivo}</CardTitle>
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
                          {!disableDelete && (
                            <AlertDialog open={showDeleteDialog && selectedReservation?.id === reservation.id}>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="h-8 p-2"
                                  onClick={() => {
                                    setSelectedReservation(reservation);
                                    setShowDeleteDialog(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción eliminará permanentemente la reserva de {reservation.responsable} para el{' '}
                                    {format(reservation.fecha, 'dd/MM/yyyy', { locale: es })}.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="px-6">
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Motivo de la cancelación (opcional)</label>
                                  <Textarea
                                    value={cancellationReason}
                                    onChange={(e) => setCancellationReason(e.target.value)}
                                    className="w-full"
                                    rows={3}
                                    placeholder="Descripción breve del motivo"
                                  />
                                </div>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteReservation(reservation.id, cancellationReason)}>
                                      Eliminar
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-3">
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <p><span className="font-medium">Horario:</span> {reservation.inicio} - {reservation.fin}</p>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1 text-gray-500" />
                            <span>{reservation.personas} personas</span>
                          </div>
                        </div>
                        <p><span className="font-medium">Responsable:</span> {reservation.responsable}</p>
                        {useMotivoAsSecondary ? (
                          <p>
                            <span className="font-medium">Motivo:</span>{' '}
                            {(() => {
                              const raw = reservation.admin_notes ?? reservation.motivo ?? '';
                              const note = typeof raw === 'string' ? raw.replace(/^Motivo:\s*/i, '').trim() : '';
                              // Treat legacy 'Cancelada por el administrador' as unspecified
                              const isLegacy = /^cancelada por el administrador$/i.test(note);
                              return (!note || isLegacy) ? 'No especificado' : note;
                            })()}
                          </p>
                        ) : (
                          <p><span className="font-medium">Email:</span> {reservation.email}</p>
                        )}
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

export default ReservationsList;
