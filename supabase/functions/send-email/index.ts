
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const ALLOWED_ORIGINS = new Set([
  Deno.env.get('CORS_ORIGIN'),
  Deno.env.get('SITE_URL'),
  'https://quincho.cpfiuna.io',
  'https://reservas.cpfiuna.io',
  'http://localhost:5173',
  'http://localhost:8080',
].filter(Boolean) as string[]);

function getCorsOrigin(req: Request): string {
  const origin = req.headers.get('origin') ?? '';
  return ALLOWED_ORIGINS.has(origin) ? origin : (ALLOWED_ORIGINS.values().next().value ?? '*');
}

// Per-venue sender. All senders live on the already-verified cpfiuna.io domain,
// so adding a venue here needs ZERO new DNS. Falls back to quincho.
const VENUE_FROM: Record<string, string> = {
  quincho: "Quincho FIUNA <quincho-noreply@cpfiuna.io>",
  polideportivo: "Polideportivo FIUNA <polideportivo-noreply@cpfiuna.io>",
};
const DEFAULT_VENUE = { slug: 'quincho', name: 'Quincho FIUNA' };

// Resolve the venue for a reservation (self-contained: callers don't need to
// pass venue info). Any failure falls back to the quincho defaults so emails
// are never blocked by a lookup error.
async function resolveVenue(reservationId: string): Promise<{ slug: string; name: string }> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey || !reservationId) return DEFAULT_VENUE;

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: resv } = await supabase
      .from('reservations')
      .select('venue_id')
      .eq('id', reservationId)
      .maybeSingle();
    if (!resv?.venue_id) return DEFAULT_VENUE;

    const { data: venue } = await supabase
      .from('venues')
      .select('slug, name')
      .eq('id', resv.venue_id)
      .maybeSingle();
    if (!venue?.slug) return DEFAULT_VENUE;

    return { slug: venue.slug, name: venue.name ?? DEFAULT_VENUE.name };
  } catch (_err) {
    return DEFAULT_VENUE;
  }
}

interface EmailRequest {
  type: 'confirm-reservation' | 'reservation-approved' | 'reservation-cancelled' | 'reservation-rejected' | 'reservation-reminder';
  recipient: string;
  venueSlug?: string; // Optional: if provided, skips DB lookup
  reservation: {
    id: string;
    responsable: string;
    email: string;
    motivo: string;
    fecha: string;
    inicio: string;
    fin: string;
    personas: number;
  };
  reason?: string; // For cancellation/rejection
  confirmationToken?: string; // For confirm-reservation
}

async function loadTemplate(templateName: string): Promise<string> {
  // All templates are now in the function root directory
  const templatePath = `./${templateName}.html`;
  try {
    const template = await Deno.readTextFile(templatePath);
    return template;
  } catch (error) {
    throw new Error(`Failed to load template ${templateName}`);
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-PY', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function replaceTemplateVariables(template: string, data: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replaceAll(`{{.${key}}}`, value);
  }
  return result;
}

serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": getCorsOrigin(req),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const emailData: EmailRequest = await req.json();
    const { type, recipient, venueSlug, reservation, reason, confirmationToken } = emailData;

    // Use venueSlug from payload if provided; otherwise fall back to DB lookup.
    const venue = venueSlug && VENUE_FROM[venueSlug]
      ? { slug: venueSlug, name: (VENUE_FROM[venueSlug].match(/^([^<]+)/)?.[1].trim() ?? DEFAULT_VENUE.name) }
      : await resolveVenue(reservation.id);
    const fromEmail = VENUE_FROM[venue.slug] ?? VENUE_FROM.quincho;
    const venueName = venue.name;

    let templateName = '';
    let subject = '';
    let templateVars: Record<string, string> = {
      Name: reservation.responsable,
      Email: reservation.email,
      Date: formatDate(reservation.fecha),
      StartTime: reservation.inicio,
      EndTime: reservation.fin,
      Reason: reservation.motivo,
      Personas: (reservation.personas ?? '').toString(),
      VenueName: venueName,
    };
    
    switch (type) {
      case 'confirm-reservation':
        templateName = 'confirm-reservation';
        subject = `Confirma tu solicitud de reserva - ${venueName}`;
        templateVars.ConfirmationURL = `${Deno.env.get('SITE_URL')}/confirmar-reserva?token=${confirmationToken}`;
        break;
      
      case 'reservation-approved':
        templateName = 'reservation-approved';
        subject = `¡Tu reserva ha sido aprobada! - ${venueName}`;
        break;
      
      case 'reservation-cancelled':
        templateName = 'reservation-cancelled';
        subject = `Tu reserva ha sido cancelada - ${venueName}`;
        templateVars.CancellationReason = reason || 'No especificado';
        break;
      
      case 'reservation-rejected':
        templateName = 'reservation-rejected';
        subject = `Solicitud no aprobada - ${venueName}`;
        templateVars.RejectionReason = reason || 'No especificado';
        break;
      
      case 'reservation-reminder':
        templateName = 'reservation-reminder';
        subject = `🔔 Tu reserva comienza en 1 hora - ${venueName}`;
        break;
    }
    
    // Load and populate template
    const template = await loadTemplate(templateName);
    const htmlContent = replaceTemplateVariables(template, templateVars);
    
    // Send email via Resend with simple retry/backoff for transient errors
    const maxRetries = 3;
    let attempt = 0;
    let resendResponse: Response | null = null;
    let lastError: any = null;

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    while (attempt < maxRetries) {
      attempt += 1;
      try {
        resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: recipient,
            subject: subject,
            html: htmlContent,
          }),
        });

        if (!resendResponse.ok) {
          const errorData = await resendResponse.text();
          throw new Error(`Resend API error (status ${resendResponse.status}): ${errorData}`);
        }

        break; // success
      } catch (err) {
        lastError = err;
        // For transient network/server errors, wait exponentially and retry
        if (attempt < maxRetries) {
          const backoffMs = Math.pow(2, attempt) * 300; // 600ms, 1200ms, ...
          console.warn(`Resend attempt ${attempt} failed, retrying in ${backoffMs}ms`, err);
          await delay(backoffMs);
          continue;
        }
        // no more retries
        throw err;
      }
    }

    const resendData = resendResponse ? await resendResponse.json() : null;
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email sent successfully",
        emailId: resendData.id,
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error('Email sending error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
