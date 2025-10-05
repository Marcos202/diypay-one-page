import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Set up supabase client with user context
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      console.error('Error getting user:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      console.error('User is not admin:', profileError);
      return new Response(JSON.stringify({ error: 'Access denied. Admin role required.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const { request_id, new_status, admin_notes } = await req.json();

    if (!request_id || !new_status) {
      return new Response(JSON.stringify({ error: 'Missing required fields: request_id and new_status' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!['approved', 'rejected', 'paid'].includes(new_status)) {
      return new Response(JSON.stringify({ error: 'Invalid status. Must be approved, rejected, or paid' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get the withdrawal request details
    const { data: withdrawalRequest, error: getError } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', request_id)
      .single();

    if (getError || !withdrawalRequest) {
      console.error('Error fetching withdrawal request:', getError);
      return new Response(JSON.stringify({ error: 'Withdrawal request not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if request is still pending
    if (withdrawalRequest.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Withdrawal request has already been processed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update the withdrawal request status
    const { error: updateError } = await supabase
      .from('withdrawal_requests')
      .update({
        status: new_status,
        processed_at: new Date().toISOString(),
        admin_notes: admin_notes || null
      })
      .eq('id', request_id);

    if (updateError) {
      console.error('Error updating withdrawal request:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update withdrawal request' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // If approved or paid, debit the amount from producer's available balance
    if (new_status === 'approved' || new_status === 'paid') {
      const { error: balanceError } = await supabase.rpc('upsert_producer_balance', {
        p_producer_id: withdrawalRequest.producer_id,
        amount_to_add: -withdrawalRequest.amount_cents // Negative amount to debit
      });

      if (balanceError) {
        console.error('Error debiting producer balance:', balanceError);
        return new Response(JSON.stringify({ error: 'Failed to debit funds from producer balance' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // If rejected, return the funds to the producer's available balance
    if (new_status === 'rejected') {
      const { error: balanceError } = await supabase.rpc('upsert_producer_balance', {
        p_producer_id: withdrawalRequest.producer_id,
        amount_to_add: withdrawalRequest.amount_cents
      });

      if (balanceError) {
        console.error('Error updating producer balance:', balanceError);
        return new Response(JSON.stringify({ error: 'Failed to return funds to producer balance' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    console.log(`Withdrawal request ${request_id} processed with status: ${new_status}`);

    return new Response(JSON.stringify({ 
      message: `Withdrawal request ${new_status} successfully`,
      request_id,
      new_status
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});