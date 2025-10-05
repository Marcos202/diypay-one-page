import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9';
import { corsHeaders } from '../_shared/cors.ts';

console.log('get-webhook-logs function started');

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

    // Get webhook ID from query parameters
    const url = new URL(req.url);
    const webhookId = url.searchParams.get('webhook_id');

    if (!webhookId) {
      throw new Error('Missing webhook_id parameter');
    }

    console.log('Fetching logs for webhook:', webhookId);

    // First verify that the user owns this webhook
    const { data: webhook, error: webhookError } = await supabaseClient
      .from('webhook_endpoints')
      .select('id')
      .eq('id', webhookId)
      .eq('producer_id', user.id)
      .single();

    if (webhookError || !webhook) {
      console.error('Webhook verification error:', webhookError);
      throw new Error('Webhook not found or not authorized');
    }

    // Fetch logs for the webhook
    const { data: logs, error } = await supabaseClient
      .from('webhook_event_logs')
      .select('*')
      .eq('endpoint_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching webhook logs:', error);
      throw error;
    }

    console.log('Successfully fetched webhook logs:', logs?.length);

    return new Response(JSON.stringify(logs || []), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in get-webhook-logs function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});