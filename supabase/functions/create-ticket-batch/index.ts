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

    const batchData = await req.json();

    // Validar campos obrigatórios
    if (!batchData.product_id || !batchData.name || !batchData.total_quantity || batchData.price_cents === undefined) {
      throw new Error('Campos obrigatórios: product_id, name, total_quantity, price_cents');
    }

    // Buscar o próximo display_order
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
  } catch (error: any) {
    console.error('Error creating ticket batch:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
