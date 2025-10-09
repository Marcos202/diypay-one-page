import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9';
import { corsHeaders } from '../_shared/cors.ts';

console.log('process-webhook-deliveries function started');

// Webhook signature generation
async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `sha256=${hashHex}`;
}

// Exponential backoff calculation
function calculateBackoffDelay(attempts: number): number {
  const baseDelay = 60; // 1 minute in seconds
  const maxDelay = 3600; // 1 hour in seconds
  const delayInSeconds = Math.min(baseDelay * Math.pow(2, attempts), maxDelay);
  return delayInSeconds * 1000; // Return in milliseconds
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing webhook delivery jobs...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ======================= INÍCIO DA CORREÇÃO =======================
    // PASSO 1: Chamar a função RPC para buscar e travar jobs atomicamente, prevenindo race conditions.
    const { data: jobs, error: jobsError } = await supabaseClient
      .rpc('get_and_lock_pending_webhook_jobs', { p_limit: 50 });

    if (jobsError) {
      console.error('Error fetching and locking webhook jobs:', jobsError);
      throw jobsError;
    }
    // ======================== FIM DA CORREÇÃO =========================

    console.log(`Found and locked ${jobs?.length || 0} webhook delivery jobs to process`);

    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No webhook delivery jobs to process',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    let successCount = 0;
    let failureCount = 0;

    // Process each webhook delivery job
    for (const job of jobs) {
      try {
        // REMOVIDO: O lock manual que estava aqui foi removido pois a função RPC já cuida disso.
        
        // Fetch webhook endpoint details separately
        const { data: endpoint, error: endpointError } = await supabaseClient
          .from('webhook_endpoints')
          .select('id, url, secret, name')
          .eq('id', job.webhook_endpoint_id)
          .single();

        if (endpointError || !endpoint) {
          console.error(`Failed to fetch webhook endpoint for job ${job.id}:`, endpointError);
          
          // Liberar lock e marcar como falha
          await supabaseClient
            .from('webhook_delivery_jobs')
            .update({
              status: 'failed',
              attempts: job.attempts + 1,
              last_error: 'Endpoint not found',
              last_attempt_at: new Date().toISOString(),
              processing_started_at: null
            })
            .eq('id', job.id);
          failureCount++;
          continue;
        }

        console.log(`Processing webhook job ${job.id} for endpoint ${endpoint.name} (attempt ${job.attempts + 1}/${job.max_attempts})`);

        // Prepare the payload
        const payloadString = JSON.stringify(job.payload);
        const signature = await generateSignature(payloadString, endpoint.secret);

        // Prepare headers
        const headers = {
          'Content-Type': 'application/json',
          'User-Agent': 'DIYPay-Webhooks/1.0',
          'X-DIYPay-Signature': signature,
          'X-DIYPay-Event-Type': job.event_type,
          'X-DIYPay-Event-ID': job.id,
          'X-DIYPay-Delivery-Attempt': (job.attempts + 1).toString()
        };

        // Attempt webhook delivery
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers,
          body: payloadString,
          signal: AbortSignal.timeout(30000)
        });

        const responseText = await response.text();
        const isSuccess = response.status >= 200 && response.status < 300;

        console.log(`Webhook delivery attempt for job ${job.id}: status ${response.status}, success: ${isSuccess}`);

        if (isSuccess) {
          // Mark as successful and release lock
          const { error: updateError } = await supabaseClient
            .from('webhook_delivery_jobs')
            .update({
              status: 'delivered',
              attempts: job.attempts + 1,
              last_attempt_at: new Date().toISOString(),
              processing_started_at: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);

          if (updateError) {
            console.error(`Error updating successful job ${job.id}:`, updateError);
          } else {
            successCount++;
            await supabaseClient.from('webhook_event_logs').insert({
              endpoint_id: endpoint.id,
              event_type: job.event_type,
              status: 'success',
              payload: job.payload,
              response_code: response.status,
              response_body: responseText.substring(0, 1000)
            });
          }
        } else {
          // Handle failure and release lock
          const nextAttempts = job.attempts + 1;
          const shouldRetry = nextAttempts < job.max_attempts;
          let nextAttemptAt = null;

          if (shouldRetry) {
            nextAttemptAt = new Date(Date.now() + calculateBackoffDelay(nextAttempts)).toISOString();
          }

          const { error: updateError } = await supabaseClient
            .from('webhook_delivery_jobs')
            .update({
              status: shouldRetry ? 'pending' : 'failed',
              attempts: nextAttempts,
              last_attempt_at: new Date().toISOString(),
              last_error: `HTTP ${response.status}: ${responseText.substring(0, 500)}`,
              next_attempt_at: nextAttemptAt,
              processing_started_at: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);

          if (updateError) {
            console.error(`Error updating failed job ${job.id}:`, updateError);
          } else {
            failureCount++;
            await supabaseClient.from('webhook_event_logs').insert({
              endpoint_id: endpoint.id,
              event_type: job.event_type,
              status: 'failed',
              payload: job.payload,
              response_code: response.status,
              response_body: responseText.substring(0, 1000)
            });
          }
          console.log(`Webhook job ${job.id} failed with status ${response.status}. ${shouldRetry ? 'Will retry' : 'Max attempts reached'}`);
        }
      } catch (error: any) {
        console.error(`Error processing webhook job ${job.id}:`, error);
        
        const nextAttempts = job.attempts + 1;
        const shouldRetry = nextAttempts < job.max_attempts;
        let nextAttemptAt = null;

        if (shouldRetry) {
          nextAttemptAt = new Date(Date.now() + calculateBackoffDelay(nextAttempts)).toISOString();
        }

        await supabaseClient
          .from('webhook_delivery_jobs')
          .update({
            status: shouldRetry ? 'pending' : 'failed',
            attempts: nextAttempts,
            last_attempt_at: new Date().toISOString(),
            last_error: `Error: ${error.message}`.substring(0, 500),
            next_attempt_at: nextAttemptAt,
            processing_started_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        failureCount++;
        await supabaseClient.from('webhook_event_logs').insert({
          endpoint_id: job.webhook_endpoint_id,
          event_type: job.event_type,
          status: 'error',
          payload: job.payload,
          response_code: null,
          response_body: `Error: ${error.message}`.substring(0, 1000)
        });
      }
    }

    console.log(`Webhook processing completed. Success: ${successCount}, Failures: ${failureCount}`);

    return new Response(JSON.stringify({
      message: 'Webhook delivery processing completed',
      processed: jobs.length,
      successful: successCount,
      failed: failureCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error in webhook delivery processor:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process webhook deliveries',
        details: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
