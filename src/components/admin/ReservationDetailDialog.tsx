
import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Reservation } from '@/types/reservation';

interface ReservationDetailDialogProps {
  reservation: Reservation | null;
  isOpen: boolean;
  onClose: () => void;
}

const ReservationDetailDialog: React.FC<ReservationDetailDialogProps> = ({ 
  reservation, 
  isOpen, 
  onClose 
}) => {
  if (!reservation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detalles de la Reserva</DialogTitle>
          <DialogDescription>
            Información completa de la reserva
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3">
              <Label className="font-semibold">Motivo</Label>
              <p className="mt-1">{reservation.motivo}</p>
            </div>
            <div className="col-span-3">
              <Label className="font-semibold">Fecha</Label>
              <p className="mt-1">
                {format(reservation.fecha, 'EEEE d MMMM, yyyy', { locale: es })}
              </p>
            </div>
            <div>
              <Label className="font-semibold">Hora inicio</Label>
              <p className="mt-1">{reservation.inicio}</p>
            </div>
            <div>
              <Label className="font-semibold">Hora fin</Label>
              <p className="mt-1">{reservation.fin}</p>
            </div>
            <div>
              <Label className="font-semibold">Personas</Label>
              <p className="mt-1">{reservation.personas}</p>
            </div>
            <div className="col-span-3">
              <Label className="font-semibold">Responsable</Label>
              <p className="mt-1">{reservation.responsable}</p>
            </div>
            <div className="col-span-3">
              <Label className="font-semibold">Afiliación</Label>
              <p className="mt-1">{reservation.affiliation}</p>
            </div>
            <div className="col-span-3">
              <Label className="font-semibold">Email</Label>
              <p className="mt-1">{reservation.email}</p>
            </div>
            <div className="col-span-3">
              <Label className="font-semibold">Motivo</Label>
              <p className="mt-1">
                {(() => {
                  const raw = reservation.admin_notes ?? '';
                  const note = typeof raw === 'string' ? raw.replace(/^Motivo:\s*/i, '').trim() : '';
                  const isLegacy = /^cancelada por el administrador$/i.test(note);
                  return (!note || isLegacy) ? 'No especificado' : note;
                })()}
              </p>
            </div>
            <div className="col-span-3">
              <Label className="font-semibold">Creada el</Label>
              <p className="mt-1">
                {format(reservation.createdAt, 'dd/MM/yyyy HH:mm', { locale: es })}
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReservationDetailDialog;
