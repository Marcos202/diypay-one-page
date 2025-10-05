import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9';
import { corsHeaders } from '../_shared/cors.ts';

console.log('delete-producer-webhook function started');

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the auth token from the request header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Set the auth token to get the user context
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('User authentication error:', userError);
      throw new Error('Invalid authentication');
    }

    // Parse the request body
    const { id } = await req.json();

    if (!id) {
      throw new Error('Missing webhook ID');
    }

    console.log('Deleting webhook:', id, 'for producer:', user.id);

    // Delete webhook endpoint
    const { error } = await supabaseClient
      .from('webhook_endpoints')
      .delete()
      .eq('id', id)
      .eq('producer_id', user.id);

    if (error) {
      console.error('Error deleting webhook:', error);
      throw error;
    }

    console.log('Successfully deleted webhook:', id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in delete-producer-webhook function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});