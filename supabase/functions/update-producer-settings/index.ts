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

    if (!payload.producer_id) {
      return new Response(
        JSON.stringify({ error: 'Producer ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare update data
    const updateData: any = {
      producer_id: payload.producer_id,
      updated_at: new Date().toISOString()
    }

    // Handle numeric fields
    if (payload.custom_fixed_fee_cents !== undefined) {
      updateData.custom_fixed_fee_cents = parseInt(payload.custom_fixed_fee_cents)
    }
    if (payload.custom_security_reserve_percent !== undefined) {
      updateData.custom_security_reserve_percent = parseFloat(payload.custom_security_reserve_percent)
    }
    if (payload.custom_security_reserve_days !== undefined) {
      updateData.custom_security_reserve_days = parseInt(payload.custom_security_reserve_days)
    }
    if (payload.custom_withdrawal_fee_cents !== undefined) {
      updateData.custom_withdrawal_fee_cents = parseInt(payload.custom_withdrawal_fee_cents)
    }

    // Handle JSON fields
    if (payload.custom_fees_json !== undefined) {
      updateData.custom_fees_json = payload.custom_fees_json
    }
    if (payload.custom_release_rules_json !== undefined) {
      updateData.custom_release_rules_json = payload.custom_release_rules_json
    }

    console.log('Updating producer settings with:', updateData)

    // Upsert producer settings
    const { data: updatedSettings, error: updateError } = await supabase
      .from('producer_settings')
      .upsert(updateData, { onConflict: 'producer_id' })
      .select()
      .single()

    if (updateError) {
      console.error('Error updating producer settings:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update producer settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Producer settings updated successfully')

    return new Response(
      JSON.stringify({ data: updatedSettings, message: 'Producer settings updated successfully' }),
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