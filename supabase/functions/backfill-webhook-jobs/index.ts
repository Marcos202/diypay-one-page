import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9';
import { corsHeaders } from '../_shared/cors.ts';

console.log('backfill-webhook-jobs function started');

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Call the backfill function
    const { data, error } = await supabaseClient.rpc('backfill_webhook_delivery_jobs');

    if (error) {
      console.error('Error running backfill:', error);
      throw error;
    }

    console.log('Backfill completed:', data);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in backfill webhook jobs:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to backfill webhook jobs',
        details: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});