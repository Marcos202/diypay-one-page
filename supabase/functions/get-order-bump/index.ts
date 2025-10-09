import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { product_id } = await req.json();

    if (!product_id) {
      throw new Error('product_id é obrigatório');
    }

    console.log('[get-order-bump] Buscando order bump para produto:', product_id);

    const { data, error } = await supabase
      .from('order_bumps')
      .select(`
        *,
        order_bump_items (
          id,
          bump_product_id,
          title,
          description,
          image_url,
          discount_percent,
          display_order,
          products:bump_product_id (
            id,
            name,
            price_cents,
            cover_image_url
          )
        )
      `)
      .eq('product_id', product_id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('[get-order-bump] Erro ao buscar:', error);
      throw error;
    }

    console.log('[get-order-bump] Order bump encontrado:', data ? 'Sim' : 'Não');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[get-order-bump] Erro:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
