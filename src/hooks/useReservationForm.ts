
import { useReservations } from '@/context/ReservationContext';
import { useReservationFormState } from './reservation/useReservationFormState';
import { useTimeSlotAvailability } from './reservation/useTimeSlotAvailability';
import { useBlockedDates } from './reservation/useBlockedDates';
import { useUrlParams } from './reservation/useUrlParams';
import { useReservationSubmit } from './reservation/useReservationSubmit';

export const useReservationForm = (
  initialDate?: string | null,
  initialStartTime?: string | null,
  initialEndTime?: string | null
) => {
  const { reservations, isTimeSlotAvailable } = useReservations();
  
  // Get form state and validation
  const { formState, validateForm } = useReservationFormState();
  const {
    responsable, setResponsable,
    email, setEmail,
    motivo, setMotivo,
    fecha, setFecha,
    inicio, setInicio,
    fin, setFin,
    personas, setPersonas,
    affiliation, setAffiliation,
    formErrors
  } = formState;

  // Handle URL parameters and initial values
  useUrlParams(setFecha, setInicio, setFin, fecha, initialDate, initialStartTime, initialEndTime);
  
  // Get time slot availability
  const timeOptions = useTimeSlotAvailability(
    fecha, 
    inicio, 
    setInicio,
    fin,
    setFin,
    reservations,
    isTimeSlotAvailable
  );
  
  // Get blocked dates
  const { disabledDays } = useBlockedDates(isTimeSlotAvailable);

  // Get submission handler
  const { submitReservation, isSubmitting, submissionSuccess } = useReservationSubmit();

  // Form submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    return submitReservation({
      responsable,
      email,
      motivo,
      fecha,
      inicio,
      fin,
      personas: Number(personas),
      affiliation
    }, validateForm);
  };

  return {
    formState,
    timeOptions,
    handleSubmit,
    disabledDays,
    isSubmitting, 
    submissionSuccess
  };
};
