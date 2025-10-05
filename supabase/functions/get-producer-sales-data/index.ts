import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9'
import { corsHeaders } from '../_shared/cors.ts'

console.log('get-producer-sales-data function starting up')

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Processing request to get-producer-sales-data')

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      console.error('Invalid token:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('User authenticated:', user.id)

    // Parse request body for filters
    const body = await req.json()
    const { 
      search_term, 
      product_id, 
      date_range, 
      payment_method, 
      status,
      page = 1,
      limit = 12
    } = body

    console.log('Filters received:', { search_term, product_id, date_range, payment_method, status, page, limit })

    // First, get producer's products to filter sales
    const { data: producerProducts, error: productsError } = await supabase
      .from('products')
      .select('id')
      .eq('producer_id', user.id)

    if (productsError) {
      console.error('Error fetching producer products:', productsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch producer products' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const productIds = producerProducts.map(p => p.id)
    
    if (productIds.length === 0) {
      console.log('Producer has no products')
      return new Response(
        JSON.stringify({
          kpis: { valorLiquidoTotal: 0, totalVendas: 0 },
          salesHistory: [],
          hasMore: false
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Build the base query for sales
    let salesQuery = supabase
      .from('sales')
      .select(`
        id,
        buyer_email,
        amount_total_cents,
        producer_share_cents,
        platform_fee_cents,
        payment_method_used,
        status,
        created_at,
        paid_at,
        installments_chosen,
        products!inner(
          id,
          name,
          type
        )
      `)
      .in('product_id', productIds)
      .order('created_at', { ascending: false })

    // Apply filters
    if (search_term) {
      salesQuery = salesQuery.ilike('buyer_email', `%${search_term}%`)
    }

    if (product_id && product_id !== 'all') {
      salesQuery = salesQuery.eq('product_id', product_id)
    }

    if (payment_method && payment_method !== 'all') {
      salesQuery = salesQuery.eq('payment_method_used', payment_method)
    }

    if (status && status !== 'all') {
      salesQuery = salesQuery.eq('status', status)
    }

    if (date_range && date_range.from) {
      salesQuery = salesQuery.gte('created_at', date_range.from)
    }

    if (date_range && date_range.to) {
      const toDate = new Date(date_range.to)
      toDate.setHours(23, 59, 59, 999)
      salesQuery = salesQuery.lte('created_at', toDate.toISOString())
    }

    // Get total count for KPIs (without pagination)
    const { count: totalSales, error: countError } = await salesQuery.select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('Error counting sales:', countError)
    }

    // Calculate KPIs - valor líquido total from paid sales only
    const kpiQuery = supabase
      .from('sales')
      .select('producer_share_cents')
      .in('product_id', productIds)
      .eq('status', 'paid')

    // Apply same filters for KPIs
    if (search_term) {
      kpiQuery.ilike('buyer_email', `%${search_term}%`)
    }
    if (product_id && product_id !== 'all') {
      kpiQuery.eq('product_id', product_id)
    }
    if (payment_method && payment_method !== 'all') {
      kpiQuery.eq('payment_method_used', payment_method)
    }
    if (date_range && date_range.from) {
      kpiQuery.gte('created_at', date_range.from)
    }
    if (date_range && date_range.to) {
      const toDate = new Date(date_range.to)
      toDate.setHours(23, 59, 59, 999)
      kpiQuery.lte('created_at', toDate.toISOString())
    }

    const { data: paidSales, error: kpiError } = await kpiQuery

    if (kpiError) {
      console.error('Error calculating KPIs:', kpiError)
    }

    const valorLiquidoTotal = paidSales?.reduce((sum, sale) => sum + (sale.producer_share_cents || 0), 0) || 0

    // Get paginated sales history
    const offset = (page - 1) * limit
    const { data: salesHistory, error: salesError } = await salesQuery
      .range(offset, offset + limit - 1)

    if (salesError) {
      console.error('Error fetching sales history:', salesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch sales history' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const hasMore = (totalSales || 0) > offset + limit

    console.log('Sales data fetched successfully', {
      totalSales: totalSales || 0,
      valorLiquidoTotal,
      salesHistoryCount: salesHistory?.length || 0,
      hasMore
    })

    return new Response(
      JSON.stringify({
        kpis: {
          valorLiquidoTotal,
          totalVendas: totalSales || 0
        },
        salesHistory: salesHistory || [],
        hasMore
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in get-producer-sales-data function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})