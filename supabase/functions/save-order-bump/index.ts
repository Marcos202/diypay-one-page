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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Token de autenticação não fornecido');
    }

    const { product_id, is_active, custom_color, items } = await req.json();

    if (!product_id) {
      throw new Error('product_id é obrigatório');
    }

    console.log('[save-order-bump] Salvando order bump para produto:', product_id);
    console.log('[save-order-bump] Itens:', items?.length || 0);

    // Validar limite de 7 produtos
    if (items && items.length > 7) {
      throw new Error('Máximo de 7 produtos permitidos no order bump');
    }

    // Validar títulos
    for (const item of items || []) {
      if (item.title && item.title.length > 50) {
        throw new Error('Título deve ter no máximo 50 caracteres');
      }
      if (item.discount_percent < 0 || item.discount_percent > 100) {
        throw new Error('Desconto deve estar entre 0 e 100%');
      }
    }

    // Verificar se já existe order bump para este produto
    const { data: existingBump } = await supabase
      .from('order_bumps')
      .select('id')
      .eq('product_id', product_id)
      .maybeSingle();

    let orderBumpId: string;

    if (existingBump) {
      // Atualizar order bump existente
      const { data: updated, error: updateError } = await supabase
        .from('order_bumps')
        .update({
          is_active,
          custom_color: custom_color || '#10b981',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingBump.id)
        .select()
        .single();

      if (updateError) throw updateError;
      orderBumpId = updated.id;

      console.log('[save-order-bump] Order bump atualizado:', orderBumpId);
    } else {
      // Criar novo order bump
      const { data: created, error: createError } = await supabase
        .from('order_bumps')
        .insert({
          product_id,
          is_active,
          custom_color: custom_color || '#10b981',
        })
        .select()
        .single();

      if (createError) throw createError;
      orderBumpId = created.id;

      console.log('[save-order-bump] Order bump criado:', orderBumpId);
    }

    // Remover itens antigos
    const { error: deleteError } = await supabase
      .from('order_bump_items')
      .delete()
      .eq('order_bump_id', orderBumpId);

    if (deleteError) {
      console.error('[save-order-bump] Erro ao deletar itens antigos:', deleteError);
    }

    // Inserir novos itens
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item: any, idx: number) => ({
        order_bump_id: orderBumpId,
        bump_product_id: item.bump_product_id,
        title: item.title,
        description: item.description || '',
        image_url: item.image_url || '',
        discount_percent: item.discount_percent || 0,
        display_order: idx,
      }));

      const { error: insertError } = await supabase
        .from('order_bump_items')
        .insert(itemsToInsert);

      if (insertError) {
        console.error('[save-order-bump] Erro ao inserir itens:', insertError);
        throw insertError;
      }

      console.log('[save-order-bump] Itens inseridos:', itemsToInsert.length);
    }

    return new Response(
      JSON.stringify({ success: true, order_bump_id: orderBumpId }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[save-order-bump] Erro:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
