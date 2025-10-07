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
  const baseDelay = 60; // 1 minute
  const maxDelay = 3600; // 1 hour
  const delay = Math.min(baseDelay * Math.pow(2, attempts), maxDelay);
  return delay;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing webhook delivery jobs...');

    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get pending webhook delivery jobs that are ready for delivery
    const { data: jobs, error: jobsError } = await supabaseClient
      .from('webhook_delivery_jobs')
      .select('*')
      .eq('status', 'pending')
      .lte('next_attempt_at', new Date().toISOString())
      .lt('attempts', 3) // Filter by max_attempts directly
      .order('created_at', { ascending: true })
      .limit(50); // Process up to 50 jobs at a time

    if (jobsError) {
      console.error('Error fetching webhook jobs:', jobsError);
      throw jobsError;
    }

    console.log(`Found ${jobs?.length || 0} webhook delivery jobs to process`);

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
        // Fetch webhook endpoint details separately
        const { data: endpoint, error: endpointError } = await supabaseClient
          .from('webhook_endpoints')
          .select('id, url, secret, name')
          .eq('id', job.webhook_endpoint_id)
          .single();

        if (endpointError || !endpoint) {
          console.error(`Failed to fetch webhook endpoint for job ${job.id}:`, endpointError);
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
          // Set a 30-second timeout
          signal: AbortSignal.timeout(30000)
        });

        const responseText = await response.text();
        const isSuccess = response.status >= 200 && response.status < 300;

        console.log(`Webhook delivery attempt for job ${job.id}: status ${response.status}, success: ${isSuccess}`);

        if (isSuccess) {
          // Mark as successful
          const { error: updateError } = await supabaseClient
            .from('webhook_delivery_jobs')
            .update({
              status: 'delivered',
              attempts: job.attempts + 1,
              last_attempt_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);

          if (updateError) {
            console.error(`Error updating successful job ${job.id}:`, updateError);
          } else {
            successCount++;
            
            // Log successful delivery
            const { error: logError } = await supabaseClient
              .from('webhook_event_logs')
              .insert({
                endpoint_id: endpoint.id,
                event_type: job.event_type,
                status: 'success',
                payload: job.payload,
                response_code: response.status,
                response_body: responseText.substring(0, 1000) // Limit response body size
              });

            if (logError) {
              console.error(`Error logging successful delivery for job ${job.id}:`, logError);
            }
          }
        } else {
          // Handle failure
          const nextAttempts = job.attempts + 1;
          const shouldRetry = nextAttempts < job.max_attempts;

          let jobStatus = 'failed';
          let nextAttemptAt = null;

          if (shouldRetry) {
            jobStatus = 'pending';
            const backoffSeconds = calculateBackoffDelay(nextAttempts);
            nextAttemptAt = new Date(Date.now() + backoffSeconds * 1000).toISOString();
          }

          // Update job with failure info
          const { error: updateError } = await supabaseClient
            .from('webhook_delivery_jobs')
            .update({
              status: jobStatus,
              attempts: nextAttempts,
              last_attempt_at: new Date().toISOString(),
              last_error: `HTTP ${response.status}: ${responseText.substring(0, 500)}`,
              next_attempt_at: nextAttemptAt,
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);

          if (updateError) {
            console.error(`Error updating failed job ${job.id}:`, updateError);
          } else {
            failureCount++;
            
            // Log failed delivery
            const { error: logError } = await supabaseClient
              .from('webhook_event_logs')
              .insert({
                endpoint_id: endpoint.id,
                event_type: job.event_type,
                status: 'failed',
                payload: job.payload,
                response_code: response.status,
                response_body: responseText.substring(0, 1000)
              });

            if (logError) {
              console.error(`Error logging failed delivery for job ${job.id}:`, logError);
            }
          }

          console.log(`Webhook job ${job.id} failed with status ${response.status}. ${shouldRetry ? 'Will retry' : 'Max attempts reached'}`);
        }

      } catch (error: any) {
        console.error(`Error processing webhook job ${job.id}:`, error);
        
        // Update job with error
        const nextAttempts = job.attempts + 1;
        const shouldRetry = nextAttempts < job.max_attempts;

        let jobStatus = 'failed';
        let nextAttemptAt = null;

        if (shouldRetry) {
          jobStatus = 'pending';
          const backoffSeconds = calculateBackoffDelay(nextAttempts);
          nextAttemptAt = new Date(Date.now() + backoffSeconds * 1000).toISOString();
        }

        const { error: updateError } = await supabaseClient
          .from('webhook_delivery_jobs')
          .update({
            status: jobStatus,
            attempts: nextAttempts,
            last_attempt_at: new Date().toISOString(),
            last_error: `Error: ${error.message}`.substring(0, 500),
            next_attempt_at: nextAttemptAt,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        if (updateError) {
          console.error(`Error updating job ${job.id} after exception:`, updateError);
        }

        failureCount++;

        // Log error
        const { error: logError } = await supabaseClient
          .from('webhook_event_logs')
          .insert({
            endpoint_id: job.webhook_endpoint_id, // Use job.webhook_endpoint_id for errors since we might not have fetched the endpoint
            event_type: job.event_type,
            status: 'error',
            payload: job.payload,
            response_code: null,
            response_body: `Error: ${error.message}`.substring(0, 1000)
          });

        if (logError) {
          console.error(`Error logging error for job ${job.id}:`, logError);
        }
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