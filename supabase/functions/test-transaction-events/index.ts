import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('[TEST_EVENTS] Iniciando teste do sistema de eventos de transação...');

    // Criar uma venda de teste
    const testSaleData = {
      product_id: '00000000-0000-0000-0000-000000000001', // UUID fake para teste
      buyer_email: 'teste@exemplo.com',
      gateway_transaction_id: `test_${Date.now()}`,
      gateway_identifier: 'test_gateway',
      gateway_status: 'pending',
      amount_total_cents: 5000,
      payment_method_used: 'pix',
      installments_chosen: 1,
      status: 'pending_payment',
      platform_fee_cents: 0,
      producer_share_cents: 0,
    };

    console.log('[TEST_EVENTS] Inserindo venda de teste...');
    const { data: testSale, error: saleError } = await supabase
      .from('sales')
      .insert([testSaleData])
      .select()
      .single();

    if (saleError) {
      console.error('[TEST_EVENTS] Erro ao criar venda de teste:', saleError);
      throw new Error(`Falha ao criar venda de teste: ${saleError.message}`);
    }

    console.log(`[TEST_EVENTS] Venda de teste criada com ID: ${testSale.id}`);

    // Testar inserção de evento PIX.GERADO
    console.log('[TEST_EVENTS] Testando inserção de evento pix.gerado...');
    const pixEventData = {
      sale_id: testSale.id,
      event_type: 'pix.gerado',
      metadata: {
        gateway_name: 'Test Gateway',
        gateway_transaction_id: testSaleData.gateway_transaction_id,
        payment_method: 'pix',
        amount_cents: 5000,
        test_event: true,
        created_at_test: new Date().toISOString()
      }
    };

    const { data: pixEvent, error: pixEventError } = await supabase
      .from('transaction_events')
      .insert(pixEventData)
      .select()
      .single();

    if (pixEventError) {
      console.error('[TEST_EVENTS] ERRO ao inserir evento PIX:', pixEventError);
      throw new Error(`Falha ao inserir evento PIX: ${pixEventError.message}`);
    }

    console.log(`[TEST_EVENTS] ✅ Evento PIX inserido com sucesso! ID: ${pixEvent.id}`);

    // Testar inserção de evento COMPRA.APROVADA
    console.log('[TEST_EVENTS] Testando inserção de evento compra.aprovada...');
    const approvedEventData = {
      sale_id: testSale.id,
      event_type: 'compra.aprovada',
      metadata: {
        gateway_name: 'Test Gateway',
        gateway_transaction_id: testSaleData.gateway_transaction_id,
        payment_method: 'pix',
        amount_cents: 5000,
        test_event: true,
        approved_at_test: new Date().toISOString()
      }
    };

    const { data: approvedEvent, error: approvedEventError } = await supabase
      .from('transaction_events')
      .insert(approvedEventData)
      .select()
      .single();

    if (approvedEventError) {
      console.error('[TEST_EVENTS] ERRO ao inserir evento APROVADA:', approvedEventError);
      throw new Error(`Falha ao inserir evento APROVADA: ${approvedEventError.message}`);
    }

    console.log(`[TEST_EVENTS] ✅ Evento APROVADA inserido com sucesso! ID: ${approvedEvent.id}`);

    // Limpeza: remover dados de teste
    console.log('[TEST_EVENTS] Limpando dados de teste...');
    await supabase.from('transaction_events').delete().eq('sale_id', testSale.id);
    await supabase.from('sales').delete().eq('id', testSale.id);

    console.log('[TEST_EVENTS] ✅ Teste concluído com SUCESSO! Sistema de eventos funcionando corretamente.');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sistema de eventos de transação funcionando corretamente!',
        test_results: {
          sale_created: true,
          pix_event_created: true,
          approved_event_created: true,
          cleanup_completed: true
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[TEST_EVENTS] Erro no teste:', error.message);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: 'Falha no teste do sistema de eventos de transação'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});