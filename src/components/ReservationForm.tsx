
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import FormField from '@/components/reservation/FormField';
import DatePicker from '@/components/reservation/DatePicker';
import TimeSelector from '@/components/reservation/TimeSelector';
import FormFooter from '@/components/reservation/FormFooter';
import { useReservationForm } from '@/hooks/useReservationForm';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

// Add interface to define the props
interface ReservationFormProps {
  initialDate?: string | null;
  initialStartTime?: string | null;
  initialEndTime?: string | null;
}

const ReservationForm: React.FC<ReservationFormProps> = ({
  initialDate,
  initialStartTime,
  initialEndTime
}) => {
  const navigate = useNavigate();
  const { 
    formState, 
    timeOptions, 
    handleSubmit,
    disabledDays,
    isSubmitting,
    submissionSuccess
  } = useReservationForm(initialDate, initialStartTime, initialEndTime);

  const {
    responsable,
    setResponsable,
    email,
    setEmail,
    motivo,
    setMotivo,
    fecha,
    setFecha,
    inicio,
    setInicio,
    fin,
    setFin,
    personas,
    setPersonas,
    affiliation,
    setAffiliation,
    formErrors
  } = formState;

  const {
    availableTimes,
    availableEndTimes,
    updateAvailableEndTimes
  } = timeOptions;

  // We will navigate to a pending confirmation page after a successful
  // submission. Override the handleSubmit to await the submission and
  // navigate with the created reservation id.
  const wrappedHandleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const result: any = await handleSubmit();
    // handleSubmit returns the created result (or null/false on failure)
    if (result && result.reservation) {
      const id = result.reservation.id;
      navigate(`/confirmar-reserva-pendiente?id=${encodeURIComponent(id)}`);
    }
  };
  return (
      <Card className="w-full max-w-2xl mx-auto shadow-md border border-gray-200 transition-all animate-fade-in">
        <CardContent className="pt-6">
          <form onSubmit={wrappedHandleSubmit} className="space-y-6">
          <div className="space-y-4">
            <FormField
              id="responsable"
              label="Responsable de la reserva *"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              error={formErrors.responsable}
              placeholder="Nombre completo"
            />

            <FormField
              id="email"
              label="Correo electrónico del responsable *"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={formErrors.email}
              placeholder="correo@ejemplo.com"
              type="email"
            />

            <FormField
              id="motivo"
              label="Motivo de la reserva *"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              error={formErrors.motivo}
              placeholder="Describa el motivo de su reserva"
              multiline={true}
              rows={3}
            />

            <div className="space-y-2">
              <label htmlFor="affiliation" className="block text-sm font-medium text-gray-700">
                Vínculo con la facultad *
              </label>
              <Select 
                value={affiliation}
                onValueChange={setAffiliation}
              >
                <SelectTrigger 
                  id="affiliation"
                  className={`w-full ${formErrors.affiliation ? 'border-red-500 focus:ring-red-500' : ''}`}
                >
                  <SelectValue placeholder="Seleccione su vínculo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Estudiante">Estudiante</SelectItem>
                  <SelectItem value="Docente">Docente</SelectItem>
                  <SelectItem value="Egresado">Egresado</SelectItem>
                  <SelectItem value="Funcionario">Funcionario</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.affiliation && (
                <p className="mt-1 text-sm text-red-600">{formErrors.affiliation}</p>
              )}
            </div>

            <DatePicker
              id="fecha"
              label="Fecha *"
              value={fecha}
              onChange={setFecha}
              disabledDays={disabledDays}
              error={formErrors.fecha}
              noAvailableTimes={fecha !== undefined && availableTimes.length === 0}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TimeSelector
                id="inicio"
                label="Inicio *"
                value={inicio}
                onChange={(value) => {
                  setInicio(value);
                  setFin('');
                  updateAvailableEndTimes(value);
                }}
                options={availableTimes}
                disabled={!fecha || availableTimes.length === 0}
                error={formErrors.inicio}
              />

              <TimeSelector
                id="fin"
                label="Fin *"
                value={fin}
                onChange={setFin}
                options={availableEndTimes}
                disabled={!inicio || availableEndTimes.length === 0}
                error={formErrors.fin}
              />
            </div>

            <FormField
              id="personas"
              label="Cantidad de personas *"
              value={personas}
              onChange={(e) => setPersonas(e.target.value)}
              error={formErrors.personas}
              placeholder="Número de asistentes"
              type="number"
              min={1}
            />
          </div>
        </form>
      </CardContent>
      <CardFooter className="bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-center">
        <FormFooter onSubmit={wrappedHandleSubmit} />
      </CardFooter>
    </Card>
  );
};

export default ReservationForm;
