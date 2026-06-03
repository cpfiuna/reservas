
import { useReservations } from '@/context/ReservationContext';
import { useVenue } from '@/context/VenueContext';
import { parseHour, DEFAULT_HOUR_START, DEFAULT_HOUR_END } from '@/utils/timeUtils';
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
  const { currentVenue } = useVenue();

  // Opening hours for the active venue (falls back to defaults until resolved).
  const hourStart = parseHour(currentVenue?.hours_start, DEFAULT_HOUR_START);
  const hourEnd = parseHour(currentVenue?.hours_end, DEFAULT_HOUR_END);
  
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
    isTimeSlotAvailable,
    hourStart,
    hourEnd
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
