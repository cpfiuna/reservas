
import { useState } from 'react';
import { useReservationMutations } from './useReservationMutations';
import { useReservations } from '@/context/ReservationContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReservationSubmitData {
  responsable: string;
  email: string;
  motivo: string;
  fecha: Date | undefined;
  inicio: string;
  fin: string;
  personas: number;
  affiliation: string;
}

export const useReservationSubmit = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const reservationContext = useReservations();
  const { addReservation } = useReservationMutations(async () => {
    // Placeholder function since the actual fetchReservations is not available
    // This will be called after a successful reservation
  });

  const submitReservation = async (
    data: ReservationSubmitData,
    validateForm: () => boolean
  ) => {
    // Validate form data
    if (!validateForm()) {
      toast.error('Por favor, complete todos los campos requeridos correctamente.');
      return false;
    }

    // Ensure we have all required data
    if (!data.fecha) {
      toast.error('Por favor, seleccione una fecha válida.');
      return false;
    }

    setIsSubmitting(true);
    setSubmissionSuccess(false);

    try {
      // Format date for display
      const formattedDate = format(data.fecha, "EEEE d 'de' MMMM, yyyy", { locale: es });
      const formattedStart = data.inicio;
      const formattedEnd = data.fin;

      // Submit the reservation
        const result = await addReservation({
        responsable: data.responsable,
        email: data.email,
        motivo: data.motivo,
        fecha: data.fecha,
        inicio: data.inicio,
        fin: data.fin,
        personas: data.personas,
        affiliation: data.affiliation
      });
        if (result) {
          // Set success immediately before showing toast
          setSubmissionSuccess(true);
          setIsSubmitting(false);

          toast.success(
            `¡Revisa tu correo para confirmar la reserva! Hemos enviado un enlace de confirmación a ${data.email}.`,
            { duration: 8000 }
          );

          // Return the insertion result (reservation + confirmation token) so
          // the caller can navigate to a pending/confirmation info page.
          return result;
        } else {
          toast.error('Hubo un problema al crear la reserva. Por favor, inténtelo de nuevo.');
          setIsSubmitting(false);
          return null;
        }
    } catch (error) {
      toast.error('Error al procesar la reserva. Por favor, inténtelo de nuevo.');
      setIsSubmitting(false);
      return false;
    }
  };

  return {
    submitReservation,
    isSubmitting,
    submissionSuccess
  };
};
