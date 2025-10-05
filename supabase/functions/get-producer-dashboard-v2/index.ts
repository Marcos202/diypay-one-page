import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log('🚀 get-producer-dashboard-v2 invoked');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create supabase client with better error handling
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    const authHeader = req.headers.get('Authorization');

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authHeader) {
      console.error('❌ Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    console.log('🔐 Authenticating user...');
    
    // Get authenticated user with improved error handling
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError) {
      console.error('❌ Authentication error:', authError.message);
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed', 
          details: authError.message,
          code: authError.status || 401
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!user) {
      console.error('❌ No user found in session');
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Parse request body with error handling
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      console.error('❌ Invalid JSON in request body:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { date_filter = 'last_30_days', product_id } = requestBody;
    console.log('📋 Request params:', { date_filter, product_id, user_id: user.id });

    // EXECUÇÃO PARALELA DAS QUERIES PRINCIPAIS - PERFORMANCE OTIMIZADA
    const [
      salesResult,
      producerSettingsResult,
      platformSettingsResult,
      productsResult
    ] = await Promise.all([
      // Query 1: Busca todas as vendas relevantes de uma só vez
      supabaseClient
        .from('sales')
        .select(`
          amount_total_cents,
          platform_fee_cents,
          producer_share_cents,
          paid_at,
          release_date,
          status,
          created_at,
          id,
          buyer_email,
          product_id,
          products!inner(id, producer_id, name)
        `)
        .eq('products.producer_id', user.id)
        .in('status', ['paid', 'refunded', 'pending_payment'])
        .not('producer_share_cents', 'is', null),
      
      // Query 2: Configurações do produtor
      supabaseClient
        .from('producer_settings')
        .select('custom_security_reserve_percent')
        .eq('producer_id', user.id)
        .maybeSingle(),
      
      // Query 3: Configurações da plataforma
      supabaseClient
        .from('platform_settings')
        .select('default_security_reserve_percent')
        .maybeSingle(),
      
      // Query 4: Produtos do produtor
      supabaseClient
        .from('products')
        .select('id, name')
        .eq('producer_id', user.id)
    ]);

    // Verificar erros das queries com logging detalhado
    if (salesResult.error) {
      console.error('❌ Error fetching sales:', salesResult.error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch sales data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (productsResult.error) {
      console.error('❌ Error fetching products:', productsResult.error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch products data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allSales = salesResult.data || [];
    const products = productsResult.data || [];
    const producerSettings = producerSettingsResult.data;
    const platformSettings = platformSettingsResult.data;

    console.log('📊 Data fetched successfully:', {
      salesCount: allSales.length,
      productsCount: products.length,
      hasProducerSettings: !!producerSettings,
      hasPlatformSettings: !!platformSettings
    });

    // Se não há produtos, retornar dados vazios
    if (products.length === 0) {
      console.log('ℹ️ No products found, returning empty data');
      return new Response(
        JSON.stringify({
          kpiValorLiquido: 0,
          kpiVendasCount: 0,
          kpiReembolso: 0,
          chartData: [],
          recentTransactions: [],
          saldoDisponivel: 0,
          saldoPendente: 0,
          products: [],
          userName: user.user_metadata?.full_name || user.email
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Filtrar por produto específico se necessário
    let filteredSales = allSales;
    if (product_id && product_id !== 'all') {
      filteredSales = allSales.filter(sale => sale.product_id === product_id);
    }

    // CÁLCULOS DE DATA EM JAVASCRIPT (MAIS RÁPIDO QUE SQL)
    const endDate = new Date();
    let startDate = new Date();
    
    if (date_filter === 'last_7_days') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (date_filter === 'last_30_days') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (date_filter === 'this_year') {
      startDate = new Date(startDate.getFullYear(), 0, 1);
    } else if (date_filter && date_filter.includes('to')) {
      const [start, end] = date_filter.split(' to ');
      startDate = new Date(start);
      endDate.setTime(new Date(end).getTime());
    }
    
    // Separar vendas por status para processamento eficiente
    const paidSales = filteredSales.filter(sale => sale.status === 'paid');
    const refundedSales = filteredSales.filter(sale => sale.status === 'refunded');
    const pendingSales = filteredSales.filter(sale => sale.status === 'pending_payment');

    // Filtrar vendas pagas por período para KPIs
    const paidSalesInPeriod = paidSales.filter(sale => {
      if (!sale.paid_at) return false;
      const saleDate = new Date(sale.paid_at);
      return saleDate >= startDate && saleDate <= endDate;
    });

    // Filtrar reembolsos por período
    const refundedSalesInPeriod = refundedSales.filter(sale => {
      if (!sale.created_at) return false;
      const saleDate = new Date(sale.created_at);
      return saleDate >= startDate && saleDate <= endDate;
    });

    console.log('📈 Sales analysis:', {
      totalSales: filteredSales.length,
      paidInPeriod: paidSalesInPeriod.length,
      refundedInPeriod: refundedSalesInPeriod.length,
      dateRange: { start: startDate.toISOString(), end: endDate.toISOString() }
    });

    // CALCULAR KPIs USANDO PRODUCER_SHARE_CENTS (VALOR LÍQUIDO)
    const kpiValorLiquido = paidSalesInPeriod.reduce((sum, sale) => sum + (sale.producer_share_cents || 0), 0);
    const kpiVendasCount = paidSalesInPeriod.length;
    const kpiReembolso = refundedSalesInPeriod.reduce((sum, sale) => sum + (sale.amount_total_cents || 0), 0);

    // CALCULAR SALDOS (com base em TODAS as vendas pagas, não filtradas por período)
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    let totalLiberado = 0;
    let saldoFuturo = 0;

    paidSales.forEach(sale => {
      if (sale.release_date) {
        const releaseDate = new Date(sale.release_date);
        releaseDate.setHours(0, 0, 0, 0);
        
        if (releaseDate <= hoje) {
          totalLiberado += sale.producer_share_cents || 0;
        } else {
          saldoFuturo += sale.producer_share_cents || 0;
        }
      }
    });

    // CALCULAR RESERVA DE SEGURANÇA
    const percentualReserva = (
      producerSettings?.custom_security_reserve_percent ?? 
      platformSettings?.default_security_reserve_percent ?? 
      5
    ) / 100;

    const reservaDeSeguranca = Math.round(totalLiberado * percentualReserva);
    const saldoDisponivel = Math.max(0, totalLiberado - reservaDeSeguranca);
    const saldoPendente = saldoFuturo + reservaDeSeguranca;

    console.log('💰 Balance calculations:', {
      totalLiberado,
      saldoFuturo,
      reservaDeSeguranca,
      saldoDisponivel,
      saldoPendente,
      percentualReserva: percentualReserva * 100
    });

    // PREPARAR DADOS DO GRÁFICO (Agregação em JavaScript)
    const salesByDate = new Map();
    paidSalesInPeriod.forEach(sale => {
      if (sale.paid_at) {
        const date = new Date(sale.paid_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        const current = salesByDate.get(date) || 0;
        salesByDate.set(date, current + (sale.producer_share_cents || 0));
      }
    });

    const chartData = Array.from(salesByDate.entries())
      .map(([name, total]) => ({
        name,
        total: total / 100 // Convert to BRL
      }))
      .sort((a, b) => {
        // Ordenar por data
        const dateA = new Date(a.name.split('/').reverse().join('/'));
        const dateB = new Date(b.name.split('/').reverse().join('/'));
        return dateA.getTime() - dateB.getTime();
      });

    // TRANSAÇÕES RECENTES (usar dados já carregados)
    const recentTransactions = [...paidSales, ...pendingSales]
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
      .slice(0, 5)
      .map(sale => ({
        id: sale.id,
        buyer_email: sale.buyer_email,
        product_name: (sale.products as any)?.name || 'Produto',
        amount: sale.producer_share_cents || sale.amount_total_cents,
        created_at: sale.created_at || '',
        status: sale.status
      }));

    // RESPOSTA FINAL OTIMIZADA
    const dashboardData = {
      kpiValorLiquido,
      kpiVendasCount,
      kpiReembolso,
      chartData,
      recentTransactions,
      saldoDisponivel,
      saldoPendente,
      products: products.map(p => ({ id: p.id, name: p.name })),
      userName: user.user_metadata?.full_name || user.email
    };

    console.log('✅ Dashboard data prepared successfully:', {
      kpiValorLiquido,
      kpiVendasCount,
      kpiReembolso,
      chartDataPoints: chartData.length,
      recentTransactionsCount: recentTransactions.length,
      saldoDisponivel,
      saldoPendente
    });

    return new Response(
      JSON.stringify(dashboardData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Unexpected error in get-producer-dashboard-v2:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});