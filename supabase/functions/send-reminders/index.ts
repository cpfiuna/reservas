import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigin = Deno.env.get('CORS_ORIGIN') || Deno.env.get('SITE_URL') || '*';

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get current time and 1 hour from now
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const oneHourFiveMinFromNow = new Date(now.getTime() + 65 * 60 * 1000);

    // Format date for comparison (YYYY-MM-DD)
    const targetDate = oneHourFromNow.toISOString().split('T')[0];

    // Format time for comparison (HH:MM:SS)
    const minTime = oneHourFromNow.toTimeString().split(' ')[0];
    const maxTime = oneHourFiveMinFromNow.toTimeString().split(' ')[0];

    console.log(`Checking reservations for ${targetDate} between ${minTime} and ${maxTime}`);

    // Get reservations starting in approximately 1 hour
    // Use the new `status` column and ignore cancelled reservations
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('status', 'approved')
      .eq('confirmed', true)
      .not('status', 'eq', 'cancelled')
      .eq('fecha', targetDate)
      .gte('inicio', minTime)
      .lte('inicio', maxTime);

    if (error) {
      console.error('Error fetching reservations:', error);
      throw error;
    }

    console.log(`Found ${reservations?.length || 0} reservations to remind`);

    let sentCount = 0;
    let errorCount = 0;

    // Send reminder emails
    for (const reservation of reservations || []) {
      try {
        console.log(`Sending reminder to ${reservation.email} for reservation ${reservation.id}`);
        
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            type: 'reservation-reminder',
            recipient: reservation.email,
            reservation: {
              id: reservation.id,
              responsable: reservation.responsable,
              email: reservation.email,
              motivo: reservation.motivo,
              fecha: reservation.fecha,
              inicio: reservation.inicio,
              fin: reservation.fin,
              personas: reservation.personas
            }
          }
        });

        if (emailError) {
          console.error(`Error sending reminder to ${reservation.email}:`, emailError);
          errorCount++;
        } else {
          console.log(`Successfully sent reminder to ${reservation.email}`);
          sentCount++;
        }
      } catch (err) {
        console.error(`Failed to send reminder for reservation ${reservation.id}:`, err);
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Reminder check complete`,
        totalReservations: reservations?.length || 0,
        sent: sentCount,
        errors: errorCount,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  } catch (error) {
    console.error('Send reminders error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
});
