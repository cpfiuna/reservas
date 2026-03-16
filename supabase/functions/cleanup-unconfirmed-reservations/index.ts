import { serve } from 'https://deno.land/std@0.201.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js'

serve(async () => {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return new Response('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars', { status: 500 })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  // Delete unconfirmed reservations older than 24 hours
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { error } = await supabase
    .from('reservations')
    .delete()
    .match({ confirmed: false })
    .lt('created_at', cutoff)

  if (error) {
    return new Response(`Cleanup failed: ${error.message}`, { status: 500 })
  }

  return new Response('Cleanup successful', { status: 200 })
})
