import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      console.error('Authentication error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User requesting withdrawal:', user.id)

    // Check if user is a producer
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'producer') {
      console.error('Profile error or not a producer:', profileError, profile)
      return new Response(
        JSON.stringify({ error: 'Only producers can request withdrawals' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { amount_cents } = await req.json()

    if (!amount_cents || typeof amount_cents !== 'number' || amount_cents <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount. Must be a positive number.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Withdrawal amount requested:', amount_cents)

    // Get withdrawal fee from platform settings and producer settings
    const serviceRoleSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch platform settings and producer settings
    const [platformResult, producerResult] = await Promise.all([
      serviceRoleSupabase.from('platform_settings').select('default_withdrawal_fee_cents').single(),
      serviceRoleSupabase.from('producer_settings').select('custom_withdrawal_fee_cents').eq('producer_id', user.id).maybeSingle()
    ])

    const defaultWithdrawalFeeCents = platformResult.data?.default_withdrawal_fee_cents || 367
    const customWithdrawalFeeCents = producerResult.data?.custom_withdrawal_fee_cents
    const withdrawalFeeCents = customWithdrawalFeeCents !== null ? customWithdrawalFeeCents : defaultWithdrawalFeeCents

    console.log('Withdrawal fee calculated:', withdrawalFeeCents)

    // Get producer's available balance
    const { data: financials, error: financialsError } = await supabaseClient
      .from('producer_financials')
      .select('available_balance_cents')
      .eq('producer_id', user.id)
      .single()

    if (financialsError) {
      console.error('Error fetching financials:', financialsError)
      return new Response(
        JSON.stringify({ error: 'Error fetching balance information' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const availableBalance = financials?.available_balance_cents || 0
    console.log('Available balance:', availableBalance)

    // Check if balance is sufficient for withdrawal amount + fee
    const totalRequired = amount_cents + withdrawalFeeCents
    if (totalRequired > availableBalance) {
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient balance for withdrawal amount plus fee', 
          available_balance: availableBalance,
          requested_amount: amount_cents,
          withdrawal_fee: withdrawalFeeCents,
          total_required: totalRequired
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create withdrawal request
    const { data: withdrawalRequest, error: insertError } = await supabaseClient
      .from('withdrawal_requests')
      .insert({
        producer_id: user.id,
        amount_cents: amount_cents,
        fee_cents: withdrawalFeeCents,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating withdrawal request:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create withdrawal request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Withdrawal request created:', withdrawalRequest.id)

    // Update available balance (subtract the requested amount + fee)
    const { error: updateError } = await supabaseClient
      .from('producer_financials')
      .update({
        available_balance_cents: availableBalance - totalRequired
      })
      .eq('producer_id', user.id)

    if (updateError) {
      console.error('Error updating balance:', updateError)
      // Rollback the withdrawal request if balance update fails
      await supabaseClient
        .from('withdrawal_requests')
        .delete()
        .eq('id', withdrawalRequest.id)

      return new Response(
        JSON.stringify({ error: 'Failed to update balance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        withdrawal_request: withdrawalRequest,
        message: 'Withdrawal request created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})