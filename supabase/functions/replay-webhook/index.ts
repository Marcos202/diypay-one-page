import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9';
import { corsHeaders } from '../_shared/cors.ts';

console.log('replay-webhook function started');

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

    const { webhook_endpoint_id, event_log_id } = await req.json();

    if (!webhook_endpoint_id) {
      throw new Error('webhook_endpoint_id is required');
    }

    console.log(`Replaying webhook for endpoint: ${webhook_endpoint_id}, user: ${user.id}`);

    // Verify the user owns this webhook endpoint
    const { data: webhook, error: webhookError } = await supabaseClient
      .from('webhook_endpoints')
      .select('*')
      .eq('id', webhook_endpoint_id)
      .eq('producer_id', user.id)
      .single();

    if (webhookError || !webhook) {
      throw new Error('Webhook endpoint not found or unauthorized');
    }

    let transactionEventId;
    let eventType;
    let payload;

    if (event_log_id) {
      // Replay a specific event from logs
      const { data: eventLog, error: logError } = await supabaseClient
        .from('webhook_event_logs')
        .select('*')
        .eq('id', event_log_id)
        .eq('endpoint_id', webhook_endpoint_id)
        .single();

      if (logError || !eventLog) {
        throw new Error('Event log not found');
      }

      payload = eventLog.payload;
      eventType = eventLog.event_type;
      
      // Try to find the original transaction event
      const { data: transactionEvent } = await supabaseClient
        .from('transaction_events')
        .select('id')
        .eq('event_type', eventLog.event_type)
        .eq('metadata->sale_id', eventLog.payload.sale_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      transactionEventId = transactionEvent?.id;
    } else {
      // Create a test webhook payload
      eventType = 'webhook.test';
      payload = {
        event_id: crypto.randomUUID(),
        event_type: 'webhook.test',
        sale_id: null,
        timestamp: new Date().toISOString(),
        data: {
          message: 'This is a test webhook delivery',
          endpoint_name: webhook.name,
          timestamp: new Date().toISOString()
        }
      };
    }

    // Create a new webhook delivery job
    const { data: job, error: jobError } = await supabaseClient
      .from('webhook_delivery_jobs')
      .insert({
        webhook_endpoint_id: webhook_endpoint_id,
        transaction_event_id: transactionEventId,
        event_type: eventType,
        payload: payload,
        status: 'pending',
        attempts: 0,
        max_attempts: 1, // Only try once for manual replays
        next_attempt_at: new Date().toISOString()
      })
      .select()
      .single();

    if (jobError) {
      console.error('Error creating webhook delivery job:', jobError);
      throw new Error('Failed to create webhook delivery job');
    }

    console.log(`Created webhook delivery job: ${job.id}`);

    // Trigger the webhook processor
    const processorResponse = await supabaseClient.functions.invoke('process-webhook-deliveries');
    
    if (processorResponse.error) {
      console.error('Error invoking webhook processor:', processorResponse.error);
    }

    return new Response(JSON.stringify({
      message: 'Webhook replay initiated successfully',
      job_id: job.id,
      event_type: eventType
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error in replay-webhook function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});