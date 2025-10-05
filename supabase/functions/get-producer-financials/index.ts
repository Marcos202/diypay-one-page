import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header is required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Set the auth context for the client
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const producerId = user.id;
    console.log('Fetching financials for producer:', producerId);

    // Get producer's products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id')
      .eq('producer_id', producerId);

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch producer products' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!products || products.length === 0) {
      console.log('No products found for producer');
      return new Response(
        JSON.stringify({ 
          data: {
            availableBalance: 0,
            pendingBalance: 0,
            transactions: []
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const productIds = products.map(p => p.id);
    console.log('Found products:', productIds.length);

    // Calculate balances based on sales
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select(`
        id,
        created_at,
        status,
        amount_total_cents,
        platform_fee_cents,
        producer_share_cents,
        release_date,
        product_id,
        buyer_email,
        products!inner(name)
      `)
      .in('product_id', productIds)
      .eq('status', 'paid')
      .order('created_at', { ascending: false });

    if (salesError) {
      console.error('Error fetching sales:', salesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch sales data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate balances
    const today = new Date();
    let availableBalance = 0;
    let pendingBalance = 0;

    sales?.forEach(sale => {
      const releaseDate = sale.release_date ? new Date(sale.release_date) : new Date(sale.created_at);
      
      if (releaseDate <= today) {
        availableBalance += sale.producer_share_cents;
      } else {
        pendingBalance += sale.producer_share_cents;
      }
    });

    // Get last 50 transactions for financial statement
    const transactionsSales = sales?.slice(0, 50).map(sale => ({
      id: sale.id,
      created_at: sale.created_at,
      status: sale.status,
      product_name: sale.products.name,
      amount_total_cents: sale.amount_total_cents,
      platform_fee_cents: sale.platform_fee_cents,
      producer_share_cents: sale.producer_share_cents,
      buyer_email: sale.buyer_email
    })) || [];

    // Get effective settings for this producer
    const { data: producerSettings } = await supabase
      .from('producer_settings')
      .select('*')
      .eq('producer_id', producerId)
      .maybeSingle();

    const { data: platformSettings } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('id', 1)
      .single();

    // Build effective settings (producer custom or platform defaults)
    const effectiveSettings = {
      pix_fee_percent: producerSettings?.custom_fees_json?.pix_fee_percent ?? platformSettings?.default_pix_fee_percent ?? 0,
      boleto_fee_percent: producerSettings?.custom_fees_json?.bank_slip_fee_percent ?? platformSettings?.default_boleto_fee_percent ?? 0,
      card_fee_percent: producerSettings?.custom_fees_json?.card_fee_percent ?? platformSettings?.default_card_fee_percent ?? 0,
      card_installment_interest_rate: producerSettings?.custom_fees_json?.card_installment_interest_rate ?? platformSettings?.card_installment_interest_rate ?? 0,
      card_installments_fees: producerSettings?.custom_fees_json?.credit_card_fees ?? platformSettings?.default_card_installments_fees ?? {},
      fixed_fee_cents: producerSettings?.custom_fixed_fee_cents ?? platformSettings?.default_fixed_fee_cents ?? 100,
      pix_release_days: producerSettings?.custom_release_rules_json?.release_days?.pix ?? platformSettings?.default_pix_release_days ?? 2,
      boleto_release_days: producerSettings?.custom_release_rules_json?.release_days?.bank_slip ?? platformSettings?.default_boleto_release_days ?? 2,
      card_release_days: producerSettings?.custom_release_rules_json?.release_days?.credit_card ?? platformSettings?.default_card_release_days ?? 15,
      security_reserve_percent: producerSettings?.custom_security_reserve_percent ?? platformSettings?.default_security_reserve_percent ?? 0,
      security_reserve_days: producerSettings?.custom_security_reserve_days ?? platformSettings?.default_security_reserve_days ?? 30,
      withdrawal_fee_cents: producerSettings?.custom_withdrawal_fee_cents ?? platformSettings?.default_withdrawal_fee_cents ?? 367,
      is_custom: !!producerSettings
    };

    const result = {
      availableBalance,
      pendingBalance,
      transactions: transactionsSales,
      effectiveSettings
    };

    console.log('Financial data calculated:', {
      availableBalance,
      pendingBalance,
      transactionsCount: transactionsSales.length
    });

    return new Response(
      JSON.stringify({ data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-producer-financials:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});