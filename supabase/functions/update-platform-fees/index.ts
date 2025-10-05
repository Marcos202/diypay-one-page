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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the Authorization header
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader) {
      console.error('Missing Authorization header')
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Set the auth context
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      console.error('Authentication error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      console.error('Authorization error: User is not admin')
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get request body
    const payload = await req.json()

    // Validate required fields and convert values appropriately
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Handle numeric fields - convert to proper types
    if (payload.default_pix_fee_percent !== undefined) {
      updateData.default_pix_fee_percent = parseFloat(payload.default_pix_fee_percent)
    }
    if (payload.default_boleto_fee_percent !== undefined) {
      updateData.default_boleto_fee_percent = parseFloat(payload.default_boleto_fee_percent)
    }
    if (payload.default_card_fee_percent !== undefined) {
      updateData.default_card_fee_percent = parseFloat(payload.default_card_fee_percent)
    }
    if (payload.default_fixed_fee_cents !== undefined) {
      updateData.default_fixed_fee_cents = parseInt(payload.default_fixed_fee_cents)
    }
    if (payload.default_pix_release_days !== undefined) {
      updateData.default_pix_release_days = parseInt(payload.default_pix_release_days)
    }
    if (payload.default_boleto_release_days !== undefined) {
      updateData.default_boleto_release_days = parseInt(payload.default_boleto_release_days)
    }
    if (payload.default_card_release_days !== undefined) {
      updateData.default_card_release_days = parseInt(payload.default_card_release_days)
    }
    if (payload.default_security_reserve_percent !== undefined) {
      updateData.default_security_reserve_percent = parseFloat(payload.default_security_reserve_percent)
    }
    if (payload.default_security_reserve_days !== undefined) {
      updateData.default_security_reserve_days = parseInt(payload.default_security_reserve_days)
    }
    if (payload.default_anticipation_fee_percent !== undefined) {
      updateData.default_anticipation_fee_percent = parseFloat(payload.default_anticipation_fee_percent)
    }
    if (payload.default_withdrawal_fee_cents !== undefined) {
      updateData.default_withdrawal_fee_cents = parseInt(payload.default_withdrawal_fee_cents)
    }
    if (payload.card_installment_interest_rate !== undefined) {
      updateData.card_installment_interest_rate = parseFloat(payload.card_installment_interest_rate)
    }

    console.log('Updating platform settings with:', updateData)

    // Get the first (and only) platform settings record
    const { data: currentSettings, error: currentError } = await supabase
      .from('platform_settings')
      .select('id')
      .limit(1)
      .single()

    if (currentError || !currentSettings) {
      console.error('Error getting current platform settings:', currentError)
      return new Response(
        JSON.stringify({ error: 'Failed to get platform settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update platform settings
    const { data: updatedSettings, error: updateError } = await supabase
      .from('platform_settings')
      .update(updateData)
      .eq('id', currentSettings.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating platform settings:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update platform settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Platform settings updated successfully')

    return new Response(
      JSON.stringify({ data: updatedSettings, message: 'Platform settings updated successfully' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})