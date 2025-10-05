// supabase/functions/remove-product-from-space/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const serviceClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = req.headers.get('Authorization')!.replace('Bearer ', '');
    const { data: { user } } = await serviceClient.auth.getUser(token);
    if (!user) throw new Error('Unauthorized');

    const { spaceId, productId } = await req.json();
    if (!spaceId || !productId) {
      throw new Error("spaceId e productId são obrigatórios.");
    }

    // Primeiro, verifique se o usuário é o dono do space
    const { data: spaceOwner, error: ownerError } = await serviceClient
      .from('spaces')
      .select('producer_id')
      .eq('id', spaceId)
      .single();

    if (ownerError || !spaceOwner || spaceOwner.producer_id !== user.id) {
      throw new Error('Você não tem permissão para remover produtos desta Área de Membros.');
    }

    // Agora, delete a linha correspondente em space_products
    // Adicionamos uma condição para NUNCA deletar um produto 'principal' como segurança extra
    const { error } = await serviceClient
      .from('space_products')
      .delete()
      .eq('space_id', spaceId)
      .eq('product_id', productId)
      .neq('product_type', 'principal');

    if (error) throw error;

    return new Response(JSON.stringify({ message: 'Produto removido com sucesso.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})