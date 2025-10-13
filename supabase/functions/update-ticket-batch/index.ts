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

    const { batch_id, updates } = await req.json();

    if (!batch_id) {
      throw new Error('batch_id é obrigatório');
    }

    // Validar que total_quantity não seja menor que sold_quantity
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
  } catch (error: any) {
    console.error('Error updating ticket batch:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
