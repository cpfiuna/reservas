import { supabase as integrationsSupabase } from '@/integrations/supabase/client';
import { Reservation } from './types';
import { logger } from '@/utils/logger';

// Use the single, generated Supabase client to avoid multiple
// GoTrueClient instances in the browser (prevents storage/key conflicts).
export const supabase = integrationsSupabase;

// Supabase client uses parameterized queries, so SQL injection is not a risk.
// This function only trims whitespace from input strings.
export function sanitizeInput(input: string | null | undefined): string {
  if (input === null || input === undefined) {
    return '';
  }
  return input.trim();
}

// Sanitize reservation object fields
function sanitizeReservation(reservation: any): any {
  const result: any = {};
  
  for (const [key, value] of Object.entries(reservation)) {
    if (typeof value === 'string') {
      result[key] = sanitizeInput(value);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

// Reservation functions
export async function getReservations() {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .not('status', 'eq', 'cancelled')
      .order('fecha', { ascending: true });
    
    if (error) {
      throw error;
    }
    
    // Normalize DB columns to application shape where needed
    return (data || []).map((item: any) => ({
      ...item,
      horaInicio: item.inicio,
      horaFin: item.fin,
      cantidadPersonas: item.personas,
      createdAt: item.created_at
    }));
  } catch (error) {
    return [];
  }
}

export async function createReservation(reservation: Omit<Reservation, 'id' | 'createdAt'>) {
  try {
    // Sanitize inputs
    const sanitizedReservation = sanitizeReservation(reservation);
    // Enforce server-side rule: no reservations on Sundays
    try {
      const parsedDate = new Date(sanitizedReservation.fecha);
      if (!isNaN(parsedDate.getTime()) && parsedDate.getDay() === 0) {
        throw new Error('No se permiten reservas los domingos');
      }
    } catch (e) {
      // If parsing fails, continue and let other validations handle it
    }
    
    // Check if the time slot is available before creating
    const isAvailable = await checkAvailability(
      sanitizedReservation.fecha,
      sanitizedReservation.inicio || sanitizedReservation.horaInicio,
      sanitizedReservation.fin || sanitizedReservation.horaFin
    );

    if (!isAvailable) {
      throw new Error('El horario seleccionado no está disponible.');
    }

    const { data, error } = await supabase
      .from('reservations')
      .insert([
        { 
          responsable: sanitizedReservation.responsable,
          email: sanitizedReservation.email,
          motivo: sanitizedReservation.motivo,
          fecha: sanitizedReservation.fecha,
          inicio: sanitizedReservation.inicio || sanitizedReservation.horaInicio,
          fin: sanitizedReservation.fin || sanitizedReservation.horaFin,
          personas: sanitizedReservation.personas || sanitizedReservation.cantidadPersonas,
          created_at: new Date().toISOString() 
        }
      ])
      .select();
    
    if (error) {
      throw error;
    }

    // Send confirmation email to user
    try {
      await sendEmail({
        type: 'confirmation',
        recipient: sanitizedReservation.email,
        reservation: {
          id: data[0].id,
          ...sanitizedReservation
        }
      });
    } catch (emailError) {
      // Don't throw here, we still want to keep the reservation
    }

    // Send notification to admin
    try {
      await sendEmail({
        type: 'new-reservation',
        recipient: 'admin@system.com', // Production admin email would be here
        reservation: {
          id: data[0].id,
          ...sanitizedReservation
        }
      });
    } catch (emailError) {
      // Don't throw here, we still want to keep the reservation
    }

    return data[0];
  } catch (error) {
    throw error;
  }
}

export async function deleteReservation(id: string, reason?: string) {
  try {
    if (!id) {
      throw new Error("No reservation ID provided for deletion");
    }

    // Get the reservation details before modifying
    const { data: reservation, error: getError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', id)
      .single();

    if (getError) {
      throw getError;
    }

    // Try to get current user id to populate updated_by / cancelled_by
    let adminId: string | null = null;
    try {
      const { data: userData } = await supabase.auth.getUser();
      adminId = userData?.user?.id || null;
    } catch (e) {
      // ignore - adminId will remain null if we can't get it
    }

    // Compute previous status for audit
    const previousStatus = reservation?.status || (reservation?.approved ? 'approved' : 'pending');

    // Insert an audit row into cancellations (best-effort, don't hard-fail the flow)
    try {
      // cancellations table may not be present in the generated DB types yet,
      // use a typed-any cast to avoid TS overload errors while attempting to write audit rows.
      await (supabase as any).from('cancellations').insert([{
        reservation_id: id,
        cancelled_by: adminId,
        reason: sanitizeInput(reason) || null,
        previous_status: previousStatus,
        reservation_snapshot: reservation || {},
        created_at: new Date().toISOString()
      }]);
    } catch (auditErr) {
      // Log if needed, but continue - audit table may not exist in older environments
      logger.warn('Failed to write cancellation audit', auditErr);
    }

    // Soft-cancel the reservation: update status, admin_notes and updated_by
    const updateObject: any = {
      status: 'cancelled',
      admin_notes: reason ? `Motivo: ${sanitizeInput(reason)}` : 'Motivo: No especificado'
    };
    if (adminId) updateObject.updated_by = adminId;

    const { error: updateError } = await supabase
      .from('reservations')
      .update(updateObject)
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // Send cancellation email (include the reason)
    if (reservation) {
      try {
        const cancellationReasonForEmail = reason ? sanitizeInput(reason) : 'No especificado';
        await sendEmail({
          type: 'cancellation',
          recipient: reservation.email,
          reservation: {
            ...reservation,
            cancellationReason: cancellationReasonForEmail
          }
        });
      } catch (emailError) {
        // Don't throw if email fails
      }
    }

    return true;
  } catch (error) {
    throw error;
  }
}

// Admin authentication using Supabase Auth
export async function loginAdmin(email: string, password: string) {
  try {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    
    // First, try to authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (authError) {
      // Authentication failed - do not provide fallback credentials
      throw new Error('Invalid credentials');
    }
    
    // Auth was successful, check if user is an admin
    if (authData.user) {
      // Try to check admin status using the is_admin RPC function
      const { data: isAdminData, error: isAdminError } = await (supabase as any)
        .rpc('is_admin', { user_id: authData.user.id });
      
      if (isAdminError) {
        // Fallback to admins table query
        const { data: adminCheck } = await (supabase as any)
          .from('admins')
          .select('*')
          .eq('user_id', authData.user.id)
          .maybeSingle();
        
        // Also check by email for backward compatibility
        const { data: emailCheck } = await (supabase as any)
          .from('admins')
          .select('*')
          .eq('email', email)
          .maybeSingle();
        
        if (adminCheck || emailCheck) {
          // If email exists but user_id doesn't match, update it
          if (emailCheck && (!emailCheck.user_id || emailCheck.user_id !== authData.user.id)) {
            await (supabase as any)
              .from('admins')
              .upsert({ 
                email: email,
                user_id: authData.user.id
              });
          }
          
          return { user: authData.user, session: authData.session };
        }
        
        throw new Error('Unauthorized');
      } 
      
      if (!isAdminData) {
        throw new Error('Unauthorized');
      }
      
      return { user: authData.user, session: authData.session };
    }
    
    throw new Error('Unable to authenticate');
  } catch (error) {
    throw error;
  }
}

export async function blockTimeSlot(date: string, startTime: string, endTime: string, reason: string) {
  try {
    // First, get any existing reservations in this time slot
    const { data: existingReservations, error: queryError } = await supabase
      .from('reservations')
      .select('*')
      .not('status', 'eq', 'cancelled')
      .eq('fecha', date)
      .or(`inicio.gte.${startTime},fin.lte.${endTime}`);
    
    if (queryError) {
      throw queryError;
    }
    
    // Cancel any existing reservations with a specific cancellation reason
    if (existingReservations && existingReservations.length > 0) {
      const cancellationReason = `La reserva fue cancelada porque el administrador bloqueó este horario: ${reason}`;
      
      for (const reservation of existingReservations) {
        if (reservation.responsable !== 'Admin') {
          try {
            await deleteReservation(reservation.id, cancellationReason);
          } catch (error) {
            // Continue with others even if one fails
          }
        }
      }
    }
    
    // Create a "blocked" reservation owned by the admin
    const blockedReservation = {
      responsable: 'Admin',
      email: 'admin@system.com',
      motivo: `BLOQUEADO: ${reason}`,
      fecha: date,
      inicio: startTime,
      fin: endTime,
      personas: 0
    };

    const { data, error: insertError } = await supabase
      .from('reservations')
      .insert([
        {
          ...blockedReservation,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (insertError) {
      throw insertError;
    }

    // Normalize returned row to app-friendly shape
    const returned = data?.[0] ? { ...data[0], horaInicio: data[0].inicio, horaFin: data[0].fin, cantidadPersonas: data[0].personas, createdAt: data[0].created_at } : null;

    return returned;
  } catch (error) {
    throw error;
  }
}

export async function unblockTimeSlot(blockId: string) {
  return await deleteReservation(blockId, 'Time slot unblocked by admin');
}

export async function checkAvailability(date: string, startTime: string, endTime: string, excludeId?: string) {
  try {
    // Do not allow availability on Sundays
    try {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime()) && parsed.getDay() === 0) {
        return false;
      }
    } catch (e) {
      // ignore parse errors and continue with DB check
    }
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('*')
      .not('status', 'eq', 'cancelled')
      .eq('fecha', date);
    
    if (error) {
      throw error;
    }
    
    // If there's an excludeId (for updates), filter it out
    const relevantReservations = excludeId 
      ? reservations?.filter(res => res.id !== excludeId) 
      : reservations;
    
    // Check if there's any overlap with existing reservations
    const isAvailable = !relevantReservations?.some(reservation => {
      const reservationStart = (reservation as any).inicio || (reservation as any).horaInicio;
      const reservationEnd = (reservation as any).fin || (reservation as any).horaFin;
      
      // Check overlap
      const hasOverlap = (
        (startTime >= reservationStart && startTime < reservationEnd) ||
        (endTime > reservationStart && endTime <= reservationEnd) ||
        (startTime <= reservationStart && endTime >= reservationEnd)
      );
      
      return hasOverlap;
    });
    
    return isAvailable;
  } catch (error) {
    // Return false on error to prevent potentially conflicting bookings
    return false;
  }
}

// Helper function to send emails using our Edge Function
async function sendEmail(emailData: {
  type: string;
  recipient: string;
  reservation: any;
  changes?: string;
}) {
  try {
    // Map internal synonyms to the expected edge-function types
    let mappedType = emailData.type;
    if (emailData.type === 'confirmation') mappedType = 'confirm-reservation';
    if (emailData.type === 'cancellation') mappedType = 'reservation-cancelled';

    const response = await (supabase as any).functions.invoke('send-email', {
      body: {
        ...emailData,
        type: mappedType
      }
    });

    if (response?.error) {
      logger.warn('sendEmail: Edge function returned an error', response.error);
      return null;
    }

    return response.data;
  } catch (error) {
    // Don't throw here - we don't want email failures to block the main operation
    logger.error('sendEmail exception', error);
    return null;
  }
}
