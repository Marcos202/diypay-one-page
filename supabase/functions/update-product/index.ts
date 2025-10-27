// supabase/functions/update-product/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // <<< CORREÇÃO CRÍTICA: Lógica de CORS >>>
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error('Token de autorização não fornecido');

    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !user) throw new Error('Usuário não autorizado');

    const { productId, productData, use_batches, batches } = await req.json();

    if (!productId) throw new Error('productId é obrigatório');
    if (!productData || typeof productData !== 'object') {
      throw new Error('productData é obrigatório e deve ser um objeto');
    }

    const { data: updatedProduct, error } = await serviceClient
      .from('products')
      .update({
        ...productData,
        delivery_type: productData.delivery_type || undefined,
        use_batches: use_batches ?? productData.use_batches ?? false,
        // Suporte para campos de evento
        event_date: productData.event_date !== undefined ? productData.event_date : undefined,
        event_address: productData.event_address !== undefined ? productData.event_address : undefined,
        event_description: productData.event_description !== undefined ? productData.event_description : undefined,
      })
      .eq('id', productId)
      .eq('producer_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar produto:', error);
      throw new Error(`Falha ao atualizar o produto: ${error.message}`);
    }

    if (use_batches && Array.isArray(batches)) {
      try {
        const { error: deleteError } = await serviceClient
          .from('ticket_batches')
          .delete()
          .eq('product_id', productId);
        if (deleteError) throw new Error(`Falha ao deletar lotes antigos: ${deleteError.message}`);
        
        if (batches.length > 0) {
          const batchesToInsert = batches.map((batch, index) => ({
            product_id: productId,
            name: batch.name,
            total_quantity: batch.total_quantity,
            price_cents: batch.price_cents,
            auto_advance_to_next: batch.auto_advance_to_next ?? false,
            min_quantity_per_purchase: batch.min_quantity_per_purchase || 1,
            max_quantity_per_purchase: batch.max_quantity_per_purchase || null,
            sale_end_date: batch.sale_end_date || null,
            display_order: index,
            sold_quantity: batch.sold_quantity || 0,
            is_active: batch.is_active ?? true
          }));
          
          const { error: insertError } = await serviceClient
            .from('ticket_batches')
            .insert(batchesToInsert);
          if (insertError) throw new Error(`Falha ao inserir lotes: ${insertError.message}`);
          
          console.log(`✅ ${batchesToInsert.length} lote(s) sincronizado(s) com sucesso`);
        } else {
          console.log('✅ Lotes removidos (array vazio recebido)');
        }
      } catch (batchError) {
        console.error('Erro no processamento de lotes:', batchError);
        throw batchError;
      }
    }

    // <<< CORREÇÃO: Adicionados cabeçalhos CORS na resposta >>>
    return new Response(JSON.stringify(updatedProduct), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    // <<< CORREÇÃO: Adicionados cabeçalhos CORS na resposta de erro >>>
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
