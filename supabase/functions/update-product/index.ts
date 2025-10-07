// supabase/functions/update-product/index.ts

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

    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      throw new Error('Token de autorização não fornecido');
    }

    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Usuário não autorizado');
    }

    const { productId, productData } = await req.json();

    if (!productId) {
      throw new Error('productId é obrigatório');
    }

    if (!productData || typeof productData !== 'object') {
      throw new Error('productData é obrigatório e deve ser um objeto');
    }

    const { data: updatedProduct, error } = await serviceClient
      .from('products')
      .update({
        ...productData,
        delivery_type: productData.delivery_type || undefined
      })
      .eq('id', productId)
      .eq('producer_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar produto:', error);
      throw new Error(`Falha ao atualizar o produto: ${error.message}`);
    }

    return new Response(JSON.stringify(updatedProduct), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
