
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('[update-payment-gateway] Missing Authorization header')
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('[update-payment-gateway] Invalid token:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      console.error('[update-payment-gateway] User is not admin:', profile?.role)
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body = await req.json()
    const { gateway_id, is_active, priority, credentials, fixed_fee_cents } = body

    if (!gateway_id) {
      return new Response(
        JSON.stringify({ error: 'Gateway ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare update data
    const updateData: any = { updated_at: new Date().toISOString() }
    
    if (typeof is_active === 'boolean') updateData.is_active = is_active
    if (typeof priority === 'number') updateData.priority = priority
    if (credentials && typeof credentials === 'object') updateData.credentials = credentials

    console.log('[update-payment-gateway] Updating gateway:', gateway_id, 'with data:', updateData)

    // Update the gateway
    const { data: updatedGateway, error: updateError } = await supabase
      .from('payment_gateways')
      .update(updateData)
      .eq('id', gateway_id)
      .select()
      .single()

    if (updateError) {
      console.error('[update-payment-gateway] Error updating gateway:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update gateway' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update platform settings if fixed_fee_cents is provided
    if (typeof fixed_fee_cents === 'number') {
      const { error: settingsError } = await supabase
        .from('platform_settings')
        .update({ default_fixed_fee_cents: fixed_fee_cents })
        .eq('id', (await supabase.from('platform_settings').select('id').single()).data?.id)

      if (settingsError) {
        console.error('[update-payment-gateway] Error updating platform settings:', settingsError)
      } else {
        console.log('[update-payment-gateway] Updated platform fixed fee to:', fixed_fee_cents)
      }
    }

    console.log('[update-payment-gateway] Successfully updated gateway:', updatedGateway.gateway_name)

    return new Response(
      JSON.stringify({ gateway: updatedGateway, message: 'Gateway updated successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[update-payment-gateway] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
