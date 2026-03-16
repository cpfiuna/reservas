import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { deleteReservation as libDeleteReservation } from '@/lib/supabase';
import { Reservation } from '@/types/reservation';
import { logger } from '@/utils/logger';

export const useReservationMutations = (fetchReservations: () => Promise<void>) => {
  const addReservation = async (newReservation: Omit<Reservation, 'id' | 'createdAt'>): Promise<{ reservation: Reservation; confirmationToken: string | null } | null> => {
    try {
      // Prevent booking on Sundays (client-side guard)
      if (newReservation.fecha && typeof (newReservation.fecha as any).getDay === 'function' && (newReservation.fecha as Date).getDay() === 0) {
        toast.error('No se permiten reservas los domingos');
        return null;
      }
      // Format the date correctly to prevent timezone issues
      // Get year, month, day components directly from the Date object
      const year = newReservation.fecha.getFullYear();
      const month = String(newReservation.fecha.getMonth() + 1).padStart(2, '0');
      const day = String(newReservation.fecha.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      // Create an insert object with optional affiliation
        const insertData: any = {
        responsable: newReservation.responsable,
        email: newReservation.email,
        motivo: newReservation.motivo,
        fecha: formattedDate, // Use our formatted date string
        inicio: newReservation.inicio,
        fin: newReservation.fin,
        personas: newReservation.personas,
        status: 'pending',
        confirmed: false, // Starts unconfirmed, requires email confirmation
        token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      };
      
      // Only add affiliation if it exists
      if (newReservation.affiliation) {
        insertData.affiliation = newReservation.affiliation;
      }

      const { data, error } = await supabase
        .from('reservations')
        .insert(insertData)
        .select();

      if (error) {
        // Check if it's an overlap constraint violation
        if (error.code === '23P01' || error.message?.includes('reservations_no_overlap_excl')) {
          throw new Error('SLOT_TAKEN');
        }
        throw error;
      }

      if (data && data[0]) {
        // Send confirmation email (fire-and-forget for instant response)
        supabase.functions.invoke('send-email', {
          body: {
            type: 'confirm-reservation',
            recipient: data[0].email,
            reservation: {
              id: data[0].id,
              responsable: data[0].responsable,
              email: data[0].email,
              motivo: data[0].motivo,
              fecha: data[0].fecha,
              inicio: data[0].inicio,
              fin: data[0].fin,
              personas: data[0].personas
            },
            confirmationToken: data[0].confirmation_token
          }
        }).catch((emailError) => {
          logger.error('Failed to send confirmation email', emailError);
          // Don't fail the reservation if email fails
        });

        // When creating the reservation object, ensure we parse the date correctly
        // Explicitly parse the date with local timezone consideration
        const parts = data[0].fecha.split('-');
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JS
        const day = parseInt(parts[2], 10);
        const dateObj = new Date(year, month, day, 12, 0, 0); // Set to noon to avoid timezone issues
        
        const reservation: Reservation = {
          id: data[0].id,
          responsable: data[0].responsable,
          email: data[0].email,
          motivo: data[0].motivo,
          fecha: dateObj,
          inicio: data[0].inicio,
          fin: data[0].fin,
          personas: data[0].personas,
          createdAt: new Date(data[0].created_at),
          approved: data[0].approved,
          status: data[0].status || (data[0].approved ? 'approved' : 'pending'),
          admin_notes: data[0].admin_notes
        };
        
        // Add affiliation only if it exists in the response
        if ('affiliation' in data[0] && data[0].affiliation !== null) {
          reservation.affiliation = data[0].affiliation as string;
        }
        
        // Return the reservation along with the confirmation token so callers
        // can show a pending/confirmation page if they want.
        return {
          reservation,
          confirmationToken: data[0].confirmation_token || null
        };
      }
      return null;
    } catch (error) {
      // Check if it's the slot taken error
      if (error instanceof Error && error.message === 'SLOT_TAKEN') {
        toast.error('Este horario ya fue reservado por otra persona. Por favor, elige otro horario.', {
          duration: 6000,
        });
      } else {
        toast.error('Error al crear la reserva');
      }
      return null;
    }
  };

  const deleteReservation = async (id: string, reason?: string): Promise<void> => {
    try {
      await libDeleteReservation(id, reason);

      // Refresh data after soft-cancel
      try {
        await fetchReservations();
      } catch (e) {
        // ignore
      }

      toast.success("Reserva cancelada exitosamente");
    } catch (error) {
      toast.error('Error al cancelar la reserva');
    }
  };

  const updateReservation = async (id: string, updatedData: Partial<Omit<Reservation, 'id' | 'createdAt'>>): Promise<void> => {
    try {
      const updateObject: any = { ...updatedData };
      
      if (updatedData.fecha) {
        // Format the date correctly to prevent timezone issues
        const year = updatedData.fecha.getFullYear();
        const month = String(updatedData.fecha.getMonth() + 1).padStart(2, '0');
        const day = String(updatedData.fecha.getDate()).padStart(2, '0');
        updateObject.fecha = `${year}-${month}-${day}`;
      }

      const { error } = await supabase
        .from('reservations')
        .update(updateObject)
        .eq('id', id);

      if (error) {
        throw error;
      }

      // The real-time subscription will handle updating the UI
      toast.success("Reserva actualizada exitosamente");
    } catch (error) {
      toast.error('Error al actualizar la reserva');
    }
  };

  return {
    addReservation,
    deleteReservation,
    updateReservation
  };
};
