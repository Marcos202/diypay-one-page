
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

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      console.error('Authentication error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Fetching dashboard data for producer:', user.id)

    // Get producer's products
    const { data: products, error: productsError } = await supabaseClient
      .from('products')
      .select('id')
      .eq('producer_id', user.id)

    if (productsError) {
      console.error('Error fetching products:', productsError)
      throw productsError
    }

    const productIds = products?.map(p => p.id) || []
    console.log('Found products:', productIds.length)

    if (productIds.length === 0) {
      // Return empty data if no products
      return new Response(
        JSON.stringify({
          availableBalance: 0,
          pendingBalance: 0,
          waitingPayment: 0,
          uniqueCustomersThisMonth: 0,
          recentTransactions: []
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const today = new Date().toISOString().split('T')[0] // Get today's date in YYYY-MM-DD format

    // Calculate available balance (payout_status = 'pending' AND release_date <= today)
    const { data: availableBalanceData, error: availableError } = await supabaseClient
      .from('sales')
      .select('producer_share_cents')
      .in('product_id', productIds)
      .eq('payout_status', 'pending')
      .lte('release_date', today)
      .not('producer_share_cents', 'is', null)

    if (availableError) {
      console.error('Error calculating available balance:', availableError)
      throw availableError
    }

    const availableBalance = availableBalanceData?.reduce((sum, sale) => sum + (sale.producer_share_cents || 0), 0) || 0

    // Calculate pending balance (payout_status = 'pending' AND release_date > today)
    const { data: pendingBalanceData, error: pendingError } = await supabaseClient
      .from('sales')
      .select('producer_share_cents')
      .in('product_id', productIds)
      .eq('payout_status', 'pending')
      .gt('release_date', today)
      .not('producer_share_cents', 'is', null)

    if (pendingError) {
      console.error('Error calculating pending balance:', pendingError)
      throw pendingError
    }

    const pendingBalance = pendingBalanceData?.reduce((sum, sale) => sum + (sale.producer_share_cents || 0), 0) || 0

    // Calculate waiting payment (status = 'pending_payment')
    const { data: waitingPaymentData, error: waitingError } = await supabaseClient
      .from('sales')
      .select('amount_total_cents')
      .in('product_id', productIds)
      .eq('status', 'pending_payment')

    if (waitingError) {
      console.error('Error calculating waiting payment:', waitingError)
      throw waitingError
    }

    const waitingPayment = waitingPaymentData?.reduce((sum, sale) => sum + (sale.amount_total_cents || 0), 0) || 0

    // Calculate unique customers this month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const { data: salesThisMonth, error: salesError } = await supabaseClient
      .from('sales')
      .select('buyer_email')
      .in('product_id', productIds)
      .eq('status', 'paid')
      .gte('paid_at', startOfMonth.toISOString())

    if (salesError) {
      console.error('Error fetching sales this month:', salesError)
      throw salesError
    }

    const uniqueEmails = new Set(salesThisMonth?.map(sale => sale.buyer_email) || [])
    const uniqueCustomersThisMonth = uniqueEmails.size

    // Get recent transactions (last 3)
    const { data: recentSales, error: recentError } = await supabaseClient
      .from('sales')
      .select(`
        id,
        buyer_email,
        amount_total_cents,
        created_at,
        status,
        products!inner(name)
      `)
      .in('product_id', productIds)
      .order('created_at', { ascending: false })
      .limit(3)

    if (recentError) {
      console.error('Error fetching recent transactions:', recentError)
      throw recentError
    }

    const recentTransactions = recentSales?.map(sale => ({
      id: sale.id,
      buyer_email: sale.buyer_email,
      product_name: (sale.products as any)?.name || 'Produto',
      amount: sale.amount_total_cents,
      created_at: sale.created_at || '',
      status: sale.status
    })) || []

    const dashboardData = {
      availableBalance,
      pendingBalance,
      waitingPayment,
      uniqueCustomersThisMonth,
      recentTransactions
    }

    console.log('Dashboard data calculated:', {
      availableBalance,
      pendingBalance,
      waitingPayment,
      uniqueCustomersThisMonth,
      recentTransactionsCount: recentTransactions.length
    })

    return new Response(
      JSON.stringify(dashboardData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in get-producer-dashboard-data:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
