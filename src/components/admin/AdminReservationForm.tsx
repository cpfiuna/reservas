import React, { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useVenue } from '@/context/VenueContext';
import { generateTimeOptions, parseHour, DEFAULT_HOUR_START, DEFAULT_HOUR_END } from '@/utils/timeUtils';
import { logger } from '@/utils/logger';

interface AdminReservationFormProps {
  onCreated: () => void;
}

const AdminReservationForm: React.FC<AdminReservationFormProps> = ({ onCreated }) => {
  const { venueId, currentVenue } = useVenue();
  const sb: any = supabase;

  const timeOptions = useMemo(() => {
    const start = parseHour(currentVenue?.hours_start, DEFAULT_HOUR_START);
    const end = parseHour(currentVenue?.hours_end, DEFAULT_HOUR_END);
    return generateTimeOptions(start, end);
  }, [currentVenue]);

  const [responsable, setResponsable] = useState('');
  const [email, setEmail] = useState('');
  const [motivo, setMotivo] = useState('');
  const [fecha, setFecha] = useState<Date | undefined>(undefined);
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [personas, setPersonas] = useState('1');
  const [affiliation, setAffiliation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const finOptions = useMemo(
    () => (inicio ? timeOptions.filter(t => t > inicio) : timeOptions),
    [timeOptions, inicio]
  );

  const resetForm = () => {
    setResponsable('');
    setEmail('');
    setMotivo('');
    setFecha(undefined);
    setInicio('');
    setFin('');
    setPersonas('1');
    setAffiliation('');
  };

  const handleSubmit = async () => {
    if (!responsable.trim()) { toast.error('El nombre del responsable es requerido'); return; }
    if (!motivo.trim()) { toast.error('El motivo es requerido'); return; }
    if (!fecha) { toast.error('Debe seleccionar una fecha'); return; }
    if (!inicio || !fin) { toast.error('Debe seleccionar horario de inicio y fin'); return; }
    if (fin <= inicio) { toast.error('La hora de fin debe ser posterior a la de inicio'); return; }
    const personasNum = parseInt(personas, 10);
    if (!personasNum || personasNum < 1) { toast.error('Debe ingresar al menos 1 persona'); return; }

    setIsSubmitting(true);
    try {
      // TZ-safe date formatting — same pattern as useReservationMutations
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const day = String(fecha.getDate()).padStart(2, '0');
      const fechaStr = `${year}-${month}-${day}`;

      const insertData: Record<string, any> = {
        responsable: responsable.trim(),
        email: email.trim(),
        motivo: motivo.trim(),
        fecha: fechaStr,
        inicio,
        fin,
        personas: personasNum,
        status: 'approved',
        confirmed: true,
        token_expires_at: null,
      };
      if (affiliation) insertData.affiliation = affiliation;
      if (venueId) insertData.venue_id = venueId;

      const { data: newReservation, error } = await sb
        .from('reservations')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        if (error.code === '23P01' || error.message?.includes('reservations_no_overlap_excl')) {
          toast.error('El horario ya está reservado');
        } else {
          throw error;
        }
        return;
      }

      // Optional email — only send if admin provided an address
      if (email.trim() && newReservation) {
        try {
          await sb.functions.invoke('send-email', {
            body: {
              type: 'reservation-approved',
              recipient: email.trim(),
              venueSlug: currentVenue?.slug ?? 'quincho',
              reservation: {
                id: newReservation.id,
                responsable: responsable.trim(),
                email: email.trim(),
                motivo: motivo.trim(),
                fecha: fechaStr,
                inicio,
                fin,
                personas: personasNum,
              }
            }
          });
        } catch (emailError) {
          logger.error('Error sending admin-created reservation email', emailError);
          // Don't fail the creation if email fails
        }
      }

      toast.success('Reserva creada exitosamente');
      resetForm();
      onCreated();
    } catch (error) {
      toast.error('Error al crear la reserva');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Responsable *</Label>
          <Input
            value={responsable}
            onChange={e => setResponsable(e.target.value)}
            placeholder="Nombre completo"
          />
        </div>
        <div className="space-y-2">
          <Label>Correo electrónico</Label>
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Motivo *</Label>
        <Input
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
          placeholder="Descripción del evento"
        />
      </div>

      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={fecha}
          onSelect={setFecha}
          disabled={(date) => isBefore(date, startOfToday()) || date.getDay() === 0}
          locale={es}
          className="rounded-md border"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Hora inicio *</Label>
          <Select value={inicio} onValueChange={(v) => { setInicio(v); setFin(''); }}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione hora" />
            </SelectTrigger>
            <SelectContent>
              {timeOptions.map(t => (
                <SelectItem key={`ini-${t}`} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Hora fin *</Label>
          <Select value={fin} onValueChange={setFin} disabled={!inicio}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione hora" />
            </SelectTrigger>
            <SelectContent>
              {finOptions.map(t => (
                <SelectItem key={`fin-${t}`} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Número de personas *</Label>
          <Input
            type="number"
            min={1}
            value={personas}
            onChange={e => setPersonas(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Afiliación</Label>
          <Select value={affiliation} onValueChange={setAffiliation}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione vínculo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Estudiante">Estudiante</SelectItem>
              <SelectItem value="Docente">Docente</SelectItem>
              <SelectItem value="Egresado">Egresado</SelectItem>
              <SelectItem value="Funcionario">Funcionario</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full bg-fiuna-red hover:bg-fiuna-red/90"
      >
        {isSubmitting ? 'Creando...' : 'Crear Reserva'}
      </Button>
    </div>
  );
};

export default AdminReservationForm;
