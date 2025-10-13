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

    const { batch_id } = await req.json();

    if (!batch_id) {
      throw new Error('batch_id é obrigatório');
    }

    // Verificar se o lote tem vendas
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
  } catch (error: any) {
    console.error('Error deleting ticket batch:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
