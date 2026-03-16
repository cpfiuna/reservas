
const allowedOrigin = Deno.env.get('CORS_ORIGIN') || Deno.env.get('SITE_URL') || '*';

export const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
