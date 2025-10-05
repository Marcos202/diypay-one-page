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

    // Get all withdrawal requests with producer information
    const { data: withdrawalRequests, error: withdrawalError } = await supabase
      .from('withdrawal_requests')
      .select(`
        id,
        amount_cents,
        status,
        requested_at,
        processed_at,
        admin_notes,
        producer_id,
        profiles!withdrawal_requests_producer_id_fkey (
          id,
          email,
          full_name
        )
      `)
      .order('requested_at', { ascending: false });

    if (withdrawalError) {
      console.error('Error fetching withdrawal requests:', withdrawalError);
      return new Response(JSON.stringify({ error: 'Failed to fetch withdrawal requests' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Format the data for frontend consumption
    const formattedData = withdrawalRequests?.map(request => ({
      id: request.id,
      amount_cents: request.amount_cents,
      status: request.status,
      requested_at: request.requested_at,
      processed_at: request.processed_at,
      admin_notes: request.admin_notes,
      producer: {
        id: request.profiles?.id,
        email: request.profiles?.email,
        full_name: request.profiles?.full_name
      }
    })) || [];

    console.log(`Fetched ${formattedData.length} withdrawal requests`);

    return new Response(JSON.stringify({ data: formattedData }), {
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