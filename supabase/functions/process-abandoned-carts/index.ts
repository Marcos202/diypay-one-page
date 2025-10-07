import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('[ABANDONED_CARTS] Iniciando processamento de carrinhos abandonados...');

    // Define o limite de tempo para considerar um carrinho abandonado (24 horas)
    const abandonmentThreshold = new Date();
    abandonmentThreshold.setHours(abandonmentThreshold.getHours() - 24);

    console.log(`[ABANDONED_CARTS] Buscando vendas pendentes antes de: ${abandonmentThreshold.toISOString()}`);

    // Busca vendas pendentes que são mais antigas que o nosso limite de tempo
    const { data: pendingSales, error: salesError } = await serviceClient
      .from('sales')
      .select('id')
      .eq('status', 'pending_payment')
      .lt('created_at', abandonmentThreshold.toISOString());

    if (salesError) {
      console.error('[ABANDONED_CARTS_ERROR] Erro ao buscar vendas pendentes:', salesError);
      throw salesError;
    }

    if (!pendingSales || pendingSales.length === 0) {
      console.log('[ABANDONED_CARTS] Nenhum carrinho abandonado encontrado.');
      return new Response(JSON.stringify({ 
        success: true,
        message: "Nenhum carrinho abandonado encontrado.",
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200
      });
    }

    console.log(`[ABANDONED_CARTS] Encontradas ${pendingSales.length} vendas abandonadas`);

    // Prepara os eventos para inserção em lote
    const eventsToInsert = pendingSales.map(sale => ({
      sale_id: sale.id,
      event_type: 'carrinho.abandonado',
      metadata: {
        processed_at: new Date().toISOString(),
        threshold_hours: 24
      }
    }));

    // Insere os eventos de carrinho abandonado em lote
    const { error: insertError } = await serviceClient
      .from('transaction_events')
      .insert(eventsToInsert);

    if (insertError) {
      console.error('[ABANDONED_CARTS_ERROR] Erro ao inserir eventos:', insertError);
      throw insertError;
    }

    console.log(`[ABANDONED_CARTS] ${eventsToInsert.length} eventos de carrinho abandonado registrados`);
    
    // Atualiza o status da venda para 'abandoned' para não ser processada novamente
    const saleIdsToUpdate = pendingSales.map(s => s.id);
    const { error: updateError } = await serviceClient
      .from('sales')
      .update({ status: 'abandoned' })
      .in('id', saleIdsToUpdate);

    if (updateError) {
      console.error('[ABANDONED_CARTS_ERROR] Erro ao atualizar status das vendas:', updateError);
      throw updateError;
    }

    console.log(`[ABANDONED_CARTS] ${saleIdsToUpdate.length} vendas marcadas como abandonadas`);

    return new Response(JSON.stringify({ 
      success: true,
      message: `${pendingSales.length} evento(s) de carrinho abandonado foram registrados.`,
      processed: pendingSales.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 200
    });

  } catch (error: any) {
    console.error('[ABANDONED_CARTS_CRITICAL_ERROR] Erro crítico no processamento:', error.message);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 500
    });
  }
});