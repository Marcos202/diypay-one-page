import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
    );

    switch (req.method) {
      case 'GET': {
        const url = new URL(req.url);
        const product_id = url.searchParams.get('product_id');

        if (!product_id) {
          throw new Error('product_id é obrigatório');
        }

        const { data: batches, error } = await supabaseClient
          .from('ticket_batches')
          .select('*')
          .eq('product_id', product_id)
          .order('display_order', { ascending: true });

        if (error) throw error;

        return new Response(
          JSON.stringify({ batches }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      case 'POST': {
        const batchData = await req.json();

        if (!batchData.product_id || !batchData.name || !batchData.total_quantity || batchData.price_cents === undefined) {
          throw new Error('Campos obrigatórios: product_id, name, total_quantity, price_cents');
        }

        const { data: existingBatches } = await supabaseClient
          .from('ticket_batches')
          .select('display_order')
          .eq('product_id', batchData.product_id)
          .order('display_order', { ascending: false })
          .limit(1);

        const nextOrder = existingBatches && existingBatches.length > 0 
          ? existingBatches[0].display_order + 1 
          : 0;

        const { data: batch, error } = await supabaseClient
          .from('ticket_batches')
          .insert({
            ...batchData,
            display_order: nextOrder,
            sold_quantity: 0,
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ batch }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      case 'PUT': {
        const { batch_id, updates } = await req.json();

        if (!batch_id) {
          throw new Error('batch_id é obrigatório');
        }

        if (updates.total_quantity !== undefined) {
          const { data: currentBatch } = await supabaseClient
            .from('ticket_batches')
            .select('sold_quantity')
            .eq('id', batch_id)
            .single();

          if (currentBatch && updates.total_quantity < currentBatch.sold_quantity) {
            throw new Error('A quantidade total não pode ser menor que a quantidade já vendida');
          }
        }

        const { data: batch, error } = await supabaseClient
          .from('ticket_batches')
          .update(updates)
          .eq('id', batch_id)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ batch }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      case 'DELETE': {
        const { batch_id } = await req.json();

        if (!batch_id) {
          throw new Error('batch_id é obrigatório');
        }

        const { data: batch } = await supabaseClient
          .from('ticket_batches')
          .select('sold_quantity')
          .eq('id', batch_id)
          .single();

        if (batch && batch.sold_quantity > 0) {
          throw new Error('Não é possível excluir um lote que já possui vendas');
        }

        const { error } = await supabaseClient
          .from('ticket_batches')
          .delete()
          .eq('id', batch_id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Método não permitido' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    console.error('Error in ticket-batches-handler:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
