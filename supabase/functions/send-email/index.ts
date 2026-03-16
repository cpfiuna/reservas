
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const allowedOrigin = Deno.env.get('CORS_ORIGIN') || Deno.env.get('SITE_URL') || '*';

const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = "Quincho FIUNA <quincho-noreply@cpfiuna.io>"; // Resend test domain

interface EmailRequest {
  type: 'confirm-reservation' | 'reservation-approved' | 'reservation-cancelled' | 'reservation-rejected' | 'reservation-reminder';
  recipient: string;
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const emailData: EmailRequest = await req.json();
    const { type, recipient, reservation, reason, confirmationToken } = emailData;
    
    let templateName = '';
    let subject = '';
    let templateVars: Record<string, string> = {
      Name: reservation.responsable,
      Email: reservation.email,
      Date: formatDate(reservation.fecha),
      StartTime: reservation.inicio,
      EndTime: reservation.fin,
      Reason: reservation.motivo,
      Personas: reservation.personas.toString(),
    };
    
    switch (type) {
      case 'confirm-reservation':
        templateName = 'confirm-reservation';
        subject = 'Confirma tu solicitud de reserva - Quincho FIUNA';
        templateVars.ConfirmationURL = `${Deno.env.get('SITE_URL')}/confirmar-reserva?token=${confirmationToken}`;
        break;
      
      case 'reservation-approved':
        templateName = 'reservation-approved';
        subject = '¡Tu reserva ha sido aprobada! - Quincho FIUNA';
        break;
      
      case 'reservation-cancelled':
        templateName = 'reservation-cancelled';
        subject = 'Tu reserva ha sido cancelada - Quincho FIUNA';
        templateVars.CancellationReason = reason || 'No especificado';
        break;
      
      case 'reservation-rejected':
        templateName = 'reservation-rejected';
        subject = 'Solicitud no aprobada - Quincho FIUNA';
        templateVars.RejectionReason = reason || 'No especificado';
        break;
      
      case 'reservation-reminder':
        templateName = 'reservation-reminder';
        subject = '🔔 Tu reserva comienza en 1 hora - Quincho FIUNA';
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
            from: FROM_EMAIL,
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
