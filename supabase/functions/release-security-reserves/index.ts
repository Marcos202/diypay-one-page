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

    console.log('Starting release of security reserves...')

    // Find sales with security reserves that can be released
    // We need to check paid_at + security_reserve_days <= NOW()
    const { data: salesToRelease, error: salesError } = await supabase
      .from('sales')
      .select(`
        id,
        security_reserve_cents,
        paid_at,
        product_id,
        products!inner(producer_id)
      `)
      .eq('status', 'paid')
      .not('security_reserve_cents', 'is', null)
      .gt('security_reserve_cents', 0)

    if (salesError) {
      console.error('Error fetching sales:', salesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch sales' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${salesToRelease?.length || 0} sales with security reserves`)

    if (!salesToRelease || salesToRelease.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No security reserves to release',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get platform and producer settings for security reserve days
    const { data: platformSettings } = await supabase
      .from('platform_settings')
      .select('default_security_reserve_days')
      .single()

    const { data: producerSettings } = await supabase
      .from('producer_settings')
      .select('producer_id, custom_security_reserve_days')

    const producerSettingsMap = new Map(
      producerSettings?.map(ps => [ps.producer_id, ps.custom_security_reserve_days]) || []
    )

    const defaultReserveDays = platformSettings?.default_security_reserve_days || 30
    const releasedSales = []

    for (const sale of salesToRelease) {
      const producerId = sale.products.producer_id
      const customReserveDays = producerSettingsMap.get(producerId)
      const reserveDays = customReserveDays !== null ? customReserveDays : defaultReserveDays

      // Calculate release date
      const paidAt = new Date(sale.paid_at)
      const releaseDate = new Date(paidAt.getTime() + (reserveDays * 24 * 60 * 60 * 1000))
      const now = new Date()

      console.log(`Sale ${sale.id}: paid_at=${paidAt.toISOString()}, release_date=${releaseDate.toISOString()}, now=${now.toISOString()}`)

      // Check if release date has passed
      if (now >= releaseDate && sale.security_reserve_cents > 0) {
        console.log(`Releasing ${sale.security_reserve_cents} cents for sale ${sale.id}`)

        // Add the security reserve back to producer's available balance
        const { error: balanceError } = await supabase.rpc('upsert_producer_balance', {
          p_producer_id: producerId,
          amount_to_add: sale.security_reserve_cents
        })

        if (balanceError) {
          console.error(`Error updating balance for producer ${producerId}:`, balanceError)
          continue // Skip this sale and continue with others
        }

        // Update the sale to mark security reserve as released
        const { error: updateError } = await supabase
          .from('sales')
          .update({ security_reserve_cents: 0 })
          .eq('id', sale.id)

        if (updateError) {
          console.error(`Error updating sale ${sale.id}:`, updateError)
          // We already added the money to balance, so we need to revert it
          await supabase.rpc('upsert_producer_balance', {
            p_producer_id: producerId,
            amount_to_add: -sale.security_reserve_cents
          })
          continue
        }

        releasedSales.push({
          sale_id: sale.id,
          producer_id: producerId,
          amount_released: sale.security_reserve_cents
        })
      }
    }

    console.log(`Released security reserves for ${releasedSales.length} sales`)

    return new Response(
      JSON.stringify({
        message: 'Security reserves release completed',
        processed: releasedSales.length,
        released_sales: releasedSales
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